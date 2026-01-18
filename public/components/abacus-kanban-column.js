import { AbacusElement } from './base.js';

class AbacusKanbanColumn extends AbacusElement {
  static get observedAttributes() {
    return ['status', 'count'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (this.shadowRoot) this.render();
  }

  _formatStatus(status) {
    const statusMap = {
      'open': 'Open',
      'in_progress': 'In Progress',
      'blocked': 'Blocked',
      'closed': 'Closed'
    };
    return statusMap[status] || status;
  }

  render() {
    const status = this.getAttribute('status') || 'open';
    const count = this.getAttribute('count') || '0';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          background-color: var(--color-bg-secondary);
          border-radius: var(--radius-lg);
          max-height: calc(100vh - 180px);
        }
        .column-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-md);
          border-bottom: 1px solid var(--color-border);
        }
        .column-header h3 {
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-secondary);
          margin: 0;
        }
        .bead-count {
          background-color: var(--color-bg-tertiary);
          color: var(--color-text-secondary);
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
          min-width: 1.5rem;
          text-align: center;
        }
        .column-cards {
          flex: 1;
          overflow-y: auto;
          padding: var(--spacing-sm);
        }
        .empty-state {
          padding: var(--spacing-lg);
          text-align: center;
          color: var(--color-text-muted);
          font-size: 0.875rem;
        }
        ::slotted(abacus-bead-card) {
          margin-bottom: var(--spacing-sm);
        }
      </style>
      <div class="column-header">
        <h3>${this._formatStatus(status)}</h3>
        <span class="bead-count">${count}</span>
      </div>
      <div class="column-cards">
        <slot></slot>
      </div>
    `;
    
    // Check for empty state after slot assignment
    requestAnimationFrame(() => {
      const slot = this.shadowRoot?.querySelector('slot');
      if (!slot) return; // Guard against re-renders that replaced the DOM
      
      const assignedNodes = slot.assignedNodes().filter(n => n.nodeType === Node.ELEMENT_NODE);
      if (assignedNodes.length === 0 && count === '0') {
        const columnCards = this.shadowRoot?.querySelector('.column-cards');
        if (columnCards) {
          columnCards.innerHTML = `<div class="empty-state">No items</div>`;
        }
      }
    });
  }
}

customElements.define('abacus-kanban-column', AbacusKanbanColumn);
