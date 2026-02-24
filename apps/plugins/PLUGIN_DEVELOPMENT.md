# Plugin Development Guide

This guide explains how to create plugins for the NOWCRM Plugins Service. Plugins can be written in either Node.js (TypeScript/JavaScript) or Python.

## Table of Contents

- [Overview](#overview)
- [Node.js Plugins](#nodejs-plugins)
- [Python Plugins](#python-plugins)
- [Plugin Structure](#plugin-structure)
- [Publishing Plugins](#publishing-plugins)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Overview

Plugins extend the functionality of the NOWCRM system. They are installed automatically by the Plugins Service on startup based on configuration. Plugins can:

- Add new API endpoints
- Integrate with external services
- Provide custom business logic
- Extend data models
- Add new features

### Plugin Types

- **Node.js Plugins**: Written in TypeScript/JavaScript, installed via npm
- **Python Plugins**: Written in Python, installed via pip

## Node.js Plugins

### Requirements

- Node.js 20+ and npm/pnpm
- TypeScript (recommended)
- Package must be publishable to npm or GitHub npm registry

### Basic Structure

```
your-plugin/
├── package.json
├── tsconfig.json          # Optional, for TypeScript
├── src/
│   ├── index.ts          # Main entry point
│   ├── types.ts          # Type definitions
│   └── handlers/         # Plugin handlers
│       └── example-handler.ts
├── README.md
└── .npmrc                 # For GitHub packages (if private)
```

### package.json Example

```json
{
  "name": "@nowcrm/your-plugin-name",
  "version": "1.0.0",
  "description": "Description of your plugin",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "nowcrm",
    "plugin"
  ],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "@nowcrm/services": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.9.2",
    "@types/node": "^20.19.9"
  },
  "files": [
    "dist",
    "README.md"
  ]
}
```

### Entry Point (src/index.ts)

```typescript
import type { Plugin } from '@nowcrm/services';

export interface PluginConfig {
  apiKey?: string;
  endpoint?: string;
}

export const plugin: Plugin = {
  name: '@nowcrm/your-plugin-name',
  version: '1.0.0',
  
  // Called when plugin is initialized
  initialize: async (config: PluginConfig) => {
    console.log('Plugin initialized with config:', config);
    
    // Initialize your plugin here
    // Set up connections, load configuration, etc.
    
    return {
      status: 'ready',
      endpoints: ['/api/your-plugin/example'],
    };
  },
  
  // Called when plugin is shut down
  shutdown: async () => {
    console.log('Plugin shutting down');
    // Clean up resources
  },
  
  // Register API routes (if applicable)
  registerRoutes: (app: Express) => {
    app.get('/api/your-plugin/example', (req, res) => {
      res.json({ message: 'Hello from your plugin!' });
    });
  },
  
  // Plugin metadata
  metadata: {
    description: 'Description of your plugin',
    author: 'Your Name',
    homepage: 'https://github.com/your-org/your-plugin',
  },
};

export default plugin;
```

### TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Python Plugins

### Requirements

- Python 3.9+
- setuptools for packaging
- Package can be:
  - Published to PyPI or private repository
  - Hosted in a Git repository (GitHub, GitLab, etc.)
  - Part of a monorepo with subdirectory support

### Basic Structure

```
your-plugin/
├── setup.py              # or pyproject.toml
├── your_plugin/
│   ├── __init__.py
│   ├── plugin.py
│   └── handlers/
│       └── example_handler.py
├── README.md
└── requirements.txt
```

### setup.py Example

```python
from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="nowcrm-your-plugin-name",
    version="1.0.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="Description of your plugin",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/your-org/your-plugin",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.9",
    install_requires=[
        "requests>=2.31.0",
    ],
)
```

### Alternative: pyproject.toml

```toml
[build-system]
requires = ["setuptools>=61.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "nowcrm-your-plugin-name"
version = "1.0.0"
description = "Description of your plugin"
readme = "README.md"
requires-python = ">=3.9"
license = {text = "MIT"}
authors = [
    {name = "Your Name", email = "your.email@example.com"}
]
dependencies = [
    "requests>=2.31.0",
]

[project.urls]
Homepage = "https://github.com/your-org/your-plugin"
```

### Entry Point (your_plugin/__init__.py)

```python
"""NOWCRM Plugin - Your Plugin Name"""

from typing import Dict, Any, Optional
from .plugin import Plugin

__version__ = "1.0.0"
__all__ = ["Plugin", "plugin"]

class Plugin:
    """Main plugin class"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.name = "nowcrm-your-plugin-name"
        self.version = __version__
        self.config = config or {}
    
    def initialize(self) -> Dict[str, Any]:
        """Initialize the plugin"""
        print(f"Plugin {self.name} v{self.version} initialized")
        
        # Initialize your plugin here
        # Set up connections, load configuration, etc.
        
        return {
            "status": "ready",
            "endpoints": ["/api/your-plugin/example"],
        }
    
    def shutdown(self) -> None:
        """Shutdown the plugin"""
        print(f"Plugin {self.name} shutting down")
        # Clean up resources
    
    def register_routes(self, app) -> None:
        """Register API routes (if using Flask/FastAPI)"""
        @app.route("/api/your-plugin/example")
        def example_handler():
            return {"message": "Hello from your Python plugin!"}
    
    @property
    def metadata(self) -> Dict[str, str]:
        """Plugin metadata"""
        return {
            "description": "Description of your plugin",
            "author": "Your Name",
            "homepage": "https://github.com/your-org/your-plugin",
        }

# Plugin instance (can be imported by the plugin service)
plugin = Plugin()
```

### Plugin Module (your_plugin/plugin.py)

```python
"""Plugin implementation"""

class PluginHandler:
    """Example plugin handler"""
    
    def __init__(self, config: dict):
        self.config = config
    
    def process(self, data: dict) -> dict:
        """Process data"""
        # Your plugin logic here
        return {"processed": True, "data": data}
```

## Plugin Structure

### Required Components

1. **Entry Point**: Main file that exports plugin interface
2. **Configuration**: Support for environment-based configuration
3. **Error Handling**: Proper error handling and logging
4. **Documentation**: README with usage instructions

### Recommended Structure

```
your-plugin/
├── src/                    # Source code
│   ├── index.ts           # Entry point (Node.js)
│   ├── types.ts           # Type definitions
│   ├── config.ts          # Configuration
│   ├── handlers/          # Request handlers
│   └── utils/             # Utilities
├── tests/                  # Tests
│   ├── unit/
│   └── integration/
├── docs/                   # Documentation
├── .github/                # GitHub workflows
│   └── workflows/
│       └── publish.yml
├── package.json           # Node.js
├── setup.py               # Python
├── tsconfig.json          # TypeScript
├── .gitignore
├── README.md
└── LICENSE
```

## Publishing Plugins

### Node.js Plugins

#### Publishing to GitHub npm Registry

1. **Create GitHub Personal Access Token**
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Create token with `read:packages` and `write:packages` permissions

2. **Configure .npmrc**
   ```ini
   @nowcrm:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=YOUR_TOKEN
   ```

3. **Update package.json**
   ```json
   {
     "publishConfig": {
       "registry": "https://npm.pkg.github.com"
     }
   }
   ```

4. **Publish**
   ```bash
   npm publish
   ```

#### Publishing to Public npm

```bash
npm login
npm publish
```

### Python Plugins

#### Publishing to PyPI

1. **Install build tools**
   ```bash
   pip install build twine
   ```

2. **Build package**
   ```bash
   python -m build
   ```

3. **Upload to PyPI**
   ```bash
   twine upload dist/*
   ```

#### Publishing to Private Repository

1. **Configure pip index**
   ```bash
   pip install --index-url https://your-private-repo.com/simple your-plugin
   ```

2. **Set environment variable**
   ```bash
   export PLUGINS_PIP_INDEX_URL=https://your-private-repo.com/simple
   ```

#### Installing from Git Repository

Python plugins can be installed directly from Git repositories, which is especially useful for:
- Monorepo structures with multiple packages
- Development/testing before publishing
- Private repositories

**Format:**
```
python:git+https://github.com/org/repo@branch#subdirectory=path/to/package
```

**Examples:**
```bash
# Install from main branch
PLUGINS_PACKAGE_NAMES="python:git+https://github.com/nowtec/nowCRM-plugins@main#subdirectory=packages/pkg_a"

# Install from specific tag/version
PLUGINS_PACKAGE_NAMES="python:git+https://github.com/nowtec/nowCRM-plugins@v1.0.0#subdirectory=packages/pkg_a"

# Install from specific commit
PLUGINS_PACKAGE_NAMES="python:git+https://github.com/nowtec/nowCRM-plugins@abc123def#subdirectory=packages/pkg_a"
```

**For Private Repositories:**
- Set `PLUGINS_NPMRC_TOKEN` with your GitHub Personal Access Token
- The token will be automatically injected into the Git URL
- Token must have `repo` scope for private repositories

**Monorepo Structure:**
```
nowCRM-plugins/
├── packages/
│   ├── pkg_a/
│   │   ├── setup.py
│   │   └── your_plugin/
│   └── pkg_b/
│       ├── setup.py
│       └── another_plugin/
└── README.md
```

Each subdirectory should have its own `setup.py` or `pyproject.toml` file.

## Best Practices

### 1. Versioning

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### 2. Configuration

- Use environment variables for sensitive data
- Provide sensible defaults
- Validate configuration on initialization
- Document all configuration options

### 3. Error Handling

```typescript
// Node.js example
try {
  await initializePlugin();
} catch (error) {
  logger.error({ error }, 'Failed to initialize plugin');
  throw new PluginInitializationError('Plugin failed to start', error);
}
```

```python
# Python example
try:
    plugin.initialize()
except Exception as e:
    logger.error(f"Failed to initialize plugin: {e}")
    raise PluginInitializationError(f"Plugin failed to start: {e}")
```

### 4. Logging

- Use structured logging
- Include context in log messages
- Log at appropriate levels (debug, info, warn, error)

### 5. Testing

- Write unit tests for core functionality
- Include integration tests
- Test error scenarios
- Aim for >80% code coverage

### 6. Documentation

- Clear README with examples
- API documentation
- Configuration guide
- Changelog

### 7. Security

- Never commit secrets
- Validate all inputs
- Use parameterized queries for databases
- Follow OWASP guidelines

## Examples

### Node.js Plugin Example

```typescript
// src/index.ts
import express from 'express';
import { Plugin } from '@nowcrm/services';

export const plugin: Plugin = {
  name: '@nowcrm/example-plugin',
  version: '1.0.0',
  
  initialize: async (config) => {
    // Initialize database connection, API clients, etc.
    return { status: 'ready' };
  },
  
  registerRoutes: (app: express.Application) => {
    app.get('/api/example/hello', (req, res) => {
      res.json({ message: 'Hello from example plugin!' });
    });
  },
  
  shutdown: async () => {
    // Cleanup
  },
};
```

### Python Plugin Example

```python
# your_plugin/__init__.py
from flask import Flask

class Plugin:
    def __init__(self):
        self.name = "nowcrm-example-plugin"
        self.version = "1.0.0"
    
    def initialize(self):
        return {"status": "ready"}
    
    def register_routes(self, app: Flask):
        @app.route('/api/example/hello')
        def hello():
            return {"message": "Hello from Python plugin!"}
    
    def shutdown(self):
        pass

plugin = Plugin()
```

## Plugin Service Configuration

To use your plugin, add it to the Plugins Service configuration:

```bash
# For Node.js plugin
PLUGINS_PACKAGE_NAMES="node:@nowcrm/your-plugin-name@1.0.0"

# For Python plugin
PLUGINS_PACKAGE_NAMES="python:nowcrm-your-plugin-name@1.0.0"

# Mixed
PLUGINS_PACKAGE_NAMES="node:@nowcrm/plugin-one,python:nowcrm-plugin-two"
```

## Support

For questions or issues:
- Open an issue in the plugin repository
- Check the [NOWCRM documentation](https://docs.nowcrm.com)
- Contact the plugin maintainers

## License

Plugins should include a LICENSE file. Common choices:
- MIT License (permissive)
- Apache 2.0 (permissive with patent grant)
- GPL v3 (copyleft)

Choose a license that fits your project's needs.
