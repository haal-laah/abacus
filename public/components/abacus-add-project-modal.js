import { AbacusModal } from './abacus-modal.js';
import './abacus-folder-browser.js';

class AbacusAddProjectModal extends AbacusModal {
  static get observedAttributes() {
    return [...AbacusModal.observedAttributes];
  }

  constructor() {
    super();
    this._errorMessage = '';
    this._showBrowser = false;
  }

  renderHeader() {
    return this._showBrowser ? 'Browse for Project' : 'Add Project';
  }
  
  // Override to make modal larger when browser is shown
  connectedCallback() {
    super.connectedCallback();
    this._updateSize();
  }
  
  _updateSize() {
    if (this._showBrowser) {
      this.setAttribute('size', 'large');
    } else {
      this.removeAttribute('size');
    }
  }

  renderBody() {
    const isLoading = this.hasAttribute('loading');
    
    if (this._showBrowser) {
      return `
        <abacus-folder-browser id="folder-browser"></abacus-folder-browser>
        <style>
          abacus-folder-browser { margin-bottom: var(--spacing-md); }
        </style>
      `;
    }
    
    return `
      <form id="add-project-form">
        <div class="form-group">
          <label for="project-path">Project Path</label>
          <div class="input-with-button">
            <input type="text" id="project-path" name="path" 
              placeholder="/path/to/your/project" 
              ${isLoading ? 'disabled' : ''}>
            <button type="button" class="browse-btn" ${isLoading ? 'disabled' : ''}>Browse</button>
          </div>
          <small class="form-help">
            Enter the path to a directory containing a <code>.beads</code> folder, or click Browse to navigate.
          </small>
        </div>
        <div class="form-error ${this._errorMessage ? '' : 'hidden'}">${this._errorMessage}</div>
      </form>
      <style>
        .form-group { margin-bottom: var(--spacing-lg); }
        .form-group label { display: block; font-weight: 500; margin-bottom: var(--spacing-sm); color: var(--color-text-primary); }
        .input-with-button {
          display: flex;
          gap: var(--spacing-sm);
        }
        .form-group input[type="text"] {
          flex: 1;
          padding: var(--spacing-sm) var(--spacing-md);
          font-size: 1rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background-color: var(--color-bg-primary);
          color: var(--color-text-primary);
        }
        .form-group input:focus { outline: none; border-color: var(--color-accent); }
        .form-group input:disabled { opacity: 0.6; cursor: not-allowed; }
        .browse-btn {
          padding: var(--spacing-sm) var(--spacing-md);
          font-size: 0.875rem;
          font-weight: 500;
          background-color: var(--color-bg-tertiary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          white-space: nowrap;
          transition: background-color var(--transition-fast);
        }
        .browse-btn:hover:not(:disabled) { background-color: var(--color-bg-secondary); }
        .browse-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .form-help { display: block; margin-top: var(--spacing-xs); color: var(--color-text-muted); font-size: 0.8125rem; }
        .form-help code { background-color: var(--color-bg-tertiary); padding: 0.125rem 0.25rem; border-radius: var(--radius-sm); font-family: monospace; font-size: 0.75rem; }
        .form-error { background-color: rgba(220, 53, 69, 0.1); color: var(--color-danger); padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-md); margin-bottom: var(--spacing-md); font-size: 0.875rem; }
        .form-error.hidden { display: none; }
      </style>
    `;
  }

  renderFooter() {
    const isLoading = this.hasAttribute('loading');
    
    // When browser is shown, hide the footer (browser has its own buttons)
    if (this._showBrowser) {
      return '';
    }
    
    return `
      <style>
        .form-actions { display: flex; justify-content: flex-end; gap: var(--spacing-sm); }
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--spacing-sm); padding: var(--spacing-sm) var(--spacing-md); font-size: 0.875rem; font-weight: 500; border-radius: var(--radius-md); border: none; cursor: pointer; transition: all var(--transition-fast); }
        .btn-primary { background-color: var(--color-accent); color: var(--color-on-accent); }
        .btn-primary:hover:not(:disabled) { background-color: var(--color-accent-hover); }
        .btn-secondary { background-color: var(--color-bg-tertiary); color: var(--color-text-primary); }
        .btn-secondary:hover:not(:disabled) { background-color: var(--color-border); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spinner { width: 14px; height: 14px; border: 2px solid var(--color-border); border-top-color: var(--color-on-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary cancel-btn" ${isLoading ? 'disabled' : ''}>Cancel</button>
        <button type="submit" form="add-project-form" class="btn btn-primary submit-btn" ${isLoading ? 'disabled' : ''}>
          ${isLoading ? '<span class="spinner"></span> Adding...' : 'Add Project'}
        </button>
      </div>
    `;
  }

  showError(message) {
    this._errorMessage = message;
    const errorEl = this.shadowRoot.querySelector('.form-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }

  _clearError() {
    this._errorMessage = '';
    const errorEl = this.shadowRoot.querySelector('.form-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    }
  }

  _attachEventListeners() {
    super._attachEventListeners();
    
    if (this._showBrowser) {
      // Folder browser events
      const browser = this.shadowRoot.querySelector('#folder-browser');
      browser?.addEventListener('folder-selected', (e) => {
        const path = e.detail.path;
        this._showBrowser = false;
        this._updateSize();
        this.render();
        // Set the path in the input after re-render
        requestAnimationFrame(() => {
          const input = this.shadowRoot.querySelector('#project-path');
          if (input) {
            input.value = path;
            // Automatically submit since user selected a valid beads project
            this.emit('modal-submit', { path });
          }
        });
      });
      
      browser?.addEventListener('folder-cancel', () => {
        this._showBrowser = false;
        this._updateSize();
        this.render();
      });
    } else {
      // Form mode events
      const form = this.shadowRoot.querySelector('#add-project-form');
      const cancelBtn = this.shadowRoot.querySelector('.cancel-btn');
      const input = this.shadowRoot.querySelector('#project-path');
      const browseBtn = this.shadowRoot.querySelector('.browse-btn');
      
      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const path = input?.value?.trim();
        if (!path) {
          this.showError('Please enter a project path');
          return;
        }
        this.emit('modal-submit', { path });
      });
      
      cancelBtn?.addEventListener('click', () => this._handleClose('cancel'));
      input?.addEventListener('input', () => this._clearError());
      
      browseBtn?.addEventListener('click', () => {
        this._showBrowser = true;
        this._updateSize();
        this.render();
      });
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'open' && newVal !== null) {
      this._clearError();
      this._showBrowser = false;
      // Clear input on open
      requestAnimationFrame(() => {
        const input = this.shadowRoot?.querySelector('#project-path');
        if (input) input.value = '';
      });
    }
    super.attributeChangedCallback(name, oldVal, newVal);
  }
}

customElements.define('abacus-add-project-modal', AbacusAddProjectModal);
