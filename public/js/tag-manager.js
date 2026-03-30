/**
 * Tag Manager UI
 * Handles custom tag creation and management in item forms
 */

class TagManager {
  constructor(options = {}) {
    this.containerSelector = options.containerSelector || '#tag-container';
    this.inputSelector = options.inputSelector || '#tag-input';
    this.addButtonSelector = options.addButtonSelector || '#tag-add-btn';
    this.tagsListSelector = options.tagsListSelector || '.tags-list';
    this.hiddenInputSelector = options.hiddenInputSelector || 'input[name="tags"]';

    this.container = document.querySelector(this.containerSelector);
    this.input = document.querySelector(this.inputSelector);
    this.addButton = document.querySelector(this.addButtonSelector);
    this.tagsList = document.querySelector(this.tagsListSelector);
    this.hiddenInput = document.querySelector(this.hiddenInputSelector);

    this.selectedTags = []; // Array of { tag_id, tag_name, is_custom }
    this.availableTags = [];
    this.suggestionsElement = null;

    this.init();
  }

  init() {
    console.log('[TagManager] Initializing...');

    if (!this.container) {
      console.error('[TagManager] Container not found:', this.containerSelector);
      return;
    }

    // Load available tags
    this.loadAvailableTags();

    // Setup event listeners
    this.setupEventListeners();

    // If editing, load existing tags
    this.loadExistingTags();

    console.log('[TagManager] ✓ Initialized');
  }

