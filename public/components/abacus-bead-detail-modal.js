import { AbacusModal } from './abacus-modal.js';

class AbacusBeadDetailModal extends AbacusModal {
  static get observedAttributes() {
    return [...AbacusModal.observedAttributes, 'bead'];
  }

  constructor() {
    super();
    this._bead = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'bead') {
      try {
        this._bead = JSON.parse(newVal || 'null');
      } catch (e) {
        this._bead = null;
      }
    }
    super.attributeChangedCallback(name, oldVal, newVal);
  }

  _formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  _formatStatus(status) {
    const map = { 'open': 'Open', 'in_progress': 'In Progress', 'blocked': 'Blocked', 'closed': 'Closed' };
    return map[status] || status;
  }

  renderHeader() {
    return this._bead ? this.escapeHtml(this._bead.title) : 'Bead Details';
  }

  renderBody() {
    if (!this._bead) return '<p>No bead data</p>';
    
    const b = this._bead;
    const labelsHtml = (b.labels || []).map(l => `<span class="label">${this.escapeHtml(l)}</span>`).join('');
    const depsHtml = (b.dependencies || []).map(d => `
      <span class="dependency" data-bead-id="${this.escapeHtml(d.target)}">
        <span class="dep-type">${this.escapeHtml(d.type)}</span>
        ${this.escapeHtml(d.target)}
      </span>
    `).join('') || '<span class="no-deps">None</span>';
    
    return `
      <style>
        .bead-detail { display: flex; flex-direction: column; gap: var(--spacing-lg); }
        .bead-detail-section { border-bottom: 1px solid var(--color-border); padding-bottom: var(--spacing-lg); }
        .bead-detail-section:last-child { border-bottom: none; padding-bottom: 0; }
        .bead-detail-section h4 { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); margin: 0 0 var(--spacing-sm) 0; }
        .bead-description { color: var(--color-text-secondary); line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
        .bead-detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-md); }
        .bead-detail-item { display: flex; flex-direction: column; gap: var(--spacing-xs); }
        .bead-detail-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); }
        .bead-detail-value { color: var(--color-text-primary); }
        .label { font-size: 0.6875rem; color: var(--color-text-secondary); background-color: var(--color-bg-tertiary); padding: 0.125rem 0.375rem; border-radius: var(--radius-sm); margin-right: var(--spacing-xs); }
        .dependency { display: inline-flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs) var(--spacing-sm); background-color: var(--color-bg-tertiary); border-radius: var(--radius-sm); font-size: 0.875rem; cursor: pointer; transition: background-color var(--transition-fast); margin-right: var(--spacing-xs); margin-bottom: var(--spacing-xs); }
        .dependency:hover { background-color: var(--color-border); }
        .dep-type { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-text-muted); }
        .no-deps { color: var(--color-text-muted); font-style: italic; }
        .priority-badge, .type-badge, .status-badge { font-size: 0.6875rem; font-weight: 600; padding: 0.125rem 0.5rem; border-radius: var(--radius-sm); text-transform: uppercase; }
        .priority-badge { color: var(--color-on-accent); }
        .priority-0 { background-color: var(--color-priority-0); }
        .priority-1 { background-color: var(--color-priority-1); }
        .priority-2 { background-color: var(--color-priority-2); color: var(--color-on-warning); }
        .priority-3 { background-color: var(--color-priority-3); }
        .priority-4 { background-color: var(--color-priority-4); }
        .type-badge { color: var(--color-on-accent); }
        .type-bug { background-color: var(--color-type-bug); }
        .type-feature { background-color: var(--color-type-feature); }
        .type-task { background-color: var(--color-type-task); }
        .type-epic { background-color: var(--color-type-epic); }
        .type-chore { background-color: var(--color-type-chore); }
      </style>
      <div class="bead-detail">
        <div class="bead-detail-section">
          <h4>Description</h4>
          <div class="bead-description">${this.escapeHtml(b.description || 'No description')}</div>
        </div>
        <div class="bead-detail-section">
          <div class="bead-detail-grid">
            <div class="bead-detail-item">
              <span class="bead-detail-label">ID</span>
              <span class="bead-detail-value">${this.escapeHtml(b.id)}</span>
            </div>
            <div class="bead-detail-item">
              <span class="bead-detail-label">Status</span>
              <span class="bead-detail-value">${this._formatStatus(b.status)}</span>
            </div>
            <div class="bead-detail-item">
              <span class="bead-detail-label">Priority</span>
              <span class="bead-detail-value"><span class="priority-badge priority-${b.priority}">P${b.priority}</span></span>
            </div>
            <div class="bead-detail-item">
              <span class="bead-detail-label">Type</span>
              <span class="bead-detail-value"><span class="type-badge type-${b.type}">${b.type}</span></span>
            </div>
            <div class="bead-detail-item">
              <span class="bead-detail-label">Assignee</span>
              <span class="bead-detail-value">${this.escapeHtml(b.assignee || 'Unassigned')}</span>
            </div>
            <div class="bead-detail-item">
              <span class="bead-detail-label">Labels</span>
              <span class="bead-detail-value">${labelsHtml || '<span class="no-deps">None</span>'}</span>
            </div>
          </div>
        </div>
        <div class="bead-detail-section">
          <h4>Dependencies</h4>
          <div class="dependencies">${depsHtml}</div>
        </div>
        <div class="bead-detail-section">
          <div class="bead-detail-grid">
            <div class="bead-detail-item">
              <span class="bead-detail-label">Created</span>
              <span class="bead-detail-value">${this._formatDate(b.created_at)}</span>
            </div>
            <div class="bead-detail-item">
              <span class="bead-detail-label">Updated</span>
              <span class="bead-detail-value">${this._formatDate(b.updated_at)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderFooter() {
    return '';
  }

  _attachEventListeners() {
    super._attachEventListeners();
    
    this.shadowRoot.querySelectorAll('.dependency').forEach(dep => {
      dep.addEventListener('click', () => {
        const beadId = dep.dataset.beadId;
        if (beadId) this.emit('dependency-click', { beadId });
      });
    });
  }
}

customElements.define('abacus-bead-detail-modal', AbacusBeadDetailModal);
