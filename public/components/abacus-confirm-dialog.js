import { AbacusModal } from './abacus-modal.js';

class AbacusConfirmDialog extends AbacusModal {
  static get observedAttributes() {
    return [...AbacusModal.observedAttributes, 'title', 'message', 'confirm-text', 'cancel-text', 'destructive'];
  }

  renderHeader() {
    return this.escapeHtml(this.getAttribute('title') || 'Confirm');
  }

  renderBody() {
    const message = this.escapeHtml(this.getAttribute('message') || 'Are you sure?');
    return `<p style="color: var(--color-text-secondary); line-height: 1.6;">${message}</p>`;
  }

  renderFooter() {
    const isLoading = this.hasAttribute('loading');
    const isDestructive = this.hasAttribute('destructive');
    const confirmText = this.getAttribute('confirm-text') || 'Confirm';
    const cancelText = this.getAttribute('cancel-text') || 'Cancel';
    
    return `
      <style>
        .dialog-actions { display: flex; justify-content: flex-end; gap: var(--spacing-sm); }
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--spacing-sm); padding: var(--spacing-sm) var(--spacing-md); font-size: 0.875rem; font-weight: 500; border-radius: var(--radius-md); border: none; cursor: pointer; transition: all var(--transition-fast); }
        .btn-primary { background-color: var(--color-accent); color: var(--color-on-accent); }
        .btn-primary:hover:not(:disabled) { background-color: var(--color-accent-hover); }
        .btn-danger { background-color: var(--color-danger); color: var(--color-on-accent); }
        .btn-danger:hover:not(:disabled) { background-color: var(--color-danger-hover); }
        .btn-secondary { background-color: var(--color-bg-tertiary); color: var(--color-text-primary); }
        .btn-secondary:hover:not(:disabled) { background-color: var(--color-border); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: var(--color-on-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
      <div class="dialog-actions">
        <button type="button" class="btn btn-secondary cancel-btn" ${isLoading ? 'disabled' : ''}>${cancelText}</button>
        <button type="button" class="btn ${isDestructive ? 'btn-danger' : 'btn-primary'} confirm-btn" ${isLoading ? 'disabled' : ''}>
          ${isLoading ? '<span class="spinner"></span> Loading...' : confirmText}
        </button>
      </div>
    `;
  }

  _attachEventListeners() {
    super._attachEventListeners();
    
    const cancelBtn = this.shadowRoot.querySelector('.cancel-btn');
    const confirmBtn = this.shadowRoot.querySelector('.confirm-btn');
    
    cancelBtn?.addEventListener('click', () => this._handleClose('cancel'));
    confirmBtn?.addEventListener('click', () => {
      if (!this.hasAttribute('loading')) {
        this.emit('modal-confirm');
      }
    });
  }
}

customElements.define('abacus-confirm-dialog', AbacusConfirmDialog);
