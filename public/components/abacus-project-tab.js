import { AbacusElement } from './base.js';

class AbacusProjectTab extends AbacusElement {
  static get observedAttributes() {
    return ['project-id', 'name', 'path', 'count', 'active'];
  }

  constructor() {
    super();
    this._menuOpen = false;
    this._boundDocumentClickHandler = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (this.shadowRoot) this.render();
  }

  disconnectedCallback() {
    this._removeDocumentClickHandler();
  }

  _removeDocumentClickHandler() {
    if (this._boundDocumentClickHandler) {
      document.removeEventListener('click', this._boundDocumentClickHandler);
      this._boundDocumentClickHandler = null;
    }
  }

  _toggleMenu(e) {
    e.stopPropagation();
    this._menuOpen = !this._menuOpen;
    const menu = this.shadowRoot.querySelector('.kebab-menu');
    if (menu) {
      menu.classList.toggle('open', this._menuOpen);
    }
  }

  _closeMenu() {
    this._menuOpen = false;
    const menu = this.shadowRoot.querySelector('.kebab-menu');
    if (menu) {
      menu.classList.remove('open');
    }
  }

  _handleRemoveClick(e) {
    e.stopPropagation();
    this._closeMenu();
    this.emit('remove-project-click', {
      projectId: this.getAttribute('project-id'),
      name: this.getAttribute('name'),
      path: this.getAttribute('path')
    });
  }

  render() {
    const name = this.escapeHtml(this.getAttribute('name') || 'Unnamed Project');
    const count = this.getAttribute('count') || '0';
    const isActive = this.hasAttribute('active');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .project-tab {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: background-color var(--transition-fast);
          margin-bottom: var(--spacing-xs);
        }
        .project-tab:hover {
          background-color: var(--color-bg-tertiary);
        }
        .project-tab.active {
          background-color: var(--color-accent);
          color: var(--color-on-accent);
        }
        .project-tab.active .project-count {
          background-color: var(--color-on-primary-muted);
          color: var(--color-on-accent);
        }
        .project-tab.active .kebab-btn {
          color: var(--color-on-accent);
        }
        .project-tab.active .kebab-btn:hover {
          background-color: rgba(255, 255, 255, 0.15);
        }
        .project-name {
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          color: inherit;
        }
        .project-right {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
        }
        .project-count {
          background-color: var(--color-bg-tertiary);
          color: var(--color-text-secondary);
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
          min-width: 1.5rem;
          text-align: center;
        }
        .kebab-btn {
          opacity: 0;
          background: none;
          border: none;
          cursor: pointer;
          padding: var(--spacing-xs);
          border-radius: var(--radius-sm);
          color: var(--color-text-secondary);
          font-size: 1rem;
          line-height: 1;
          transition: opacity var(--transition-fast), background-color var(--transition-fast);
        }
        .project-tab:hover .kebab-btn,
        .kebab-btn.active {
          opacity: 1;
        }
        .kebab-btn:hover {
          background-color: var(--color-bg-secondary);
        }
        .kebab-menu {
          display: none;
          position: absolute;
          right: 0;
          top: 100%;
          z-index: 100;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-md);
          padding: var(--spacing-xs);
          min-width: 140px;
        }
        .kebab-menu.open {
          display: block;
        }
        .kebab-menu-item {
          display: block;
          width: 100%;
          padding: var(--spacing-sm) var(--spacing-md);
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          font-size: 0.875rem;
          border-radius: var(--radius-sm);
          transition: background-color var(--transition-fast);
        }
        .kebab-menu-item:hover {
          background-color: var(--color-bg-tertiary);
        }
        .kebab-menu-item--danger {
          color: var(--color-danger);
        }
      </style>
      <div class="project-tab ${isActive ? 'active' : ''}">
        <span class="project-name">${name}</span>
        <div class="project-right">
          <span class="project-count">${count}</span>
          <button class="kebab-btn" aria-label="Project menu">&#8942;</button>
        </div>
        <div class="kebab-menu">
          <button class="kebab-menu-item kebab-menu-item--danger remove-btn">Remove Project</button>
        </div>
      </div>
    `;

    const tab = this.shadowRoot.querySelector('.project-tab');
    const kebabBtn = this.shadowRoot.querySelector('.kebab-btn');
    const removeBtn = this.shadowRoot.querySelector('.remove-btn');

    tab.addEventListener('click', (e) => {
      if (e.target.closest('.kebab-btn') || e.target.closest('.kebab-menu')) {
        return;
      }
      this._closeMenu();
      this.emit('project-select', {
        projectId: this.getAttribute('project-id'),
        name: this.getAttribute('name'),
        path: this.getAttribute('path')
      });
    });

    kebabBtn.addEventListener('click', (e) => {
      this._toggleMenu(e);
      kebabBtn.classList.toggle('active', this._menuOpen);
    });

    removeBtn.addEventListener('click', (e) => this._handleRemoveClick(e));

    // Close menu when clicking outside - remove any existing handler first
    this._removeDocumentClickHandler();
    this._boundDocumentClickHandler = () => {
      this._closeMenu();
      kebabBtn.classList.remove('active');
      this._boundDocumentClickHandler = null;
    };
    document.addEventListener('click', this._boundDocumentClickHandler, { once: true });
  }
}

customElements.define('abacus-project-tab', AbacusProjectTab);
