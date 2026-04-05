-- ============================================================
-- MIGRATION: 000_initial_schema.sql
-- Deskripsi: Skema awal database aplikasi Barterin
-- ============================================================

-- =========================
-- EKSTENSI
-- =========================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =========================
-- FUNCTIONS (dibuat sebelum tabel/trigger yang membutuhkannya)
-- =========================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.items_search_vector_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('indonesian', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('indonesian', COALESCE(NEW.description, '')), 'B');
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_tag_usage_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags SET usage_count = usage_count + 1 WHERE tag_id = NEW.tag_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags SET usage_count = usage_count - 1 WHERE tag_id = OLD.tag_id;
    END IF;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_rating()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE user_profiles
    SET
        rating_average = (
            SELECT COALESCE(AVG(rating), 0)
            FROM reviews
            WHERE reviewed_user_id = NEW.reviewed_user_id
        ),
        total_ratings = (
            SELECT COUNT(*)
            FROM reviews
            WHERE reviewed_user_id = NEW.reviewed_user_id
        )
    WHERE user_id = NEW.reviewed_user_id;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_item_lock()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_requester_locked uuid;
    v_owner_locked uuid;
BEGIN
    SELECT locked_by_transaction_id INTO v_requester_locked
    FROM items WHERE item_id = NEW.requester_item_id;

    IF v_requester_locked IS NOT NULL AND v_requester_locked <> NEW.transaction_id THEN
        RAISE EXCEPTION 'Item requester sedang terkunci oleh transaksi lain: %', v_requester_locked;
    END IF;

    SELECT locked_by_transaction_id INTO v_owner_locked
    FROM items WHERE item_id = NEW.owner_item_id;

    IF v_owner_locked IS NOT NULL AND v_owner_locked <> NEW.transaction_id THEN
        RAISE EXCEPTION 'Item owner sedang terkunci oleh transaksi lain: %', v_owner_locked;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_review_window()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_window_expires timestamptz;
    v_status_name    varchar;
    v_dispute_exists boolean;
BEGIN
    SELECT bt.review_window_expires_at, bs.status_name
    INTO v_window_expires, v_status_name
    FROM barter_transactions bt
    JOIN barter_statuses bs ON bt.status_id = bs.status_id
    WHERE bt.transaction_id = NEW.transaction_id;

    IF v_status_name NOT IN ('COMPLETED_AWAITING_REVIEW', 'COMPLETED') THEN
        RAISE EXCEPTION 'Review hanya bisa diberikan setelah transaksi selesai. Status saat ini: %', v_status_name;
    END IF;

    IF v_window_expires IS NOT NULL AND CURRENT_TIMESTAMP > v_window_expires THEN
        RAISE EXCEPTION 'Jendela review sudah ditutup sejak %', v_window_expires;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM barter_disputes
        WHERE transaction_id = NEW.transaction_id
        AND status IN ('OPEN', 'UNDER_REVIEW')
    ) INTO v_dispute_exists;

    IF v_dispute_exists THEN
        RAISE EXCEPTION 'Review diblokir karena ada dispute aktif pada transaksi ini';
    END IF;

    RETURN NEW;
END;
$$;

-- =========================
-- TABEL LOOKUP / REFERENSI (tidak punya FK ke tabel lain)
-- =========================

CREATE TABLE public.barter_statuses (
    status_id   uuid DEFAULT uuid_generate_v4() NOT NULL,
    status_name varchar(50) NOT NULL,
    description text NULL,
    CONSTRAINT barter_statuses_pkey PRIMARY KEY (status_id),
    CONSTRAINT barter_statuses_status_name_key UNIQUE (status_name),
    CONSTRAINT valid_status CHECK (status_name = ANY (ARRAY[
        'PENDING','ACCEPTED','REJECTED','NEGOTIATING','IN_TRANSIT',
        'AWAITING_RECEIPT_BY_OWNER','AWAITING_RECEIPT_BY_REQUESTER',
        'BOTH_CONFIRMED','COMPLETED_AWAITING_REVIEW','COMPLETED',
        'DISPUTE','CANCELLED','EXPIRED'
    ]))
);

