# Contributing to Abacus

Thank you for your interest in contributing to Abacus! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful and constructive. We're all here to build something useful.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/haal-laah/abacus.git
cd abacus

# Install dependencies
npm install

# Start development server
npm run dev
```

### Project Structure

```
abacus/
├── public/
│   ├── components/      # Web Components (Shadow DOM)
│   │   ├── base.js      # Base class for all components
│   │   ├── abacus-*.js  # Individual components
│   ├── styles/          # CSS tokens, fonts
│   ├── themes/          # Theme CSS files
│   ├── images/          # Static images
│   ├── app.js           # Frontend application logic
│   └── index.html       # Entry point
├── server.js            # Node.js HTTP server + API
└── package.json
```

## Development Workflow

### Making Changes

1. **Create a branch** from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/your-feature
   # or
   git checkout -b fix/your-bugfix
   ```

2. **Make your changes** following our coding standards

3. **Commit your changes** using conventional commits:
   ```bash
   git commit -m "feat: add new kanban filter"
   git commit -m "fix: resolve theme persistence issue"
   ```

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only

- `refactor` - Code change that neither fixes a bug nor adds a feature
- `style` - CSS/styling changes
- `chore` - Maintenance tasks

**Scopes:**
- `server` - Backend/API changes
- `ui` - Frontend UI changes
- `components` - Web component changes
- `themes` - Theme-related changes


### Pull Requests

1. Push your branch to GitHub
2. Open a Pull Request against `develop`
3. Fill out the PR template
4. Request review

## Code Style

### JavaScript/Web Components

```javascript
// Use ES modules
import { AbacusElement } from './base.js';

// Extend the base class for components
class AbacusMyComponent extends AbacusElement {
  // Use private fields with underscore prefix
  _myPrivateField = null;

  // Implement render() for Shadow DOM content
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        /* Component styles */
      </style>
      <div class="my-component">
        <!-- HTML -->
      </div>
    `;
    this._attachEventListeners();
  }

  // Always escape user content
  renderUserContent(text) {
    return this.escapeHtml(text);
  }
}

customElements.define('abacus-my-component', AbacusMyComponent);
```

### CSS

Use CSS custom properties (design tokens) from `styles/tokens.css`:

```css
.my-class {
  /* Colors */
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
  
  /* Spacing */
  padding: var(--spacing-md);
  gap: var(--spacing-sm);
  
  /* Borders */
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  
  /* Transitions */
  transition: background-color var(--transition-fast);
}
```

### Server Code

```javascript
// API routes go in the apiRoutes object
const apiRoutes = {
  'GET /api/my-endpoint': (req, pathParts, query) => {
    // Return data or { error, status }
    return { data: 'something' };
  },
};
```

## Adding Features

### New Web Component

1. Create `public/components/abacus-my-component.js`:
   ```javascript
   import { AbacusElement } from './base.js';

   class AbacusMyComponent extends AbacusElement {
     render() {
       this.shadowRoot.innerHTML = `
         <style>/* styles */</style>
         <div><!-- content --></div>
       `;
     }
   }

   customElements.define('abacus-my-component', AbacusMyComponent);
   ```

2. Import in `public/app.js`:
   ```javascript
   import './components/abacus-my-component.js';
   ```

3. Use in HTML or other components:
   ```html
   <abacus-my-component></abacus-my-component>
   ```

### New API Endpoint

1. Add route handler in `server.js`:
   ```javascript
   'GET /api/my-endpoint': (req, pathParts, query) => {
     return { result: 'data' };
   },
   ```

2. Add route matching in `handleApiRequest()`:
   ```javascript
   if (method === 'GET' && pathname === '/api/my-endpoint') {
     routeKey = 'GET /api/my-endpoint';
   }
   ```

### New Theme

1. Create `public/themes/mytheme.css`:
   ```css
   [data-theme="mytheme"] {
     --color-bg-primary: #ffffff;
     --color-text-primary: #000000;
     /* ... all required tokens */
   }
   ```

2. Import in `public/index.html`:
   ```html
   <link rel="stylesheet" href="themes/mytheme.css">
   ```

3. Add to theme cycle in `public/app.js`

4. Add label in `public/components/abacus-header.js`

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas

Thank you for contributing!