  setupEventListeners() {
    // Add button click
    if (this.addButton) {
      this.addButton.addEventListener('click', () => this.handleAddTag());
    }

    // Input enter key
    if (this.input) {
      this.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleAddTag();
        }
      });

      // Show suggestions on input
      this.input.addEventListener('input', (e) => {
        this.showSuggestions(e.target.value);
      });

      // Hide suggestions on blur
      this.input.addEventListener('blur', () => {
        setTimeout(() => this.hideSuggestions(), 200);
      });
    }
  }

  async loadAvailableTags() {
    try {
      console.log('[TagManager] Loading available tags...');
      const response = await fetch('/api/tags/user');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      this.availableTags = data.data || [];
      console.log('[TagManager] ✓ Loaded', this.availableTags.length, 'tags');
    } catch (error) {
      console.error('[TagManager] Error loading tags:', error);
    }
  }

  loadExistingTags() {
    // Check if we're editing and have existing tags
    const existingTagsJson = document.querySelector('[data-existing-tags]');
    if (existingTagsJson) {
      try {
        const tags = JSON.parse(existingTagsJson.dataset.existingTags);
        tags.forEach(tag => {
          this.selectedTags.push(tag);
          this.renderTagBadge(tag);
        });
        this.updateHiddenInput();
        console.log('[TagManager] Loaded', tags.length, 'existing tags');
      } catch (error) {
        console.error('[TagManager] Error loading existing tags:', error);
      }
    }
  }

  showSuggestions(searchTerm) {
    if (!searchTerm || searchTerm.trim().length === 0) {
      this.hideSuggestions();
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = this.availableTags.filter(tag =>
      tag.tag_name.toLowerCase().includes(term) &&
      !this.selectedTags.find(st => st.tag_id === tag.tag_id)
    );

    if (filtered.length === 0 && searchTerm.trim().length > 0) {
      // Show option to create new tag
      this.showCreateNewSuggestion(searchTerm);
      return;
    }

    // Create suggestions container
    if (!this.suggestionsElement) {
      this.suggestionsElement = document.createElement('div');
      this.suggestionsElement.className = 'tag-suggestions';
      this.input.parentElement.appendChild(this.suggestionsElement);
    }

    this.suggestionsElement.innerHTML = '';

    filtered.forEach(tag => {
      const suggestion = document.createElement('div');
      suggestion.className = 'tag-suggestion';
      suggestion.innerHTML = `
        <span class="tag-name">${this.escapeHtml(tag.tag_name)}</span>
        <span class="tag-type ${tag.is_custom ? 'custom' : 'global'}">
          ${tag.is_custom ? '👤 Personal' : '🌐 Global'}
        </span>
      `;
      suggestion.addEventListener('click', () => this.addTag(tag));
      this.suggestionsElement.appendChild(suggestion);
    });

    if (filtered.length > 0) {
      this.suggestionsElement.style.display = 'block';
    }
  }

  showCreateNewSuggestion(tagName) {
    if (!this.suggestionsElement) {
      this.suggestionsElement = document.createElement('div');
      this.suggestionsElement.className = 'tag-suggestions';
      this.input.parentElement.appendChild(this.suggestionsElement);
    }

    this.suggestionsElement.innerHTML = '';
    const createNew = document.createElement('div');
    createNew.className = 'tag-suggestion create-new';
    createNew.innerHTML = `
      <span class="tag-name">+ Buat tag baru: "${this.escapeHtml(tagName)}"</span>
      <span class="tag-type custom">👤 Personal</span>
    `;
    createNew.addEventListener('click', () => this.createAndAddTag(tagName));
    this.suggestionsElement.appendChild(createNew);
    this.suggestionsElement.style.display = 'block';
  }

  hideSuggestions() {
    if (this.suggestionsElement) {
      this.suggestionsElement.style.display = 'none';
    }
  }

  async handleAddTag() {
    const tagName = this.input.value.trim();
    if (!tagName || tagName.length === 0) {
      console.warn('[TagManager] Empty tag name');
      return;
    }

    // Check if tag already selected
    if (this.selectedTags.find(t => t.tag_name.toLowerCase() === tagName.toLowerCase())) {
      console.warn('[TagManager] Tag already selected');
      this.input.value = '';
      return;
    }

    // Try to find existing tag
    const existingTag = this.availableTags.find(t =>
      t.tag_name.toLowerCase() === tagName.toLowerCase()
    );

    if (existingTag) {
      this.addTag(existingTag);
    } else {
      // Create new custom tag
      await this.createAndAddTag(tagName);
    }

    this.input.value = '';
    this.hideSuggestions();
  }

  addTag(tag) {
    // Check if already added
    if (this.selectedTags.find(t => t.tag_id === tag.tag_id)) {
      console.warn('[TagManager] Tag already selected');
      return;
    }

    this.selectedTags.push(tag);
    this.renderTagBadge(tag);
    this.updateHiddenInput();
    this.hideSuggestions();

    console.log('[TagManager] Tag added:', tag.tag_name);
  }

  async createAndAddTag(tagName) {
    try {
      console.log('[TagManager] Creating new tag:', tagName);

      const response = await fetch('/api/tags/get-or-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tag_name: tagName })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[TagManager] Error creating tag:', error);
        alert(`Error: ${error.message || 'Failed to create tag'}`);
        return;
      }

      const data = await response.json();
      const newTag = data.data;

      // Add to available tags if not exists
      if (!this.availableTags.find(t => t.tag_id === newTag.tag_id)) {
        this.availableTags.push(newTag);
      }

      // Add to selected tags
      this.addTag(newTag);
      console.log('[TagManager] ✓ New tag created and added:', newTag.tag_name);
    } catch (error) {
      console.error('[TagManager] Error in createAndAddTag:', error);
      alert('Failed to create tag');
    }
  }

  removeTag(tagId) {
    this.selectedTags = this.selectedTags.filter(t => t.tag_id !== tagId);
    this.renderTags();
    this.updateHiddenInput();
    console.log('[TagManager] Tag removed:', tagId);
  }

  renderTagBadge(tag) {
    const badge = document.createElement('span');
    badge.className = `tag-badge ${tag.is_custom ? 'custom' : 'global'}`;
    badge.innerHTML = `
      <span class="tag-text">${this.escapeHtml(tag.tag_name)}</span>
      <span class="tag-remove" data-tag-id="${tag.tag_id}">×</span>
    `;

    // Add remove handler
    badge.querySelector('.tag-remove').addEventListener('click', () => {
      this.removeTag(tag.tag_id);
    });

    if (this.tagsList) {
      this.tagsList.appendChild(badge);
    }
  }

  renderTags() {
    if (this.tagsList) {
      this.tagsList.innerHTML = '';
      this.selectedTags.forEach(tag => this.renderTagBadge(tag));
    }
  }

  updateHiddenInput() {
    if (this.hiddenInput) {
      this.hiddenInput.value = JSON.stringify(
        this.selectedTags.map(t => t.tag_id)
      );
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getSelectedTags() {
    return this.selectedTags;
  }

  getSelectedTagIds() {
    return this.selectedTags.map(t => t.tag_id);
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TagManager;
}
