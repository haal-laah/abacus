import { AbacusElement } from './base.js';

/** Maximum nodes to render for performance. Large graphs are truncated. */
const MAX_GRAPH_NODES = 50;

/**
 * AbacusDependencyGraph - Visual dependency graph for beads
 *
 * Shows a top-to-bottom flow of dependencies:
 * - Ancestors (blocked by) above the current bead
 * - Descendants (blocks) below the current bead
 * - SVG lines connecting related nodes
 */
class AbacusDependencyGraph extends AbacusElement {
  static get observedAttributes() {
    return ['chain'];
  }

  constructor() {
    super();
    this._chain = null;
    this._nodePositions = new Map();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'chain') {
      try {
        this._chain = JSON.parse(newVal || 'null');
      } catch (e) {
        this._chain = null;
      }
    }
    if (this.shadowRoot) {
      this.render();
      // Draw lines after DOM updates
      requestAnimationFrame(() => this._drawLines());
    }
  }

  connectedCallback() {
    try {
      this._chain = JSON.parse(this.getAttribute('chain') || 'null');
    } catch (e) {
      this._chain = null;
    }
    super.connectedCallback();
    // Draw lines after initial render
    requestAnimationFrame(() => this._drawLines());
  }

  _getStatusIcon(status) {
    switch (status) {
      case 'closed': return '<span class="status-icon status-closed">&#10003;</span>';
      case 'open': return '<span class="status-icon status-open">&#9679;</span>';
      case 'in_progress': return '<span class="status-icon status-in-progress">&#9655;</span>';
      case 'blocked': return '<span class="status-icon status-blocked">&#9684;</span>';
      default: return '<span class="status-icon">&#9679;</span>';
    }
  }

  _truncateTitle(title, maxLen = 20) {
    if (!title) return '';
    if (title.length <= maxLen) return this.escapeHtml(title);
    return this.escapeHtml(title.substring(0, maxLen - 1)) + '&hellip;';
  }

  _renderNode(node, isCurrent = false) {
    const statusClass = `graph-node--${node.status || 'open'}`;
    const currentClass = isCurrent ? 'graph-node--current' : '';

    return `
      <div class="graph-node ${statusClass} ${currentClass}"
           data-bead-id="${this.escapeHtml(node.id)}"
           data-depth="${node.depth || 0}"
           data-parent-id="${this.escapeHtml(node.parentId || '')}">
        <span class="node-id">${this.escapeHtml(node.id)}</span>
        <span class="node-title" title="${this.escapeHtml(node.title || '')}">${this._truncateTitle(node.title)}</span>
        ${this._getStatusIcon(node.status)}
      </div>
    `;
  }

  _groupByDepth(nodes) {
    const groups = new Map();
    for (const node of nodes) {
      const depth = node.depth || 1;
      if (!groups.has(depth)) {
        groups.set(depth, []);
      }
      groups.get(depth).push(node);
    }
    return groups;
  }

  _renderDepthRows(nodes, section) {
    if (!nodes || nodes.length === 0) return '';

    const groups = this._groupByDepth(nodes);
    const depths = Array.from(groups.keys()).sort((a, b) =>
      section === 'ancestors' ? b - a : a - b
    );

    return depths.map(depth => `
      <div class="depth-row" data-depth="${depth}" data-section="${section}">
        ${groups.get(depth).map(node => this._renderNode(node)).join('')}
      </div>
    `).join('');
  }

  _drawLines() {
    const svg = this.shadowRoot.querySelector('.graph-lines');
    if (!svg) return;

    const container = this.shadowRoot.querySelector('.graph-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const lines = [];

    // Get all nodes
    const nodes = this.shadowRoot.querySelectorAll('.graph-node');
    const nodeMap = new Map();

    nodes.forEach(node => {
      const id = node.dataset.beadId;
      const rect = node.getBoundingClientRect();
      nodeMap.set(id, {
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2,
        top: rect.top - containerRect.top,
        bottom: rect.top - containerRect.top + rect.height
      });
    });

    // Draw lines from parentId to id
    nodes.forEach(node => {
      const id = node.dataset.beadId;
      const parentId = node.dataset.parentId;

      if (parentId && nodeMap.has(parentId) && nodeMap.has(id)) {
        const parent = nodeMap.get(parentId);
        const child = nodeMap.get(id);

        // Draw from bottom of parent to top of child
        lines.push(`<line x1="${parent.x}" y1="${parent.bottom}" x2="${child.x}" y2="${child.top}" />`);
      }
    });

    svg.innerHTML = lines.join('');
  }

  _handleNodeClick(e) {
    const node = e.target.closest('.graph-node');
    if (!node) return;

    const beadId = node.dataset.beadId;
    if (beadId) {
      this.emit('bead-select', { beadId });
    }
  }

  _handleBackClick() {
    this.emit('close-graph');
  }

  render() {
    const chain = this._chain;

    if (!chain) {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; padding: var(--spacing-md); }
          .loading { color: var(--color-text-muted); text-align: center; }
        </style>
        <div class="loading">Loading dependency graph...</div>
      `;
      return;
    }

    const { bead, ancestors, descendants, hasCycle, truncated } = chain;

    const totalNodes = (ancestors?.length || 0) + (descendants?.length || 0);
    const isLargeGraph = totalNodes > MAX_GRAPH_NODES;

    let displayAncestors = ancestors || [];
    let displayDescendants = descendants || [];

    if (isLargeGraph) {
      // Distribute evenly between ancestors and descendants
      const halfMax = Math.floor(MAX_GRAPH_NODES / 2);
      displayAncestors = displayAncestors.slice(0, halfMax);
      displayDescendants = displayDescendants.slice(0, halfMax);
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .dependency-graph {
          padding: var(--spacing-md);
          position: relative;
          min-height: 300px;
        }
        .graph-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-lg);
        }
        .graph-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .back-btn {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          padding: var(--spacing-xs) var(--spacing-sm);
          cursor: pointer;
          font-size: 0.875rem;
          color: var(--color-text-primary);
          transition: all var(--transition-fast);
        }
        .back-btn:hover {
          background: var(--color-bg-hover);
        }
        .graph-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-md);
          isolation: isolate;
        }
        .graph-section {
          width: 100%;
          position: relative;
          z-index: 1;
        }
        .section-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-align: center;
          margin-bottom: var(--spacing-sm);
        }
        .depth-row {
          display: flex;
          justify-content: center;
          gap: var(--spacing-md);
          margin: var(--spacing-sm) 0;
          flex-wrap: wrap;
          position: relative;
          z-index: 1;
        }
        .graph-node {
          background: var(--color-bg-secondary);
          border: 2px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--spacing-sm);
          cursor: pointer;
          min-width: 120px;
          max-width: 180px;
          text-align: center;
          transition: all var(--transition-fast);
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          position: relative;
          z-index: 1;
        }
        .graph-node:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .graph-node--current {
          border-color: var(--color-accent);
          background: linear-gradient(rgba(20, 184, 166, 0.15), rgba(20, 184, 166, 0.15)), var(--color-bg-secondary);
          box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.2);
        }
        .graph-node--closed {
          opacity: 0.7;
        }
        .graph-node--blocked {
          border-color: var(--color-danger);
        }
        .node-id {
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 0.6875rem;
          color: var(--color-text-muted);
        }
        .node-title {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--color-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .status-icon {
          font-size: 0.75rem;
        }
        .status-closed { color: var(--color-status-closed); }
        .status-open { color: var(--color-status-open); }
        .status-in-progress { color: var(--color-status-in_progress); }
        .status-blocked { color: var(--color-status-blocked); }
        .current-bead-row {
          display: flex;
          justify-content: center;
          padding: var(--spacing-md) 0;
          position: relative;
          z-index: 1;
        }
        .graph-lines {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: visible;
          z-index: -1;
        }
        .graph-lines line {
          stroke: var(--color-border);
          stroke-width: 2;
        }
        .notice {
          text-align: center;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          padding: var(--spacing-sm);
          background: var(--color-bg-secondary);
          border-radius: var(--radius-sm);
          margin-top: var(--spacing-md);
        }
        .notice--warning {
          background: rgba(245, 158, 11, 0.1);
          color: var(--color-warning);
        }
        .separator {
          width: 60%;
          height: 1px;
          background: var(--color-border);
          margin: var(--spacing-sm) auto;
          position: relative;
          z-index: 1;
        }
      </style>

      <div class="dependency-graph">
        <div class="graph-header">
          <span class="graph-title">Dependency Graph</span>
          <button class="back-btn" id="back-btn">&larr; Back to Details</button>
        </div>

        <div class="graph-container">
          <svg class="graph-lines"></svg>

          ${displayAncestors.length > 0 ? `
            <div class="graph-section" data-section="ancestors">
              <div class="section-label">Blocked By (upstream)</div>
              ${this._renderDepthRows(displayAncestors, 'ancestors')}
            </div>
            <div class="separator"></div>
          ` : ''}

          <div class="current-bead-row">
            ${this._renderNode({ ...bead, depth: 0 }, true)}
          </div>

          ${displayDescendants.length > 0 ? `
            <div class="separator"></div>
            <div class="graph-section" data-section="descendants">
              <div class="section-label">Blocks (downstream)</div>
              ${this._renderDepthRows(displayDescendants, 'descendants')}
            </div>
          ` : ''}
        </div>

        ${hasCycle ? `
          <div class="notice notice--warning">
            &#9888; Cycle detected in dependency graph
          </div>
        ` : ''}

        ${(truncated?.ancestors || truncated?.descendants) ? `
          <div class="notice">
            Graph limited to 3 levels. More dependencies exist beyond this view.
          </div>
        ` : ''}

        ${isLargeGraph ? `
          <div class="notice notice--warning">
            Large dependency graph truncated for performance (showing ${MAX_GRAPH_NODES} of ${totalNodes} nodes).
          </div>
        ` : ''}
      </div>
    `;

    // Add event listeners
    this.shadowRoot.querySelector('#back-btn')?.addEventListener('click', () => this._handleBackClick());
    this.shadowRoot.querySelectorAll('.graph-node').forEach(node => {
      node.addEventListener('click', (e) => this._handleNodeClick(e));
    });
  }
}

customElements.define('abacus-dependency-graph', AbacusDependencyGraph);

export { AbacusDependencyGraph };
