import { AbacusElement } from './base.js';
import './abacus-kanban-column.js';
import './abacus-bead-card.js';

class AbacusKanbanBoard extends AbacusElement {
  static get observedAttributes() {
    return ['project-name', 'beads', 'loading'];
  }

  constructor() {
    super();
    this._beads = [];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'beads') {
      try {
        this._beads = JSON.parse(newVal || '[]');
      } catch (e) {
        this._beads = [];
      }
    }
    if (this.shadowRoot) this.render();
  }

  connectedCallback() {
    try {
      this._beads = JSON.parse(this.getAttribute('beads') || '[]');
    } catch (e) {
      this._beads = [];
    }
    super.connectedCallback();
  }

  _groupBeadsByStatus() {
    const groups = {
      open: [],
      in_progress: [],
      blocked: [],
      closed: []
    };
    this._beads.forEach(bead => {
      const status = bead.status || 'open';
      if (groups[status]) {
        groups[status].push(bead);
      }
    });
    return groups;
  }

  _renderSkeletonCards() {
    return `
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
    `;
  }

  render() {
    const projectName = this.escapeHtml(this.getAttribute('project-name') || 'Project');
    const isLoading = this.hasAttribute('loading');
    const groups = this._groupBeadsByStatus();
    
    const statuses = ['open', 'in_progress', 'blocked', 'closed'];
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          height: 100%;
        }
        .kanban-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--spacing-lg);
        }
        .kanban-header h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-xs) var(--spacing-sm);
          font-size: 0.75rem;
          font-weight: 500;
          border-radius: var(--radius-md);
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .btn-danger {
          background-color: var(--color-danger);
          color: var(--color-on-accent);
        }
        .btn-danger:hover {
          background-color: var(--color-danger-hover);
        }
        .kanban-columns {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-md);
          height: calc(100% - 80px);
        }
        .skeleton {
          background: linear-gradient(90deg, var(--color-bg-tertiary) 25%, var(--color-border) 37%, var(--color-bg-tertiary) 63%);
          background-size: 400% 100%;
          animation: skeleton-loading 1.4s ease infinite;
          border-radius: var(--radius-md);
        }
        .skeleton-card {
          height: 120px;
          margin-bottom: var(--spacing-sm);
        }
        @keyframes skeleton-loading {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }
        @media (max-width: 1024px) {
          .kanban-columns { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .kanban-columns { grid-template-columns: 1fr; gap: var(--spacing-lg); }
        }
      </style>
      <div class="kanban-header">
        <h2>${projectName}</h2>
        <button class="btn btn-danger remove-project-btn">Remove Project</button>
      </div>
      <div class="kanban-columns">
        ${statuses.map(status => `
          <abacus-kanban-column status="${status}" count="${groups[status].length}">
            ${isLoading ? this._renderSkeletonCards() : groups[status].map(bead => `
              <abacus-bead-card
                bead-id="${this.escapeHtml(bead.id)}"
                title="${this.escapeHtml(bead.title)}"
                priority="${bead.priority || 2}"
                type="${bead.type || 'task'}"
                ${bead.assignee ? `assignee="${this.escapeHtml(bead.assignee)}"` : ''}
                labels='${JSON.stringify(bead.labels || [])}'>
              </abacus-bead-card>
            `).join('')}
          </abacus-kanban-column>
        `).join('')}
      </div>
    `;
    
    this.shadowRoot.querySelector('.remove-project-btn').addEventListener('click', () => {
      this.emit('remove-project-click');
    });
  }
}

customElements.define('abacus-kanban-board', AbacusKanbanBoard);
