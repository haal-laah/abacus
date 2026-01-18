import { AbacusElement } from './base.js';

class AbacusTypeBadge extends AbacusElement {
  static get observedAttributes() {
    return ['type'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (this.shadowRoot) this.render();
  }

  render() {
    const type = this.getAttribute('type') || 'task';
    const validTypes = ['bug', 'feature', 'task', 'epic', 'chore'];
    const validType = validTypes.includes(type) ? type : 'task';
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }
        .badge {
          font-size: 0.6875rem;
          font-weight: 600;
          padding: 0.125rem 0.5rem;
          border-radius: var(--radius-sm);
          text-transform: uppercase;
          color: var(--color-on-accent);
        }
        .bug { background-color: var(--color-type-bug); }
        .feature { background-color: var(--color-type-feature); }
        .task { background-color: var(--color-type-task); }
        .epic { background-color: var(--color-type-epic); }
        .chore { background-color: var(--color-type-chore); }
      </style>
      <span class="badge ${validType}">${validType}</span>
    `;
  }
}

customElements.define('abacus-type-badge', AbacusTypeBadge);