CREATE TABLE public.item_conditions (
    condition_id   uuid DEFAULT uuid_generate_v4() NOT NULL,
    condition_name varchar(50) NOT NULL,
    description    text NULL,
    CONSTRAINT item_conditions_condition_name_key UNIQUE (condition_name),
    CONSTRAINT item_conditions_pkey PRIMARY KEY (condition_id),
    CONSTRAINT valid_condition CHECK (condition_name = ANY (ARRAY[
        'BARU','BEKAS_SEPERTI_BARU','BEKAS_BAIK','BEKAS_CUKUP'
    ]::varchar[]))
);

CREATE TABLE public.item_types (
    type_id     uuid DEFAULT uuid_generate_v4() NOT NULL,
    type_name   varchar(50) NOT NULL,
    description text NULL,
    CONSTRAINT item_types_pkey PRIMARY KEY (type_id),
    CONSTRAINT item_types_type_name_key UNIQUE (type_name),
    CONSTRAINT valid_type_name CHECK (type_name = ANY (ARRAY['BARANG','JASA']::varchar[]))
);

CREATE TABLE public.notification_types (
    type_id     uuid DEFAULT uuid_generate_v4() NOT NULL,
    type_name   varchar(50) NOT NULL,
    description text NULL,
    CONSTRAINT notification_types_pkey PRIMARY KEY (type_id),
    CONSTRAINT notification_types_type_name_key UNIQUE (type_name),
    CONSTRAINT valid_notification_type CHECK (type_name = ANY (ARRAY[
        'BARTER_REQUEST','BARTER_ACCEPTED','BARTER_REJECTED',
        'NEW_MESSAGE','REVIEW_RECEIVED','ITEM_MATCHED','SYSTEM'
    ]::varchar[]))
);

CREATE TABLE public.report_types (
    type_id     uuid DEFAULT uuid_generate_v4() NOT NULL,
    type_name   varchar(50) NOT NULL,
    description text NULL,
    CONSTRAINT report_types_pkey PRIMARY KEY (type_id),
    CONSTRAINT report_types_type_name_key UNIQUE (type_name),
    CONSTRAINT valid_report_type CHECK (type_name = ANY (ARRAY[
        'INAPPROPRIATE_CONTENT','FRAUD','SPAM','HARASSMENT','OTHER'
    ]::varchar[]))
);

CREATE TABLE public.skill_levels (
    level_id    uuid DEFAULT uuid_generate_v4() NOT NULL,
    level_code  varchar(50) NOT NULL,
    level_name  varchar(100) NOT NULL,
    description text NULL,
    sort_order  int4 DEFAULT 0 NULL,
    CONSTRAINT skill_levels_level_code_key UNIQUE (level_code),
    CONSTRAINT skill_levels_pkey PRIMARY KEY (level_id)
);

CREATE TABLE public.schema_migrations (
    id          serial4 NOT NULL,
    name        varchar(255) NOT NULL,
    executed_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT schema_migrations_name_key UNIQUE (name),
    CONSTRAINT schema_migrations_pkey PRIMARY KEY (id)
);

-- =========================
-- TABEL USERS
-- =========================

CREATE TABLE public.users (
    user_id                    uuid DEFAULT uuid_generate_v4() NOT NULL,
    email                      varchar(255) NOT NULL,
    password_hash              varchar(255) NOT NULL,
    full_name                  varchar(255) NOT NULL,
    phone_number               varchar(20) NULL,
    created_at                 timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    updated_at                 timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    is_active                  bool DEFAULT true NULL,
    email_verified             bool DEFAULT false NULL,
    last_login                 timestamptz NULL,
    verification_token         varchar(255) NULL,
    verification_token_expires timestamptz NULL,
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT phone_format CHECK (phone_number ~* '^\+?[0-9]{10,15}$' OR phone_number IS NULL),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_pkey PRIMARY KEY (user_id)
);

CREATE INDEX idx_users_email      ON public.users USING btree (email);
CREATE INDEX idx_users_is_active  ON public.users USING btree (is_active);
CREATE INDEX idx_users_created_at ON public.users USING btree (created_at);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================
-- TABEL BERGANTUNG PADA USERS
-- =========================

