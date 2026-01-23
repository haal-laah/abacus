import { AbacusElement } from './base.js';
import './abacus-priority-badge.js';
import './abacus-type-badge.js';
import './abacus-avatar-badge.js';

class AbacusBeadCard extends AbacusElement {
  static get observedAttributes() {
    return ['bead-id', 'title', 'priority', 'type', 'assignee', 'labels'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'labels') {
      try {
        this._labels = JSON.parse(newVal || '[]');
      } catch (e) {
        this._labels = [];
      }
    }
    if (this.shadowRoot) this.render();
  }

  connectedCallback() {
    try {
      this._labels = JSON.parse(this.getAttribute('labels') || '[]');
    } catch (e) {
      this._labels = [];
    }
    super.connectedCallback();
  }

  render() {
    const beadId = this.getAttribute('bead-id') || '';
    const title = this.getAttribute('title') || 'Untitled';
    const escapedTitle = this.escapeHtml(title);
    const priority = this.getAttribute('priority') || '2';
    const type = this.getAttribute('type') || 'task';
    const assignee = this.getAttribute('assignee') || '';
    const labels = this._labels || [];

    // Compact labels: show first 2 + "+N more"
    const visibleLabels = labels.slice(0, 2);
    const extraCount = labels.length - 2;
    const labelsHtml = visibleLabels.length > 0
      ? visibleLabels.map(l => `<span class="bead-label">${this.escapeHtml(l)}</span>`).join('') +
        (extraCount > 0 ? `<span class="bead-label bead-label-more">+${extraCount}</span>` : '')
      : '';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .bead-card {
          background-color: var(--color-bg-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--spacing-sm);
          margin-bottom: var(--spacing-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .bead-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-1px);
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-bottom: 0.25rem;
        }
        .bead-id {
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          flex-shrink: 0;
        }
        .bead-title {
          font-weight: 500;
          font-size: 0.875rem;
          line-height: 1.3;
          color: var(--color-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-width: 0;
        }
        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-xs);
        }
        .labels {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }
        .bead-label {
          font-size: 0.625rem;
          color: var(--color-text-secondary);
          background-color: var(--color-bg-tertiary);
          padding: 0.0625rem 0.25rem;
          border-radius: var(--radius-sm);
          white-space: nowrap;
        }
        .bead-label-more {
          font-weight: 600;
          color: var(--color-text-muted);
        }
        abacus-avatar-badge {
          flex-shrink: 0;
        }
      </style>
      <div class="bead-card">
        <div class="card-header">
          <span class="bead-id">${beadId}</span>
          <abacus-priority-badge priority="${priority}"></abacus-priority-badge>
          <abacus-type-badge type="${type}"></abacus-type-badge>
          <span class="bead-title" title="${escapedTitle}">${escapedTitle}</span>
        </div>
        <div class="card-footer">
          <div class="labels">${labelsHtml}</div>
          ${assignee ? `<abacus-avatar-badge name="${this.escapeHtml(assignee)}"></abacus-avatar-badge>` : ''}
        </div>
      </div>
    `;

    this.shadowRoot.querySelector('.bead-card').addEventListener('click', () => {
      this.emit('bead-select', { beadId: this.getAttribute('bead-id') });
    });
  }
}

customElements.define('abacus-bead-card', AbacusBeadCard);
