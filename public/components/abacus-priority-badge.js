import { AbacusElement } from './base.js';

class AbacusPriorityBadge extends AbacusElement {
  static get observedAttributes() {
    return ['priority'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (this.shadowRoot) this.render();
  }

  render() {
    const priority = this.getAttribute('priority') || '2';
    const validPriority = ['0', '1', '2', '3', '4'].includes(priority) ? priority : '2';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }
        .badge {
          font-size: 0.625rem;
          font-weight: 700;
          padding: 0.125rem 0.375rem;
          border-radius: var(--radius-sm);
          color: var(--color-on-accent);
          text-transform: uppercase;
        }
        .p0 { background-color: var(--color-priority-0); }
        .p1 { background-color: var(--color-priority-1); }
        .p2 { background-color: var(--color-priority-2); color: var(--color-on-warning); }
        .p3 { background-color: var(--color-priority-3); }
        .p4 { background-color: var(--color-priority-4); }
      </style>
      <span class="badge p${validPriority}">P${validPriority}</span>
    `;
  }
}

customElements.define('abacus-priority-badge', AbacusPriorityBadge);
