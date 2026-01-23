import { AbacusElement } from './base.js';

/**
 * Sort dropdown with "Show Archived" toggle for board-level filtering
 *
 * Events emitted:
 * - sort-change: { sortKey: string }
 * - archived-toggle: { show: boolean }
 */
class AbacusSortDropdown extends AbacusElement {
  static get observedAttributes() {
    return ['value', 'project-id', 'show-archived'];
  }

  constructor() {
    super();
    this._value = 'priority';
    this._showArchived = false;
    this._projectId = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'value') {
      this._value = newVal || 'priority';
    } else if (name === 'project-id') {
      this._projectId = newVal;
      this._loadPreferences();
    } else if (name === 'show-archived') {
      this._showArchived = newVal !== null && newVal !== 'false';
    }
    if (this.shadowRoot) this.render();
  }

  connectedCallback() {
    this._value = this.getAttribute('value') || 'priority';
    this._projectId = this.getAttribute('project-id');
    this._showArchived = this.hasAttribute('show-archived') &&
                         this.getAttribute('show-archived') !== 'false';
    this._loadPreferences();
    super.connectedCallback();
    this._attachEventListeners();
  }

  _loadPreferences() {
    if (!this._projectId) return;

    try {
      const savedSort = localStorage.getItem(`abacus-sort-${this._projectId}`);
      if (savedSort) {
        this._value = savedSort;
      }

      const savedArchived = localStorage.getItem(`abacus-show-archived-${this._projectId}`);
      if (savedArchived !== null) {
        this._showArchived = savedArchived === 'true';
      }
    } catch (e) {
      console.warn('Failed to load sort preferences from localStorage:', e);
    }
  }

  _savePreferences() {
    if (!this._projectId) return;

    try {
      localStorage.setItem(`abacus-sort-${this._projectId}`, this._value);
      localStorage.setItem(`abacus-show-archived-${this._projectId}`, String(this._showArchived));
    } catch (e) {
      console.warn('Failed to save sort preferences to localStorage:', e);
    }
  }

  _attachEventListeners() {
    const select = this.shadowRoot.querySelector('select');
    const checkbox = this.shadowRoot.querySelector('input[type="checkbox"]');

    if (select) {
      select.addEventListener('change', (e) => {
        this._value = e.target.value;
        this._savePreferences();
        this.emit('sort-change', { sortKey: this._value });
      });
    }

    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        this._showArchived = e.target.checked;
        this._savePreferences();
        this.emit('archived-toggle', { show: this._showArchived });
      });
    }
  }

  get sortKey() {
    return this._value;
  }

  get showArchived() {
    return this._showArchived;
  }

  render() {
    const sortOptions = [
      { value: 'priority', label: 'Priority' },
      { value: 'newest', label: 'Newest First' },
      { value: 'oldest', label: 'Oldest First' },
      { value: 'updated', label: 'Recently Updated' },
      { value: 'type', label: 'Type' },
      { value: 'label', label: 'Label' }
    ];

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          align-items: center;
          gap: var(--spacing-md, 1rem);
          padding: var(--spacing-sm, 0.5rem) 0;
          font-size: 0.875rem;
        }

        .sort-control {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs, 0.25rem);
        }

        label {
          color: var(--color-text-secondary, #666);
          font-weight: 500;
        }

        select {
          padding: 0.375rem 0.75rem;
          padding-right: 1.75rem;
          border: 1px solid var(--color-border, #e0e0e0);
          border-radius: var(--radius-sm, 4px);
          background-color: var(--color-bg-primary, #fff);
          color: var(--color-text-primary, #333);
          font-size: 0.8125rem;
          font-family: inherit;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M3 4.5L6 7.5L9 4.5'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.5rem center;
        }

        select:hover {
          border-color: var(--color-border-hover, #ccc);
        }

        select:focus {
          outline: none;
          border-color: var(--color-accent, #4f8fe8);
          box-shadow: 0 0 0 2px var(--color-accent-light, rgba(79, 143, 232, 0.2));
        }

        .archived-toggle {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs, 0.25rem);
          cursor: pointer;
          user-select: none;
        }

        .archived-toggle input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          cursor: pointer;
          accent-color: var(--color-accent, #4f8fe8);
        }

        .archived-toggle span {
          color: var(--color-text-secondary, #666);
          font-size: 0.8125rem;
        }

        .divider {
          width: 1px;
          height: 1.25rem;
          background-color: var(--color-border, #e0e0e0);
        }
      </style>

      <div class="sort-control">
        <label for="sort-select">Sort:</label>
        <select id="sort-select">
          ${sortOptions.map(opt => `
            <option value="${opt.value}" ${this._value === opt.value ? 'selected' : ''}>
              ${opt.label}
            </option>
          `).join('')}
        </select>
      </div>

      <div class="divider"></div>

      <label class="archived-toggle">
        <input type="checkbox" ${this._showArchived ? 'checked' : ''}>
        <span>Show Archived</span>
      </label>
    `;

    this._attachEventListeners();
  }
}

customElements.define('abacus-sort-dropdown', AbacusSortDropdown);
