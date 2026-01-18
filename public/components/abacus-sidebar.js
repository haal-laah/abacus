import { AbacusElement } from './base.js';

class AbacusSidebar extends AbacusElement {
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          position: fixed;
          top: var(--header-height);
          left: 0;
          bottom: 0;
          width: var(--sidebar-width);
          background-color: var(--color-bg-secondary);
          border-right: 1px solid var(--color-border);
        }
        .sidebar-header {
          padding: var(--spacing-md);
          border-bottom: 1px solid var(--color-border);
        }
        .sidebar-header h2 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }
        .project-list {
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
        .empty-state p {
          margin: 0 0 var(--spacing-sm) 0;
        }
        .sidebar-footer {
          padding: var(--spacing-md);
          border-top: 1px solid var(--color-border);
        }
        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          width: 100%;
          padding: var(--spacing-sm) var(--spacing-md);
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: var(--radius-md);
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .btn-primary {
          background-color: var(--color-accent);
          color: var(--color-on-accent);
        }
        .btn-primary:hover {
          background-color: var(--color-accent-hover);
        }
      </style>
      <div class="sidebar-header">
        <h2>Projects</h2>
      </div>
      <nav class="project-list">
        <slot>
          <div class="empty-state">
            <p>No projects registered yet.</p>
            <p>Click "Add Project" to get started.</p>
          </div>
        </slot>
      </nav>
      <div class="sidebar-footer">
        <button class="btn btn-primary add-project-btn">
          <span>+</span> Add Project
        </button>
      </div>
    `;
    
    this.shadowRoot.querySelector('.add-project-btn').addEventListener('click', () => {
      this.emit('add-project-click');
    });
    
    // Handle empty state visibility based on slot content
    const slot = this.shadowRoot.querySelector('slot');
    slot.addEventListener('slotchange', () => {
      const assignedNodes = slot.assignedNodes().filter(n => n.nodeType === Node.ELEMENT_NODE);
      const emptyState = this.shadowRoot.querySelector('.empty-state');
      if (emptyState) {
        emptyState.style.display = assignedNodes.length > 0 ? 'none' : 'block';
      }
    });
  }
}

customElements.define('abacus-sidebar', AbacusSidebar);
