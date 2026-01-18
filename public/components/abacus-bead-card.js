import { AbacusElement } from './base.js';
import './abacus-priority-badge.js';
import './abacus-type-badge.js';

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
    const title = this.escapeHtml(this.getAttribute('title') || 'Untitled');
    const priority = this.getAttribute('priority') || '2';
    const type = this.getAttribute('type') || 'task';
    const assignee = this.escapeHtml(this.getAttribute('assignee') || '');
    const labels = this._labels || [];
    
    const labelsHtml = labels.length > 0 
      ? `<div class="bead-labels">${labels.map(l => `<span class="bead-label">${this.escapeHtml(l)}</span>`).join('')}</div>`
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
          padding: var(--spacing-md);
          margin-bottom: var(--spacing-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .bead-card:hover {
          box-shadow: var(--shadow-md);
          transform: translateY(-1px);
        }
        .bead-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--spacing-sm);
        }
        .bead-id {
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        .bead-title {
          font-weight: 500;
          font-size: 0.9375rem;
          line-height: 1.4;
          margin-bottom: var(--spacing-sm);
          color: var(--color-text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .bead-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--spacing-xs);
        }
        .bead-assignee {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          background-color: var(--color-bg-tertiary);
          padding: 0.125rem 0.5rem;
          border-radius: var(--radius-sm);
        }
        .bead-labels {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-xs);
          margin-top: var(--spacing-sm);
        }
        .bead-label {
          font-size: 0.6875rem;
          color: var(--color-text-secondary);
          background-color: var(--color-bg-tertiary);
          padding: 0.125rem 0.375rem;
          border-radius: var(--radius-sm);
        }
      </style>
      <div class="bead-card">
        <div class="bead-card-header">
          <span class="bead-id">${beadId}</span>
          <abacus-priority-badge priority="${priority}"></abacus-priority-badge>
        </div>
        <div class="bead-title">${title}</div>
        <div class="bead-meta">
          <abacus-type-badge type="${type}"></abacus-type-badge>
          ${assignee ? `<span class="bead-assignee">${assignee}</span>` : ''}
        </div>
        ${labelsHtml}
      </div>
    `;
    
    this.shadowRoot.querySelector('.bead-card').addEventListener('click', () => {
      this.emit('bead-select', { beadId: this.getAttribute('bead-id') });
    });
  }
}

customElements.define('abacus-bead-card', AbacusBeadCard);
