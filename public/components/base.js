/**
 * AbacusElement - Base class for all Abacus Web Components
 * 
 * Provides:
 * - Shadow DOM attachment (open mode)
 * - emit() helper for Shadow DOM crossing events
 * - escapeHtml() for XSS prevention
 * - getTheme() helper
 */
export class AbacusElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  /**
   * Override this method in derived classes to provide component HTML
   */
  render() {
    // Base implementation - override in subclasses
  }

  /**
   * Dispatch a custom event that crosses Shadow DOM boundaries
   * @param {string} eventName - Name of the event
   * @param {object} detail - Event payload
   */
  emit(eventName, detail = {}) {
    this.dispatchEvent(new CustomEvent(eventName, {
      bubbles: true,
      composed: true,  // CRITICAL: crosses shadow boundary
      detail
    }));
  }

  /**
   * Get current theme from document
   * @returns {string} 'light' or 'dark'
   */
  getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  /**
   * Escape HTML to prevent XSS attacks
   * MUST be used for all user-provided content rendered via innerHTML
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Optional: Adopt styles using Constructable Stylesheets
   * NOTE: Not used in this migration - all components use inline <style> instead
   * @param {string} cssText - CSS to adopt
   */
  adoptStyles(cssText) {
    if (this.shadowRoot.adoptedStyleSheets !== undefined) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(cssText);
      this.shadowRoot.adoptedStyleSheets = [sheet];
    } else {
      // Fallback for older browsers
      const style = document.createElement('style');
      style.textContent = cssText;
      this.shadowRoot.appendChild(style);
    }
  }
}
