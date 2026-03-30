# Project Context: Barter App

## Stack
- Backend: Fastify (JavaScript)
- Database: PostgreSQL
- ORM/Query: [tulis disini, misal: pg, postgres.js, knex, dll]

## Alur Barter (PENTING)
Status transaksi harus mengikuti urutan ini secara ketat:

1. `PENDING` → offer dibuat, kedua item di-lock (`items.locked_by_transaction_id`)
2. `ACCEPTED` → owner setuju, meetup_location & meetup_scheduled_at diisi
3. `IN_TRANSIT` → requester tandai sudah serah-terima, `marked_sent_at` diisi, `receipt_confirm_deadline` = NOW() + 7 hari
4. `AWAITING_RECEIPT_BY_OWNER` → menunggu owner konfirmasi fisik (`owner_confirmed_at`)
5. `AWAITING_RECEIPT_BY_REQUESTER` → menunggu requester konfirmasi (`requester_confirmed_at`)
6. `BOTH_CONFIRMED` → sistem set `review_window_expires_at` = NOW() + 7 hari
7. `COMPLETED_AWAITING_REVIEW` → kedua pihak bisa insert review
8. `COMPLETED` → setelah kedua review masuk atau window habis
9. `DISPUTE` → bisa dibuka dari fase IN_TRANSIT ke AWAITING_RECEIPT_BY_REQUESTER, review diblokir
10. `EXPIRED` / `CANCELLED` → item di-unlock (locked_by_transaction_id = NULL)

## Aturan Kritis di Database
- Item lock: saat PENDING/ACCEPTED, set `items.locked_by_transaction_id` dan `items.locked_at`
- Item unlock: saat EXPIRED/CANCELLED/COMPLETED, set keduanya ke NULL
- Review hanya bisa diinsert saat status `COMPLETED_AWAITING_REVIEW` atau `COMPLETED`
- Review diblokir jika ada dispute aktif (`barter_disputes.status IN ('OPEN', 'UNDER_REVIEW')`)
- Trigger `enforce_item_lock` mencegah item masuk dua transaksi sekaligus
- Trigger `enforce_review_window` memblokir review di luar fase yang benar

## Tabel Utama & Kegunaannya

| Tabel | Kegunaan |
|---|---|
| `users` | Akun pengguna |
| `user_profiles` | Profil, rating, kota |
| `items` | Barang/jasa yang ditawarkan |
| `barter_transactions` | Transaksi barter antar user |
| `barter_statuses` | Master status (13 status) |
| `barter_disputes` | Dispute yang dibuka user/admin |
| `barter_messages` | Chat dalam transaksi |
| `reviews` | Rating setelah transaksi selesai |
| `transaction_history` | Audit log perubahan status |
| `notifications` | Notifikasi ke user |
| `item_images` | Foto item |
| `item_tags` / `tags` | Tag pada item |
| `categories` | Kategori item (bisa nested) |
| `wishlists` | Wishlist user |
| `recommendations` | Rekomendasi item |

## Kolom Penting di `barter_transactions`
```