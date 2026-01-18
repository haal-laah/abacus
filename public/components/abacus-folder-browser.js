import { AbacusElement } from './base.js';

/**
 * AbacusFolderBrowser - A folder/directory browser component
 * 
 * Allows users to navigate the filesystem via server API and select a folder.
 * Highlights folders containing .beads directories.
 * 
 * Events emitted:
 * - folder-selected: { path: string } - When user selects a folder
 * - folder-cancel: {} - When user cancels browsing
 */
class AbacusFolderBrowser extends AbacusElement {
  static get observedAttributes() {
    return ['open', 'initial-path'];
  }

  constructor() {
    super();
    this._currentPath = '';
    this._directories = [];
    this._parentPath = null;
    this._isBeadsProject = false;
    this._loading = false;
    this._error = null;
  }

  connectedCallback() {
    super.connectedCallback();
    // Start with home directory or initial path
    const initialPath = this.getAttribute('initial-path') || '';
    this._browse(initialPath);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'open' && newVal !== null) {
      // Refresh when opened
      this._browse(this._currentPath || '');
    }
    if (name === 'initial-path' && newVal && newVal !== this._currentPath) {
      this._browse(newVal);
    }
  }

  async _browse(targetPath) {
    this._loading = true;
    this._error = null;
    this.render();

    try {
      const encodedPath = encodeURIComponent(targetPath);
      const response = await fetch(`/api/browse?path=${encodedPath}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to browse directory');
      }

      const data = await response.json();
      this._currentPath = data.current;
      this._directories = data.directories;
      this._parentPath = data.parent;
      this._isBeadsProject = data.isBeadsProject;
      this._loading = false;
      this._error = null;
    } catch (error) {
      this._loading = false;
      this._error = error.message;
    }

    this.render();
  }

  _handleFolderClick(folderPath) {
    this._browse(folderPath);
  }

  _handleSelect() {
    this.emit('folder-selected', { path: this._currentPath });
  }

  _handleCancel() {
    this.emit('folder-cancel');
  }

  _handleParentClick() {
    if (this._parentPath) {
      this._browse(this._parentPath);
    }
  }

  render() {
    const directoriesHtml = this._directories.map(dir => `
      <div class="folder-item ${dir.hasBeads ? 'has-beads' : ''}" data-path="${this.escapeHtml(dir.path)}">
        <span class="folder-icon">${dir.hasBeads ? '📦' : '📁'}</span>
        <span class="folder-name">${this.escapeHtml(dir.name)}</span>
        ${dir.hasBeads ? '<span class="beads-badge">beads</span>' : ''}
      </div>
    `).join('');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: inherit;
        }
        
        .browser-container {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background-color: var(--color-bg-primary);
          overflow: hidden;
        }
        
        .browser-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          background-color: var(--color-bg-tertiary);
          border-bottom: 1px solid var(--color-border);
        }
        
        .nav-btn {
          width: 28px;
          height: 28px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 1rem;
          color: var(--color-text-primary);
        }
        
        .nav-btn:hover:not(:disabled) {
          background-color: var(--color-bg-primary);
        }
        
        .nav-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        
        .current-path {
          flex: 1;
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          font-family: monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          direction: rtl;
          text-align: left;
        }
        
        .folder-list {
          max-height: 300px;
          overflow-y: auto;
        }
        
        .folder-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }
        
        .folder-item:hover {
          background-color: var(--color-bg-tertiary);
        }
        
        .folder-item.has-beads {
          background-color: rgba(var(--color-success-rgb, 40, 167, 69), 0.08);
        }
        
        .folder-item.has-beads:hover {
          background-color: rgba(var(--color-success-rgb, 40, 167, 69), 0.15);
        }
        
        .folder-icon {
          font-size: 1.125rem;
          flex-shrink: 0;
        }
        
        .folder-name {
          flex: 1;
          font-size: 0.875rem;
          color: var(--color-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .beads-badge {
          font-size: 0.6875rem;
          padding: 0.125rem 0.375rem;
          background-color: var(--color-success, #28a745);
          color: white;
          border-radius: var(--radius-sm);
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.025em;
        }
        
        .empty-state {
          padding: var(--spacing-lg);
          text-align: center;
          color: var(--color-text-muted);
          font-size: 0.875rem;
        }
        
        .loading-state {
          padding: var(--spacing-lg);
          text-align: center;
          color: var(--color-text-muted);
        }
        
        .spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 2px solid var(--color-border);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .error-state {
          padding: var(--spacing-md);
          background-color: rgba(220, 53, 69, 0.1);
          color: var(--color-danger);
          font-size: 0.875rem;
          text-align: center;
        }
        
        .browser-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          border-top: 1px solid var(--color-border);
          background-color: var(--color-bg-tertiary);
        }
        
        .selected-info {
          flex: 1;
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
        }
        
        .selected-info.is-beads {
          color: var(--color-success, #28a745);
          font-weight: 500;
        }
        
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-sm) var(--spacing-md);
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: var(--radius-md);
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        
        .btn-primary {
          background-color: var(--color-accent);
          color: var(--color-on-accent);
        }
        
        .btn-primary:hover:not(:disabled) {
          background-color: var(--color-accent-hover);
        }
        
        .btn-secondary {
          background-color: var(--color-bg-secondary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
        }
        
        .btn-secondary:hover:not(:disabled) {
          background-color: var(--color-bg-primary);
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .actions {
          display: flex;
          gap: var(--spacing-sm);
        }
      </style>
      
      <div class="browser-container">
        <div class="browser-header">
          <button class="nav-btn" title="Go to parent folder" ${!this._parentPath ? 'disabled' : ''}>
            ⬆
          </button>
          <div class="current-path" title="${this.escapeHtml(this._currentPath)}">
            ${this.escapeHtml(this._currentPath) || 'Loading...'}
          </div>
        </div>
        
        <div class="folder-list">
          ${this._loading ? `
            <div class="loading-state">
              <div class="spinner"></div>
            </div>
          ` : this._error ? `
            <div class="error-state">${this.escapeHtml(this._error)}</div>
          ` : this._directories.length === 0 ? `
            <div class="empty-state">No subfolders in this directory</div>
          ` : directoriesHtml}
        </div>
        
        <div class="browser-footer">
          <div class="selected-info ${this._isBeadsProject ? 'is-beads' : ''}">
            ${this._isBeadsProject 
              ? '✓ This folder contains a beads project' 
              : 'Navigate to a folder with a .beads directory'}
          </div>
          <div class="actions">
            <button class="btn btn-secondary cancel-btn">Cancel</button>
            <button class="btn btn-primary select-btn" ${!this._isBeadsProject ? 'disabled' : ''}>
              Select Folder
            </button>
          </div>
        </div>
      </div>
    `;

    this._attachEventListeners();
  }

  _attachEventListeners() {
    // Parent navigation button
    const navBtn = this.shadowRoot.querySelector('.nav-btn');
    navBtn?.addEventListener('click', () => this._handleParentClick());

    // Folder items
    const folderItems = this.shadowRoot.querySelectorAll('.folder-item');
    folderItems.forEach(item => {
      item.addEventListener('click', () => {
        const path = item.getAttribute('data-path');
        if (path) this._handleFolderClick(path);
      });
    });

    // Select button
    const selectBtn = this.shadowRoot.querySelector('.select-btn');
    selectBtn?.addEventListener('click', () => this._handleSelect());

    // Cancel button
    const cancelBtn = this.shadowRoot.querySelector('.cancel-btn');
    cancelBtn?.addEventListener('click', () => this._handleCancel());
  }
}

customElements.define('abacus-folder-browser', AbacusFolderBrowser);
