import { AbacusElement } from './base.js';
import './abacus-priority-badge.js';
import './abacus-type-badge.js';
import './abacus-avatar-badge.js';

class AbacusBeadCard extends AbacusElement {
  static get observedAttributes() {
    return ['bead-id', 'title', 'priority', 'type', 'assignee', 'labels', 'status'];
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
    const status = this.getAttribute('status') || 'open';
    const labels = this._labels || [];
    const isArchived = labels.includes('archived');
    const isInProgress = status === 'in_progress';

    // Compact labels: show first 2 + "+N more" (exclude 'archived' from display)
    const displayLabels = labels.filter(l => l !== 'archived');
    const visibleLabels = displayLabels.slice(0, 2);
    const extraCount = displayLabels.length - 2;
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
        /* Archived card styling */
        .bead-card--archived {
          opacity: 0.6;
          filter: saturate(0.5);
        }
        .bead-card--archived:hover {
          opacity: 0.9;
          filter: saturate(0.8);
        }
        .archived-badge {
          font-size: 0.5625rem;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--color-text-muted);
          background-color: var(--color-bg-tertiary);
          padding: 0.0625rem 0.25rem;
          border-radius: var(--radius-sm);
          margin-left: auto;
        }
        .unarchive-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(0, 0, 0, 0.5);
          border-radius: var(--radius-md);
          opacity: 0;
          transition: opacity var(--transition-fast);
          pointer-events: none;
        }
        .card-wrapper:hover .unarchive-overlay {
          opacity: 1;
          pointer-events: auto;
        }
        .unarchive-btn {
          background-color: var(--color-bg-primary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--spacing-xs) var(--spacing-sm);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .unarchive-btn:hover {
          background-color: var(--color-accent);
          color: var(--color-on-accent);
          border-color: var(--color-accent);
        }
        .card-wrapper {
          position: relative;
        }
        /* In-progress glow animation */
        @keyframes in-progress-glow {
          0%, 100% { box-shadow: 0 0 4px 1px var(--color-accent-glow); }
          50% { box-shadow: 0 0 8px 2px var(--color-accent-glow); }
        }
        .bead-card--in-progress {
          animation: in-progress-glow var(--animation-glow-duration, 2.5s) ease-in-out infinite;
        }
        /* Reduced motion: disable animations */
        @media (prefers-reduced-motion: reduce) {
          .bead-card--in-progress {
            animation: none;
            box-shadow: 0 0 4px 1px var(--color-accent-glow);
          }
        }
      </style>
      <div class="card-wrapper">
        <div class="bead-card${isArchived ? ' bead-card--archived' : ''}${isInProgress ? ' bead-card--in-progress' : ''}">
          <div class="card-header">
            <span class="bead-id">${beadId}</span>
            <abacus-priority-badge priority="${priority}"></abacus-priority-badge>
            <abacus-type-badge type="${type}"></abacus-type-badge>
            <span class="bead-title" title="${escapedTitle}">${escapedTitle}</span>
            ${isArchived ? '<span class="archived-badge">Archived</span>' : ''}
          </div>
          <div class="card-footer">
            <div class="labels">${labelsHtml}</div>
            ${assignee ? `<abacus-avatar-badge name="${this.escapeHtml(assignee)}"></abacus-avatar-badge>` : ''}
          </div>
        </div>
        ${isArchived ? `
          <div class="unarchive-overlay">
            <button class="unarchive-btn">Unarchive</button>
          </div>
        ` : ''}
      </div>
    `;

    this.shadowRoot.querySelector('.bead-card').addEventListener('click', (e) => {
      // Don't trigger bead-select if clicking unarchive button
      if (e.target.closest('.unarchive-btn')) return;
      this.emit('bead-select', { beadId: this.getAttribute('bead-id') });
    });

    // Handle unarchive button click
    const unarchiveBtn = this.shadowRoot.querySelector('.unarchive-btn');
    if (unarchiveBtn) {
      unarchiveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.emit('bead-unarchive', { beadId: this.getAttribute('bead-id') });
      });
    }
  }
}

customElements.define('abacus-bead-card', AbacusBeadCard);
