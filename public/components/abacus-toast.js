import { AbacusElement } from './base.js';

class AbacusToast extends AbacusElement {
  static get observedAttributes() {
    return ['message', 'show-undo', 'duration'];
  }

  constructor() {
    super();
    this._timeoutId = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (this.shadowRoot) this.render();
  }

  connectedCallback() {
    super.connectedCallback();
    this._startAutoHide();
  }

  disconnectedCallback() {
    this._clearTimeout();
  }

  _clearTimeout() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

  _startAutoHide() {
    this._clearTimeout();
    const duration = parseInt(this.getAttribute('duration') || '5000', 10);
    this._timeoutId = setTimeout(() => {
      this.emit('toast-dismiss');
    }, duration);
  }

  render() {
    const message = this.escapeHtml(this.getAttribute('message') || '');
    const showUndo = this.hasAttribute('show-undo');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          bottom: var(--spacing-lg);
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
        }
        .toast {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          background-color: var(--color-bg-tertiary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--spacing-sm) var(--spacing-md);
          box-shadow: var(--shadow-lg);
          animation: slideUp 0.2s ease-out;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .toast-message {
          font-size: 0.875rem;
        }
        .toast-undo {
          background: none;
          border: none;
          color: var(--color-accent);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-sm);
          transition: background-color var(--transition-fast);
        }
        .toast-undo:hover {
          background-color: var(--color-bg-secondary);
        }
        .toast-close {
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: var(--spacing-xs);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .toast-close:hover {
          color: var(--color-text-primary);
        }
      </style>
      <div class="toast">
        <span class="toast-message">${message}</span>
        ${showUndo ? '<button class="toast-undo">Undo</button>' : ''}
        <button class="toast-close" aria-label="Close">✕</button>
      </div>
    `;

    const closeBtn = this.shadowRoot.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      this.emit('toast-dismiss');
    });

    if (showUndo) {
      const undoBtn = this.shadowRoot.querySelector('.toast-undo');
      undoBtn.addEventListener('click', () => {
        this._clearTimeout();
        this.emit('toast-undo');
      });
    }
  }
}

customElements.define('abacus-toast', AbacusToast);
