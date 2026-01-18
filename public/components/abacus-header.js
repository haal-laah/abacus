import { AbacusElement } from './base.js';

class AbacusHeader extends AbacusElement {
  connectedCallback() {
    super.connectedCallback();
    this._updateThemeLabel();
  }

  _updateThemeLabel() {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const label = this.shadowRoot.querySelector('.theme-label');
    if (label) {
      const labels = {
        'light': 'Light',
        'dark': 'Dark',
        'nord': 'Nord',
        'warm': 'Warm'
      };
      label.textContent = labels[theme] || 'Light';
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: var(--header-height);
          background-color: var(--color-bg-secondary);
          border-bottom: 1px solid var(--color-border);
          z-index: 100;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          padding: 0 var(--spacing-lg);
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }
        .logo {
          display: flex;
          align-items: center;
        }
        .logo-img {
          height: 32px;
          width: auto;
        }
        /* Invert logo for dark themes */
        :host-context([data-theme="dark"]) .logo-img,
        :host-context([data-theme="nord"]) .logo-img,
        :host-context([data-theme="warm"]) .logo-img {
          filter: invert(1);
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }
        .btn-text {
          padding: var(--spacing-sm) var(--spacing-md);
          background-color: transparent;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text);
          transition: background-color var(--transition-fast);
        }
        .btn-text:hover {
          background-color: var(--color-bg-tertiary);
        }
      </style>
      <header class="header">
        <div class="header-left">
          <h1 class="logo">
            <img src="images/abacus-logo.png" alt="Abacus" class="logo-img">
          </h1>
        </div>
        <div class="header-right">
          <button class="btn-text theme-toggle" id="theme-toggle" title="Toggle theme">
            <span class="theme-label">Light</span>
          </button>
        </div>
      </header>
    `;
    
    this.shadowRoot.querySelector('.theme-toggle').addEventListener('click', () => {
      this.emit('theme-toggle');
      requestAnimationFrame(() => this._updateThemeLabel());
    });
  }
}

customElements.define('abacus-header', AbacusHeader);