CREATE TABLE public.categories (
    category_id        uuid DEFAULT uuid_generate_v4() NOT NULL,
    category_name      varchar(100) NOT NULL,
    category_slug      varchar(100) NOT NULL,
    description        text NULL,
    icon_url           text NULL,
    parent_category_id uuid NULL,
    is_active          bool DEFAULT true NULL,
    created_at         timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT categories_category_name_key UNIQUE (category_name),
    CONSTRAINT categories_category_slug_key UNIQUE (category_slug),
    CONSTRAINT categories_pkey PRIMARY KEY (category_id),
    CONSTRAINT no_self_reference CHECK (category_id <> parent_category_id),
    CONSTRAINT categories_parent_category_id_fkey FOREIGN KEY (parent_category_id)
        REFERENCES public.categories(category_id) ON DELETE SET NULL
);

CREATE TABLE public.email_verification_tokens (
    token_id   uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id    uuid NOT NULL,
    token      varchar(255) NOT NULL,
    expires_at timestamptz NOT NULL,
    verified   bool DEFAULT false NULL,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (token_id),
    CONSTRAINT email_verification_tokens_token_key UNIQUE (token),
    CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_verification_token   ON public.email_verification_tokens USING btree (token);
CREATE INDEX idx_verification_user_id ON public.email_verification_tokens USING btree (user_id);

CREATE TABLE public.password_reset_tokens (
    token_id   uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id    uuid NOT NULL,
    token      varchar(255) NOT NULL,
    expires_at timestamptz NOT NULL,
    used       bool DEFAULT false NULL,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (token_id),
    CONSTRAINT password_reset_tokens_token_key UNIQUE (token),
    CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE
);

CREATE TABLE public.notifications (
    notification_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id         uuid NOT NULL,
    type_id         uuid NOT NULL,
    title           varchar(255) NOT NULL,
    message         text NOT NULL,
    is_read         bool DEFAULT false NULL,
    reference_id    uuid NULL,
    reference_type  varchar(50) NULL,
    created_at      timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT notifications_pkey PRIMARY KEY (notification_id),
    CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE,
    CONSTRAINT notifications_type_id_fkey FOREIGN KEY (type_id)
        REFERENCES public.notification_types(type_id) ON DELETE RESTRICT
);

CREATE INDEX idx_notifications_user_id    ON public.notifications USING btree (user_id);
CREATE INDEX idx_notifications_is_read    ON public.notifications USING btree (is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);

CREATE TABLE public.tags (
    tag_id      uuid DEFAULT uuid_generate_v4() NOT NULL,
    tag_name    varchar(50) NOT NULL,
    tag_slug    varchar(50) NOT NULL,
    usage_count int4 DEFAULT 0 NULL,
    created_at  timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    user_id     uuid NULL,
    is_custom   bool DEFAULT false NULL,
    CONSTRAINT positive_usage CHECK (usage_count >= 0),
    CONSTRAINT tags_pkey PRIMARY KEY (tag_id),
    CONSTRAINT tags_tag_slug_key UNIQUE (tag_slug),
    CONSTRAINT tags_unique_per_user UNIQUE (tag_name, user_id, is_custom),
    CONSTRAINT tags_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_tags_user_id       ON public.tags USING btree (user_id);
CREATE INDEX idx_tags_custom_by_user ON public.tags USING btree (user_id, is_custom) WHERE is_custom = true;

CREATE TABLE public.user_profiles (
    profile_id               uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id                  uuid NOT NULL,
    avatar_url               text NULL,
    bio                      text NULL,
    address                  text NULL,
    city                     varchar(100) NULL,
    province                 varchar(100) NULL,
    postal_code              varchar(10) NULL,
    rating_average           numeric(3,2) DEFAULT 0.00 NULL,
    total_ratings            int4 DEFAULT 0 NULL,
    total_successful_barters int4 DEFAULT 0 NULL,
    cover_url                text NULL,
    CONSTRAINT rating_range          CHECK (rating_average >= 0 AND rating_average <= 5),
    CONSTRAINT total_barters_positive CHECK (total_successful_barters >= 0),
    CONSTRAINT total_ratings_positive CHECK (total_ratings >= 0),
    CONSTRAINT user_profiles_pkey    PRIMARY KEY (profile_id),
    CONSTRAINT user_profiles_user_id_key UNIQUE (user_id),
    CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE
);

CREATE TABLE public.user_interests (
    interest_id    uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id        uuid NOT NULL,
    category_id    uuid NOT NULL,
    interest_score numeric(5,2) DEFAULT 0.00 NULL,
    last_updated   timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT score_range CHECK (interest_score >= 0 AND interest_score <= 100),
    CONSTRAINT user_interests_pkey PRIMARY KEY (interest_id),
    CONSTRAINT user_interests_user_id_category_id_key UNIQUE (user_id, category_id),
    CONSTRAINT user_interests_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE,
    CONSTRAINT user_interests_category_id_fkey FOREIGN KEY (category_id)
        REFERENCES public.categories(category_id) ON DELETE CASCADE
);

CREATE TABLE public.user_search_history (
    history_id  uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id     uuid NOT NULL,
    keyword     text NOT NULL,
    searched_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT user_search_history_pkey PRIMARY KEY (history_id),
    CONSTRAINT user_search_history_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_search_history_user_time ON public.user_search_history USING btree (user_id, searched_at DESC);

-- =========================
-- TABEL ITEMS
-- =========================

CREATE TABLE public.items (
    item_id                 uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id                 uuid NOT NULL,
    category_id             uuid NOT NULL,
    type_id                 uuid NOT NULL,
    condition_id            uuid NULL,
    title                   varchar(255) NOT NULL,
    description             text NOT NULL,
    estimated_value         numeric(15,2) NULL,
    is_available            bool DEFAULT true NULL,
    view_count              int4 DEFAULT 0 NULL,
    created_at              timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    updated_at              timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    search_vector           tsvector NULL,
    skill_level_id          uuid NULL,
    locked_by_transaction_id uuid NULL,
    locked_at               timestamptz NULL,
    CONSTRAINT items_pkey        PRIMARY KEY (item_id),
    CONSTRAINT positive_value    CHECK (estimated_value > 0 OR estimated_value IS NULL),
    CONSTRAINT positive_views    CHECK (view_count >= 0),
    CONSTRAINT items_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE,
    CONSTRAINT items_category_id_fkey FOREIGN KEY (category_id)
        REFERENCES public.categories(category_id) ON DELETE RESTRICT,
    CONSTRAINT items_type_id_fkey FOREIGN KEY (type_id)
        REFERENCES public.item_types(type_id) ON DELETE RESTRICT,
    CONSTRAINT items_condition_id_fkey FOREIGN KEY (condition_id)
        REFERENCES public.item_conditions(condition_id) ON DELETE SET NULL,
    CONSTRAINT items_skill_level_id_fkey FOREIGN KEY (skill_level_id)
        REFERENCES public.skill_levels(level_id) ON DELETE SET NULL
    -- FK items_locked_by_transaction_id_fkey ditambahkan setelah barter_transactions dibuat
);

CREATE INDEX idx_items_user_id       ON public.items USING btree (user_id);
CREATE INDEX idx_items_category_id   ON public.items USING btree (category_id);
CREATE INDEX idx_items_type_id       ON public.items USING btree (type_id);
CREATE INDEX idx_items_is_available  ON public.items USING btree (is_available);
CREATE INDEX idx_items_created_at    ON public.items USING btree (created_at DESC);
CREATE INDEX idx_items_search_vector ON public.items USING gin (search_vector);
CREATE INDEX idx_items_title_trgm    ON public.items USING gin (title gin_trgm_ops);
CREATE INDEX idx_items_description_trgm ON public.items USING gin (description gin_trgm_ops);
CREATE INDEX idx_items_fulltext ON public.items USING gin (
    to_tsvector('english', (COALESCE(title,'')::text || ' ' || COALESCE(description,'')))
);

CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON public.items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER items_search_vector_trigger
    BEFORE INSERT OR UPDATE ON public.items
    FOR EACH ROW EXECUTE FUNCTION items_search_vector_update();

-- =========================
-- TABEL BARTER TRANSACTIONS
-- =========================

CREATE TABLE public.barter_transactions (
    transaction_id           uuid DEFAULT uuid_generate_v4() NOT NULL,
    requester_id             uuid NOT NULL,
    owner_id                 uuid NOT NULL,
    requester_item_id        uuid NOT NULL,
    owner_item_id            uuid NOT NULL,
    status_id                uuid NOT NULL,
    notes                    text NULL,
    created_at               timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    updated_at               timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    expires_at               timestamptz NULL,
    completed_at             timestamptz NULL,
    meetup_location          text NULL,
    meetup_scheduled_at      timestamptz NULL,
    marked_sent_at           timestamptz NULL,
    marked_sent_by           uuid NULL,
    owner_confirmed_at       timestamptz NULL,
    requester_confirmed_at   timestamptz NULL,
    receipt_confirm_deadline timestamptz NULL,
    review_window_expires_at timestamptz NULL,
    CONSTRAINT barter_transactions_pkey PRIMARY KEY (transaction_id),
    CONSTRAINT different_items CHECK (requester_item_id <> owner_item_id),
    CONSTRAINT different_users CHECK (requester_id <> owner_id),
    CONSTRAINT barter_transactions_requester_id_fkey FOREIGN KEY (requester_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE,
    CONSTRAINT barter_transactions_owner_id_fkey FOREIGN KEY (owner_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE,
    CONSTRAINT barter_transactions_requester_item_id_fkey FOREIGN KEY (requester_item_id)
        REFERENCES public.items(item_id) ON DELETE CASCADE,
    CONSTRAINT barter_transactions_owner_item_id_fkey FOREIGN KEY (owner_item_id)
        REFERENCES public.items(item_id) ON DELETE CASCADE,
    CONSTRAINT barter_transactions_status_id_fkey FOREIGN KEY (status_id)
        REFERENCES public.barter_statuses(status_id) ON DELETE RESTRICT,
    CONSTRAINT barter_transactions_marked_sent_by_fkey FOREIGN KEY (marked_sent_by)
        REFERENCES public.users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_barter_transactions_requester   ON public.barter_transactions USING btree (requester_id);
CREATE INDEX idx_barter_transactions_owner       ON public.barter_transactions USING btree (owner_id);
CREATE INDEX idx_barter_transactions_status      ON public.barter_transactions USING btree (status_id);
CREATE INDEX idx_barter_transactions_created_at  ON public.barter_transactions USING btree (created_at DESC);

CREATE TRIGGER update_barter_transactions_updated_at
    BEFORE UPDATE ON public.barter_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER enforce_item_lock
    BEFORE INSERT ON public.barter_transactions
    FOR EACH ROW EXECUTE FUNCTION check_item_lock();

-- Tambahkan FK items -> barter_transactions yang tadi tertunda
ALTER TABLE public.items
    ADD CONSTRAINT items_locked_by_transaction_id_fkey FOREIGN KEY (locked_by_transaction_id)
    REFERENCES public.barter_transactions(transaction_id) ON DELETE SET NULL;

-- =========================
-- TABEL BERGANTUNG PADA ITEMS / BARTER_TRANSACTIONS
-- =========================

CREATE TABLE public.item_images (
    image_id      uuid DEFAULT uuid_generate_v4() NOT NULL,
    item_id       uuid NOT NULL,
    image_url     text NOT NULL,
    is_primary    bool DEFAULT false NULL,
    display_order int4 DEFAULT 0 NULL,
    uploaded_at   timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT item_images_pkey  PRIMARY KEY (image_id),
    CONSTRAINT positive_order    CHECK (display_order >= 0),
    CONSTRAINT item_images_item_id_fkey FOREIGN KEY (item_id)
        REFERENCES public.items(item_id) ON DELETE CASCADE
);

CREATE TABLE public.item_tags (
    item_id    uuid NOT NULL,
    tag_id     uuid NOT NULL,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT item_tags_pkey PRIMARY KEY (item_id, tag_id),
    CONSTRAINT item_tags_item_id_fkey FOREIGN KEY (item_id)
        REFERENCES public.items(item_id) ON DELETE CASCADE,
    CONSTRAINT item_tags_tag_id_fkey FOREIGN KEY (tag_id)
        REFERENCES public.tags(tag_id) ON DELETE CASCADE
);

CREATE TRIGGER update_tag_usage_trigger
    AFTER INSERT OR DELETE ON public.item_tags
    FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

CREATE TABLE public.item_views (
    view_id    uuid DEFAULT uuid_generate_v4() NOT NULL,
    item_id    uuid NOT NULL,
    user_id    uuid NULL,
    viewed_at  timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT item_views_item_id_user_id_key UNIQUE (item_id, user_id),
    CONSTRAINT item_views_pkey PRIMARY KEY (view_id),
    CONSTRAINT item_views_item_id_fkey FOREIGN KEY (item_id)
        REFERENCES public.items(item_id) ON DELETE CASCADE,
    CONSTRAINT item_views_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_item_views_item_user ON public.item_views USING btree (item_id, user_id);
CREATE INDEX idx_item_views_user      ON public.item_views USING btree (user_id);

CREATE TABLE public.barter_messages (
    message_id   uuid DEFAULT uuid_generate_v4() NOT NULL,
    transaction_id uuid NOT NULL,
    sender_id    uuid NOT NULL,
    message_text text NOT NULL,
    is_read      bool DEFAULT false NULL,
    created_at   timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT barter_messages_pkey PRIMARY KEY (message_id),
    CONSTRAINT barter_messages_transaction_id_fkey FOREIGN KEY (transaction_id)
        REFERENCES public.barter_transactions(transaction_id) ON DELETE CASCADE,
    CONSTRAINT barter_messages_sender_id_fkey FOREIGN KEY (sender_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE
);

CREATE TABLE public.barter_disputes (
    dispute_id     uuid DEFAULT uuid_generate_v4() NOT NULL,
    transaction_id uuid NOT NULL,
    opened_by      uuid NOT NULL,
    reason         text NOT NULL,
    evidence_urls  jsonb NULL,
    status         varchar(30) DEFAULT 'OPEN' NOT NULL,
    admin_id       uuid NULL,
    admin_notes    text NULL,
    resolved_at    timestamptz NULL,
    created_at     timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    updated_at     timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT barter_disputes_pkey PRIMARY KEY (dispute_id),
    CONSTRAINT valid_dispute_status CHECK (status = ANY (ARRAY['OPEN','UNDER_REVIEW','RESOLVED','CLOSED'])),
    CONSTRAINT barter_disputes_transaction_id_fkey FOREIGN KEY (transaction_id)
        REFERENCES public.barter_transactions(transaction_id) ON DELETE CASCADE,
    CONSTRAINT barter_disputes_opened_by_fkey FOREIGN KEY (opened_by)
        REFERENCES public.users(user_id) ON DELETE CASCADE,
    CONSTRAINT barter_disputes_admin_id_fkey FOREIGN KEY (admin_id)
        REFERENCES public.users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_barter_disputes_transaction_id ON public.barter_disputes USING btree (transaction_id);
CREATE INDEX idx_barter_disputes_opened_by      ON public.barter_disputes USING btree (opened_by);
CREATE INDEX idx_barter_disputes_status         ON public.barter_disputes USING btree (status);

CREATE TRIGGER update_barter_disputes_updated_at
    BEFORE UPDATE ON public.barter_disputes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.reviews (
    review_id        uuid DEFAULT uuid_generate_v4() NOT NULL,
    transaction_id   uuid NOT NULL,
    reviewer_id      uuid NOT NULL,
    reviewed_user_id uuid NOT NULL,
    rating           int4 NOT NULL,
    review_text      text NULL,
    created_at       timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    updated_at       timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT different_review_users CHECK (reviewer_id <> reviewed_user_id),
    CONSTRAINT rating_range CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT reviews_pkey PRIMARY KEY (review_id),
    CONSTRAINT reviews_transaction_reviewer_unique UNIQUE (transaction_id, reviewer_id),
    CONSTRAINT reviews_transaction_id_fkey FOREIGN KEY (transaction_id)
        REFERENCES public.barter_transactions(transaction_id) ON DELETE CASCADE,
    CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE,
    CONSTRAINT reviews_reviewed_user_id_fkey FOREIGN KEY (reviewed_user_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE
);

CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_rating_trigger
    AFTER INSERT OR UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION update_user_rating();

CREATE TRIGGER enforce_review_window
    BEFORE INSERT ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION check_review_window();

CREATE TABLE public.transaction_history (
    history_id     uuid DEFAULT uuid_generate_v4() NOT NULL,
    transaction_id uuid NOT NULL,
    status_id      uuid NOT NULL,
    changed_by     uuid NOT NULL,
    notes          text NULL,
    created_at     timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT transaction_history_pkey PRIMARY KEY (history_id),
    CONSTRAINT transaction_history_transaction_id_fkey FOREIGN KEY (transaction_id)
        REFERENCES public.barter_transactions(transaction_id) ON DELETE CASCADE,
    CONSTRAINT transaction_history_status_id_fkey FOREIGN KEY (status_id)
        REFERENCES public.barter_statuses(status_id) ON DELETE RESTRICT,
    CONSTRAINT transaction_history_changed_by_fkey FOREIGN KEY (changed_by)
        REFERENCES public.users(user_id) ON DELETE CASCADE
);

CREATE TABLE public.user_deleted_conversations (
    deletion_id    uuid DEFAULT uuid_generate_v4() NOT NULL,
    transaction_id uuid NOT NULL,
    user_id        uuid NOT NULL,
    deleted_at     timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT user_deleted_conversations_pkey PRIMARY KEY (deletion_id),
    CONSTRAINT user_deleted_conversations_unique UNIQUE (transaction_id, user_id),
    CONSTRAINT user_deleted_conversations_transaction_fkey FOREIGN KEY (transaction_id)
        REFERENCES public.barter_transactions(transaction_id) ON DELETE CASCADE,
    CONSTRAINT user_deleted_conversations_user_fkey FOREIGN KEY (user_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_deleted_conversations_transaction_id ON public.user_deleted_conversations USING btree (transaction_id);
CREATE INDEX idx_user_deleted_conversations_user_id        ON public.user_deleted_conversations USING btree (user_id);

CREATE TABLE public.recommendations (
    recommendation_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id           uuid NOT NULL,
    item_id           uuid NOT NULL,
    score             numeric(5,2) NOT NULL,
    reason            text NULL,
    is_viewed         bool DEFAULT false NULL,
    created_at        timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    expires_at        timestamptz NULL,
    CONSTRAINT recommendations_pkey PRIMARY KEY (recommendation_id),
    CONSTRAINT score_range CHECK (score >= 0 AND score <= 100),
    CONSTRAINT recommendations_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE,
    CONSTRAINT recommendations_item_id_fkey FOREIGN KEY (item_id)
        REFERENCES public.items(item_id) ON DELETE CASCADE
);

CREATE INDEX idx_recommendations_user_id   ON public.recommendations USING btree (user_id);
CREATE INDEX idx_recommendations_score     ON public.recommendations USING btree (score DESC);
CREATE INDEX idx_recommendations_created_at ON public.recommendations USING btree (created_at DESC);

CREATE TABLE public.reports (
    report_id        uuid DEFAULT uuid_generate_v4() NOT NULL,
    reporter_id      uuid NOT NULL,
    reported_user_id uuid NULL,
    reported_item_id uuid NULL,
    type_id          uuid NOT NULL,
    description      text NOT NULL,
    status           varchar(20) DEFAULT 'PENDING' NULL,
    resolved_at      timestamptz NULL,
    resolved_by      uuid NULL,
    created_at       timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT report_target CHECK (reported_user_id IS NOT NULL OR reported_item_id IS NOT NULL),
    CONSTRAINT reports_pkey PRIMARY KEY (report_id),
    CONSTRAINT valid_report_status CHECK (status = ANY (ARRAY['PENDING','REVIEWING','RESOLVED','DISMISSED']::varchar[])),
    CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE,
    CONSTRAINT reports_reported_user_id_fkey FOREIGN KEY (reported_user_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE,
    CONSTRAINT reports_reported_item_id_fkey FOREIGN KEY (reported_item_id)
        REFERENCES public.items(item_id) ON DELETE CASCADE,
    CONSTRAINT reports_type_id_fkey FOREIGN KEY (type_id)
        REFERENCES public.report_types(type_id) ON DELETE RESTRICT,
    CONSTRAINT reports_resolved_by_fkey FOREIGN KEY (resolved_by)
        REFERENCES public.users(user_id) ON DELETE SET NULL
);

CREATE TABLE public.wishlists (
    wishlist_id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id     uuid NOT NULL,
    item_id     uuid NOT NULL,
    notes       text NULL,
    created_at  timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT wishlists_pkey PRIMARY KEY (wishlist_id),
    CONSTRAINT wishlists_user_id_item_id_key UNIQUE (user_id, item_id),
    CONSTRAINT wishlists_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE,
    CONSTRAINT wishlists_item_id_fkey FOREIGN KEY (item_id)
        REFERENCES public.items(item_id) ON DELETE CASCADE
);

CREATE INDEX idx_wishlists_user_id ON public.wishlists USING btree (user_id);
CREATE INDEX idx_wishlists_item_id ON public.wishlists USING btree (item_id);

-- =========================
-- VIEWS
-- =========================

CREATE OR REPLACE VIEW public.user_tags_view AS
    SELECT tag_id, tag_name, tag_slug, usage_count, user_id, is_custom, created_at, 'custom'::text AS tag_type
    FROM tags WHERE is_custom = true
    UNION ALL
    SELECT tag_id, tag_name, tag_slug, usage_count, user_id, is_custom, created_at, 'global'::text AS tag_type
    FROM tags WHERE is_custom = false AND user_id IS NULL
    ORDER BY tag_name;

CREATE OR REPLACE VIEW public.v_items_detail AS
    SELECT
        i.item_id, i.title, i.description, i.estimated_value, i.is_available,
        i.view_count, i.created_at, i.updated_at,
        u.user_id, u.full_name AS owner_name, u.email AS owner_email,
        up.rating_average AS owner_rating,
        c.category_name, c.category_slug,
        it.type_name AS item_type,
        ic.condition_name AS item_condition,
        (SELECT json_agg(json_build_object('image_url', ii.image_url, 'is_primary', ii.is_primary))
         FROM item_images ii WHERE ii.item_id = i.item_id) AS images,
        (SELECT json_agg(t.tag_name)
         FROM item_tags it2 JOIN tags t ON it2.tag_id = t.tag_id
         WHERE it2.item_id = i.item_id) AS tags
    FROM items i
    JOIN users u ON i.user_id = u.user_id
    JOIN user_profiles up ON u.user_id = up.user_id
    JOIN categories c ON i.category_id = c.category_id
    JOIN item_types it ON i.type_id = it.type_id
    LEFT JOIN item_conditions ic ON i.condition_id = ic.condition_id;

CREATE OR REPLACE VIEW public.v_transactions_detail AS
    SELECT
        bt.transaction_id, bt.created_at, bt.updated_at, bt.notes,
        bs.status_name,
        u1.full_name AS requester_name, u1.email AS requester_email,
        u2.full_name AS owner_name, u2.email AS owner_email,
        i1.title AS requester_item_title,
        i2.title AS owner_item_title,
        (SELECT COUNT(*) FROM barter_messages bm WHERE bm.transaction_id = bt.transaction_id) AS message_count
    FROM barter_transactions bt
    JOIN users u1 ON bt.requester_id = u1.user_id
    JOIN users u2 ON bt.owner_id = u2.user_id
    JOIN items i1 ON bt.requester_item_id = i1.item_id
    JOIN items i2 ON bt.owner_item_id = i2.item_id
    JOIN barter_statuses bs ON bt.status_id = bs.status_id;

-- =========================
-- CATAT MIGRATION INI
-- =========================
INSERT INTO public.schema_migrations (name) VALUES ('000_initial_schema');
