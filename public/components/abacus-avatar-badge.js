import { AbacusElement } from './base.js';

class AbacusAvatarBadge extends AbacusElement {
  static get observedAttributes() {
    return ['name'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (this.shadowRoot) this.render();
  }

  /**
   * Generate a consistent color from a name string
   * @param {string} name - Name to hash
   * @returns {string} Color hex code
   */
  getColorFromName(name) {
    const colors = [
      '#ef4444', // red
      '#f97316', // orange
      '#eab308', // yellow
      '#22c55e', // green
      '#14b8a6', // teal
      '#3b82f6', // blue
      '#8b5cf6', // purple
      '#ec4899'  // pink
    ];

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }

    return colors[Math.abs(hash) % colors.length];
  }

  render() {
    const name = this.getAttribute('name') || '';

    // Don't render if no name
    if (!name.trim()) {
      this.shadowRoot.innerHTML = '';
      return;
    }

    const initial = name.trim().charAt(0).toUpperCase();
    const bgColor = this.getColorFromName(name);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }
        .avatar {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: ${bgColor};
          color: white;
          font-size: 0.6875rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          text-transform: uppercase;
        }
      </style>
      <div class="avatar" title="${this.escapeHtml(name)}">${this.escapeHtml(initial)}</div>
    `;
  }
}

customElements.define('abacus-avatar-badge', AbacusAvatarBadge);
