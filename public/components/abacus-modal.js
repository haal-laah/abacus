import { AbacusElement } from './base.js';

const FOCUSABLE_SELECTORS = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export class AbacusModal extends AbacusElement {
  static get observedAttributes() {
    return ['open', 'size', 'loading'];
  }

  constructor() {
    super();
    this._previousFocus = null;
    this._boundHandleKeydown = this._handleKeydown.bind(this);
  }

  // Override these in derived classes
  renderHeader() { return ''; }
  renderBody() { return ''; }
  renderFooter() { return ''; }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'open') {
      if (newVal !== null) {
        this._onOpen();
      } else {
        this._onClose();
      }
    }
    if (this.shadowRoot) this.render();
  }

  _onOpen() {
    this._previousFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this._boundHandleKeydown);
    
    // Focus first focusable element after render
    requestAnimationFrame(() => {
      const focusables = this._getFocusableElements();
      if (focusables.length > 0) {
        focusables[0].focus();
      }
    });
  }

  _onClose() {
    document.body.style.overflow = '';
    document.removeEventListener('keydown', this._boundHandleKeydown);
    if (this._previousFocus) {
      this._previousFocus.focus();
    }
  }

  _canClose() {
    return !this.hasAttribute('loading');
  }

  _handleClose(reason) {
    if (!this._canClose()) return;
    
    if (reason === 'cancel') {
      this.emit('modal-cancel');
    }
    this.emit('modal-close');
    this.removeAttribute('open');
  }

  _handleKeydown(e) {
    if (e.key === 'Escape' && this.hasAttribute('open')) {
      this._handleClose('escape');
      return;
    }
    
    // Focus trap
    if (e.key === 'Tab') {
      this._trapFocus(e);
    }
  }

  _getFocusableElements() {
    return Array.from(this.shadowRoot.querySelectorAll(FOCUSABLE_SELECTORS))
      .filter(el => !el.disabled && el.offsetParent !== null);
  }

  _trapFocus(e) {
    const focusables = this._getFocusableElements();
    if (focusables.length === 0) return;
    
    const firstFocusable = focusables[0];
    const lastFocusable = focusables[focusables.length - 1];
    const activeEl = this.shadowRoot.activeElement || document.activeElement;

    if (e.shiftKey && activeEl === firstFocusable) {
      e.preventDefault();
      lastFocusable.focus();
    } else if (!e.shiftKey && activeEl === lastFocusable) {
      e.preventDefault();
      firstFocusable.focus();
    }
  }

  render() {
    const size = this.getAttribute('size') || 'default';
    const isOpen = this.hasAttribute('open');
    const isLoading = this.hasAttribute('loading');
    
    const sizeClass = size === 'small' ? 'modal-small' : size === 'large' ? 'modal-large' : '';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: ${isOpen ? 'flex' : 'none'};
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          align-items: center;
          justify-content: center;
        }
        .modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--color-overlay);
        }
        .modal-content {
          position: relative;
          background-color: var(--color-bg-secondary);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          margin: var(--spacing-lg);
        }
        .modal-content.modal-large { max-width: 700px; }
        .modal-content.modal-small { max-width: 400px; }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-lg);
          border-bottom: 1px solid var(--color-border);
        }
        .modal-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .modal-close {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: transparent;
          border: none;
          font-size: 1.5rem;
          color: var(--color-text-muted);
          cursor: pointer;
          border-radius: var(--radius-sm);
        }
        .modal-close:hover:not(:disabled) {
          background-color: var(--color-bg-tertiary);
          color: var(--color-text-primary);
        }
        .modal-close:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .modal-body {
          padding: var(--spacing-lg);
        }
        .modal-footer {
          padding: var(--spacing-lg);
          padding-top: 0;
        }
      </style>
      <div class="modal-overlay"></div>
      <div class="modal-content ${sizeClass}">
        <div class="modal-header">
          <span class="modal-title">${this.renderHeader()}</span>
          <button class="modal-close" type="button" ${isLoading ? 'disabled' : ''}>×</button>
        </div>
        <div class="modal-body">
          ${this.renderBody()}
        </div>
        <div class="modal-footer">
          ${this.renderFooter()}
        </div>
      </div>
    `;
    
    this._attachEventListeners();
  }

  _attachEventListeners() {
    const overlay = this.shadowRoot.querySelector('.modal-overlay');
    const closeBtn = this.shadowRoot.querySelector('.modal-close');
    
    overlay?.addEventListener('click', () => this._handleClose('overlay'));
    closeBtn?.addEventListener('click', () => this._handleClose('x'));
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._boundHandleKeydown);
    document.body.style.overflow = '';
  }
}

customElements.define('abacus-modal', AbacusModal);
