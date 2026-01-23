import { AbacusElement } from './base.js';
import './abacus-kanban-column.js';
import './abacus-bead-card.js';
import './abacus-sort-dropdown.js';

class AbacusKanbanBoard extends AbacusElement {
  static get observedAttributes() {
    return ['beads', 'loading', 'project-id'];
  }

  constructor() {
    super();
    this._beads = [];
    this._projectId = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'beads') {
      try {
        this._beads = JSON.parse(newVal || '[]');
      } catch (e) {
        this._beads = [];
      }
    } else if (name === 'project-id') {
      this._projectId = newVal;
    }
    if (this.shadowRoot) this.render();
  }

  connectedCallback() {
    try {
      this._beads = JSON.parse(this.getAttribute('beads') || '[]');
    } catch (e) {
      this._beads = [];
    }
    this._projectId = this.getAttribute('project-id');
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
    const isLoading = this.hasAttribute('loading');
    const groups = this._groupBeadsByStatus();

    const statuses = ['open', 'in_progress', 'blocked', 'closed'];

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .board-toolbar {
          flex-shrink: 0;
          padding: 0 var(--spacing-xs);
          margin-bottom: var(--spacing-sm);
          border-bottom: 1px solid var(--color-border);
        }
        .kanban-columns {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-md);
          flex: 1;
          min-height: 0;
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
      ${this._projectId ? `
        <div class="board-toolbar">
          <abacus-sort-dropdown project-id="${this.escapeHtml(this._projectId)}"></abacus-sort-dropdown>
        </div>
      ` : ''}
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
  }
}

customElements.define('abacus-kanban-board', AbacusKanbanBoard);
