import { AbacusElement } from './base.js';

class AbacusProjectTab extends AbacusElement {
  static get observedAttributes() {
    return ['project-id', 'name', 'path', 'count', 'active'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (this.shadowRoot) this.render();
  }

  render() {
    const projectId = this.getAttribute('project-id') || '';
    const name = this.escapeHtml(this.getAttribute('name') || 'Unnamed Project');
    const count = this.getAttribute('count') || '0';
    const isActive = this.hasAttribute('active');
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .project-tab {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: background-color var(--transition-fast);
          margin-bottom: var(--spacing-xs);
        }
        .project-tab:hover {
          background-color: var(--color-bg-tertiary);
        }
        .project-tab.active {
          background-color: var(--color-accent);
          color: var(--color-on-accent);
        }
        .project-tab.active .project-count {
          background-color: var(--color-on-primary-muted);
          color: var(--color-on-accent);
        }
        .project-name {
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          color: inherit;
        }
        .project-count {
          background-color: var(--color-bg-tertiary);
          color: var(--color-text-secondary);
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
          min-width: 1.5rem;
          text-align: center;
          margin-left: var(--spacing-sm);
        }
      </style>
      <div class="project-tab ${isActive ? 'active' : ''}">
        <span class="project-name">${name}</span>
        <span class="project-count">${count}</span>
      </div>
    `;
    
    this.shadowRoot.querySelector('.project-tab').addEventListener('click', () => {
      this.emit('project-select', {
        projectId: this.getAttribute('project-id'),
        name: this.getAttribute('name'),
        path: this.getAttribute('path')
      });
    });
  }
}

customElements.define('abacus-project-tab', AbacusProjectTab);
