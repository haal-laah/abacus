import { AbacusModal } from './abacus-modal.js';
import './abacus-dependency-graph.js';

class AbacusBeadDetailModal extends AbacusModal {
  static get observedAttributes() {
    return [...AbacusModal.observedAttributes, 'bead', 'project-id'];
  }

  constructor() {
    super();
    this._bead = null;
    this._projectId = null;
    this._comments = [];
    this._loadingComments = false;
    this._showGraph = false;
    this._chainData = null;
    this._loadingGraph = false;
    this._graphError = false;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'bead') {
      try {
        this._bead = JSON.parse(newVal || 'null');
        // Reset graph state when bead changes
        this._showGraph = false;
        this._chainData = null;
        this._graphError = false;
        // Fetch comments when bead changes
        if (this._bead && this._projectId) {
          this._fetchComments();
        }
      } catch (e) {
        this._bead = null;
      }
    } else if (name === 'project-id') {
      this._projectId = newVal;
    }
    super.attributeChangedCallback(name, oldVal, newVal);
  }

  connectedCallback() {
    // Set xlarge size for the two-panel layout
    this.setAttribute('size', 'xlarge');
    super.connectedCallback();
  }

  async _fetchComments() {
    if (!this._bead || !this._projectId) return;

    this._loadingComments = true;
    this._comments = [];
    this.render();

    try {
      const response = await fetch(`/api/projects/${this._projectId}/beads/${this._bead.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        this._comments = data.comments || [];
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      this._loadingComments = false;
      this.render();
    }
  }

  async _fetchDependencyChain() {
    if (!this._bead || !this._projectId) return;

    this._loadingGraph = true;
    this._graphError = false;
    this.render();

    try {
      const response = await fetch(`/api/projects/${this._projectId}/beads/${this._bead.id}/dependencies`);
      if (response.ok) {
        this._chainData = await response.json();
        this._graphError = false;
      } else {
        console.error('Failed to fetch dependency chain:', response.status);
        this._chainData = null;
        this._graphError = true;
      }
    } catch (error) {
      console.error('Failed to fetch dependency chain:', error);
      this._chainData = null;
      this._graphError = true;
    } finally {
      this._loadingGraph = false;
      this._showGraph = true;
      this.render();
    }
  }

  _handleViewGraph() {
    this._fetchDependencyChain();
  }

  _handleCloseGraph() {
    this._showGraph = false;
    this._chainData = null;
    this.render();
  }

  _formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  _formatRelativeTime(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  _formatStatus(status) {
    const map = { 'open': 'Open', 'in_progress': 'In Progress', 'blocked': 'Blocked', 'closed': 'Closed' };
    return map[status] || status;
  }

  renderHeader() {
    return this._bead ? this.escapeHtml(this._bead.title) : 'Bead Details';
  }

  _renderDependencyBadge(dep) {
    const status = dep.targetStatus || 'unknown';
    const statusIndicator = status === 'closed' ? '✓' : '●';
    return `
      <span class="dependency dependency--${status}" data-bead-id="${this.escapeHtml(dep.target)}">
        <span class="status-indicator">${statusIndicator}</span>
        ${this.escapeHtml(dep.target)}
      </span>
    `;
  }

  _renderDependencies() {
    const b = this._bead;
    const blockedBy = (b.dependencies || []).filter(d => d.type === 'blocked_by');
    const blocks = (b.dependencies || []).filter(d => d.type === 'blocks');
    const hasDeps = blockedBy.length > 0 || blocks.length > 0;

    const hasBlockers = blockedBy.some(d => d.targetStatus && d.targetStatus !== 'closed');
    const headerIcon = hasBlockers ? '⚠️ ' : '';

    let html = `
      <div class="dep-header">
        <h4>${headerIcon}Dependencies</h4>
        ${hasDeps ? '<button class="view-graph-btn" id="view-graph-btn">View Dependency Graph →</button>' : ''}
      </div>
    `;

    if (blockedBy.length > 0) {
      html += `
        <p class="dep-explanation">This bead cannot proceed until these are complete:</p>
        <div class="dep-list">${blockedBy.map(d => this._renderDependencyBadge(d)).join('')}</div>
      `;
    }

    if (blocks.length > 0) {
      html += `
        <p class="dep-explanation">Completing this bead will unblock:</p>
        <div class="dep-list">${blocks.map(d => this._renderDependencyBadge(d)).join('')}</div>
      `;
    }

    if (!hasDeps) {
      html += '<p class="empty-deps">None</p>';
    }

    return html;
  }

  _renderComments() {
    if (this._loadingComments) {
      return '<p class="comments-loading">Loading comments...</p>';
    }

    if (!this._comments || this._comments.length === 0) {
      return '<p class="empty-state">No comments yet</p>';
    }

    return this._comments.map(c => `
      <div class="comment">
        <div class="comment-header">
          <span class="comment-author">${this.escapeHtml(c.author || 'Anonymous')}</span>
          <span class="comment-time">${this._formatRelativeTime(c.created_at)}</span>
        </div>
        <div class="comment-content">${this.escapeHtml(c.content || '')}</div>
      </div>
    `).join('');
  }

  renderBody() {
    if (!this._bead) return '<p>No bead data</p>';

    // Show loading state for graph
    if (this._loadingGraph) {
      return `
        <style>
          .loading-graph {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 300px;
            color: var(--color-text-muted);
          }
        </style>
        <div class="loading-graph">Loading dependency graph...</div>
      `;
    }

    // Show error state for graph
    if (this._showGraph && this._graphError) {
      return `
        <style>
          .graph-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 300px;
            gap: var(--spacing-md);
            color: var(--color-text-muted);
          }
          .graph-error-icon {
            font-size: 2rem;
          }
          .graph-error-message {
            font-size: 0.875rem;
            text-align: center;
          }
          .graph-error-retry {
            background: var(--color-accent);
            color: var(--color-on-accent);
            border: none;
            border-radius: var(--radius-sm);
            padding: var(--spacing-xs) var(--spacing-md);
            font-size: 0.875rem;
            cursor: pointer;
            transition: filter var(--transition-fast);
          }
          .graph-error-retry:hover {
            filter: brightness(1.1);
          }
          .graph-error-back {
            background: none;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            padding: var(--spacing-xs) var(--spacing-md);
            font-size: 0.875rem;
            color: var(--color-text-secondary);
            cursor: pointer;
            transition: all var(--transition-fast);
          }
          .graph-error-back:hover {
            background: var(--color-bg-tertiary);
          }
          .graph-error-actions {
            display: flex;
            gap: var(--spacing-sm);
          }
        </style>
        <div class="graph-error">
          <span class="graph-error-icon">⚠️</span>
          <p class="graph-error-message">Failed to load dependency graph.<br>Please check your connection and try again.</p>
          <div class="graph-error-actions">
            <button class="graph-error-back" id="graph-error-back-btn">← Back</button>
            <button class="graph-error-retry" id="graph-error-retry-btn">Retry</button>
          </div>
        </div>
      `;
    }

    // Show graph view
    if (this._showGraph) {
      return `
        <style>
          .graph-container {
            height: calc(80vh - 140px);
            min-height: 400px;
            overflow-y: auto;
          }
        </style>
        <div class="graph-container">
          <abacus-dependency-graph
            chain='${JSON.stringify(this._chainData).replace(/'/g, "&#39;")}'
            current-bead-id="${this.escapeHtml(this._bead.id)}"
          ></abacus-dependency-graph>
        </div>
      `;
    }

    const b = this._bead;
    const labelsHtml = (b.labels || []).map(l => `<span class="label">${this.escapeHtml(l)}</span>`).join('');

    return `
      <style>
        .modal-body-layout {
          display: grid;
          grid-template-columns: 60% 40%;
          gap: var(--spacing-md);
          height: calc(80vh - 140px);
          min-height: 400px;
        }
        .details-panel {
          overflow-y: auto;
          padding-right: var(--spacing-md);
        }
        .comments-panel {
          border-left: 1px solid var(--color-border);
          padding-left: var(--spacing-md);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .comments-panel h4 {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          margin: 0 0 var(--spacing-sm) 0;
          flex-shrink: 0;
        }
        .comments-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          overflow-y: auto;
          flex: 1;
        }
        .comment {
          background: var(--color-bg-tertiary);
          padding: var(--spacing-sm);
          border-radius: var(--radius-sm);
        }
        .comment-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: var(--spacing-xs);
        }
        .comment-author {
          font-weight: 600;
          font-size: 0.8125rem;
        }
        .comment-time {
          color: var(--color-text-muted);
          font-size: 0.75rem;
        }
        .comment-content {
          color: var(--color-text-secondary);
          font-size: 0.875rem;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .comments-loading {
          color: var(--color-text-muted);
          font-style: italic;
        }
        .empty-state {
          color: var(--color-text-muted);
          font-style: italic;
        }

        @media (max-width: 768px) {
          .modal-body-layout {
            grid-template-columns: 1fr;
            height: auto;
          }
          .comments-panel {
            border-left: none;
            border-top: 1px solid var(--color-border);
            padding-left: 0;
            padding-top: var(--spacing-md);
            max-height: 300px;
          }
          .details-panel {
            padding-right: 0;
          }
        }

        .bead-detail { display: flex; flex-direction: column; gap: var(--spacing-lg); }
        .bead-detail-section { border-bottom: 1px solid var(--color-border); padding-bottom: var(--spacing-lg); }
        .bead-detail-section:last-child { border-bottom: none; padding-bottom: 0; }
        .bead-detail-section h4 { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); margin: 0 0 var(--spacing-sm) 0; }
        .bead-description { color: var(--color-text-secondary); line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
        .bead-detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-md); }
        .bead-detail-item { display: flex; flex-direction: column; gap: var(--spacing-xs); }
        .bead-detail-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); }
        .bead-detail-value { color: var(--color-text-primary); }
        .label { font-size: 0.6875rem; color: var(--color-text-secondary); background-color: var(--color-bg-tertiary); padding: 0.125rem 0.375rem; border-radius: var(--radius-sm); margin-right: var(--spacing-xs); }

        /* Dependency styles */
        .dep-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-sm); }
        .dep-header h4 { margin: 0; }
        .view-graph-btn {
          background: none;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--spacing-xs) var(--spacing-sm);
          font-size: 0.75rem;
          color: var(--color-accent);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .view-graph-btn:hover {
          background: var(--color-bg-tertiary);
          border-color: var(--color-accent);
        }
        .dep-explanation { color: var(--color-text-muted); font-size: 0.875rem; margin: 0 0 var(--spacing-sm) 0; }
        .dep-list { display: flex; flex-wrap: wrap; gap: var(--spacing-xs); margin-bottom: var(--spacing-md); }
        .empty-deps { color: var(--color-text-muted); font-style: italic; }
        .dependency {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background-color: var(--color-bg-tertiary);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }
        .dependency:hover { background-color: var(--color-border); }
        .status-indicator { font-size: 0.5rem; }
        .dependency--open .status-indicator { color: #3b82f6; }
        .dependency--in_progress .status-indicator { color: #eab308; }
        .dependency--blocked .status-indicator { color: #ef4444; }
        .dependency--closed .status-indicator { color: #22c55e; }
        .dependency--closed { opacity: 0.7; }
        .dependency--unknown .status-indicator { color: var(--color-text-muted); }

        .priority-badge, .type-badge, .status-badge { font-size: 0.6875rem; font-weight: 600; padding: 0.125rem 0.5rem; border-radius: var(--radius-sm); text-transform: uppercase; }
        .priority-badge { color: var(--color-on-accent); }
        .priority-0 { background-color: var(--color-priority-0); }
        .priority-1 { background-color: var(--color-priority-1); }
        .priority-2 { background-color: var(--color-priority-2); color: var(--color-on-warning); }
        .priority-3 { background-color: var(--color-priority-3); }
        .priority-4 { background-color: var(--color-priority-4); }
        .type-badge { color: var(--color-on-accent); }
        .type-bug { background-color: var(--color-type-bug); }
        .type-feature { background-color: var(--color-type-feature); }
        .type-task { background-color: var(--color-type-task); }
        .type-epic { background-color: var(--color-type-epic); }
        .type-chore { background-color: var(--color-type-chore); }
      </style>
      <div class="modal-body-layout">
        <div class="details-panel">
          <div class="bead-detail">
            <div class="bead-detail-section">
              <h4>Description</h4>
              <div class="bead-description">${this.escapeHtml(b.description || 'No description')}</div>
            </div>
            <div class="bead-detail-section">
              <div class="bead-detail-grid">
                <div class="bead-detail-item">
                  <span class="bead-detail-label">ID</span>
                  <span class="bead-detail-value">${this.escapeHtml(b.id)}</span>
                </div>
                <div class="bead-detail-item">
                  <span class="bead-detail-label">Status</span>
                  <span class="bead-detail-value">${this._formatStatus(b.status)}</span>
                </div>
                <div class="bead-detail-item">
                  <span class="bead-detail-label">Priority</span>
                  <span class="bead-detail-value"><span class="priority-badge priority-${b.priority}">P${b.priority}</span></span>
                </div>
                <div class="bead-detail-item">
                  <span class="bead-detail-label">Type</span>
                  <span class="bead-detail-value"><span class="type-badge type-${b.type}">${b.type}</span></span>
                </div>
                <div class="bead-detail-item">
                  <span class="bead-detail-label">Assignee</span>
                  <span class="bead-detail-value">${this.escapeHtml(b.assignee || 'Unassigned')}</span>
                </div>
                <div class="bead-detail-item">
                  <span class="bead-detail-label">Labels</span>
                  <span class="bead-detail-value">${labelsHtml || '<span class="empty-deps">None</span>'}</span>
                </div>
              </div>
            </div>
            <div class="bead-detail-section">
              ${this._renderDependencies()}
            </div>
            <div class="bead-detail-section">
              <div class="bead-detail-grid">
                <div class="bead-detail-item">
                  <span class="bead-detail-label">Created</span>
                  <span class="bead-detail-value">${this._formatDate(b.created_at)}</span>
                </div>
                <div class="bead-detail-item">
                  <span class="bead-detail-label">Updated</span>
                  <span class="bead-detail-value">${this._formatDate(b.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="comments-panel">
          <h4>Comments</h4>
          <div class="comments-list">
            ${this._renderComments()}
          </div>
        </div>
      </div>
    `;
  }

  renderFooter() {
    if (!this._bead) return '';

    const isArchived = (this._bead.labels || []).includes('archived');
    const buttonText = isArchived ? 'Unarchive' : 'Archive';
    const buttonClass = isArchived ? 'unarchive-btn' : 'archive-btn';

    return `
      <style>
        .modal-footer-content {
          display: flex;
          justify-content: flex-end;
          gap: var(--spacing-sm);
        }
        .archive-btn, .unarchive-btn {
          padding: var(--spacing-xs) var(--spacing-md);
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          border: 1px solid var(--color-border);
        }
        .archive-btn {
          background-color: var(--color-bg-tertiary);
          color: var(--color-text-secondary);
        }
        .archive-btn:hover {
          background-color: var(--color-bg-secondary);
          color: var(--color-text-primary);
        }
        .unarchive-btn {
          background-color: var(--color-accent);
          color: var(--color-on-accent);
          border-color: var(--color-accent);
        }
        .unarchive-btn:hover {
          filter: brightness(1.1);
        }
      </style>
      <div class="modal-footer-content">
        <button class="${buttonClass}" id="archive-action-btn">${buttonText}</button>
      </div>
    `;
  }

  _attachEventListeners() {
    super._attachEventListeners();

    this.shadowRoot.querySelectorAll('.dependency').forEach(dep => {
      dep.addEventListener('click', () => {
        const beadId = dep.dataset.beadId;
        if (beadId) this.emit('dependency-click', { beadId });
      });
    });

    const archiveBtn = this.shadowRoot.querySelector('#archive-action-btn');
    if (archiveBtn && this._bead) {
      const isArchived = (this._bead.labels || []).includes('archived');
      archiveBtn.addEventListener('click', () => {
        const eventName = isArchived ? 'bead-unarchive' : 'bead-archive';
        this.emit(eventName, { beadId: this._bead.id });
      });
    }

    // View dependency graph button
    const viewGraphBtn = this.shadowRoot.querySelector('#view-graph-btn');
    if (viewGraphBtn) {
      viewGraphBtn.addEventListener('click', () => this._handleViewGraph());
    }

    // Graph error state buttons
    const retryBtn = this.shadowRoot.querySelector('#graph-error-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this._handleViewGraph());
    }

    const backBtn = this.shadowRoot.querySelector('#graph-error-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => this._handleCloseGraph());
    }

    // Listen for close-graph event from dependency graph component
    const graphComponent = this.shadowRoot.querySelector('abacus-dependency-graph');
    if (graphComponent) {
      graphComponent.addEventListener('close-graph', () => this._handleCloseGraph());
      graphComponent.addEventListener('bead-select', (e) => {
        // Forward the bead-select event
        this.emit('dependency-click', { beadId: e.detail.beadId });
      });
    }
  }
}

customElements.define('abacus-bead-detail-modal', AbacusBeadDetailModal);
