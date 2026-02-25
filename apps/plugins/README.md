# Plugins Service

A microservice for managing and loading plugins from GitHub npm packages.

## Overview

The Plugins service downloads and initializes plugins from GitHub npm packages on startup. It reads configuration from environment variables to determine which plugins to install and uses an npmrc token for authentication with private GitHub packages.

## Features

- Automatic plugin download and installation on startup
- Support for GitHub npm packages (public and private)
- Configurable plugin list via environment variables
- Plugin version pinning support
- Health check endpoint

## Environment Variables

### Required

- `PLUGINS_NPMRC_TOKEN` - GitHub npm token for accessing private packages
- `PLUGINS_PACKAGE_NAMES` - Comma-separated list of plugin package names (e.g., `@org/plugin1,@org/plugin2@1.0.0`)

### Optional

- `PLUGINS_PORT` - Port to run the service on (default: 3030)
- `PLUGINS_HOST` - Hostname for the service (default: localhost)
- `PLUGINS_INSTALL_DIR` - Directory to install plugins (default: ./plugins)
- `PLUGINS_CORS_ORIGIN` - CORS origin (default: http://localhost:3000)
- `PLUGINS_COMMON_RATE_LIMIT_MAX_REQUESTS` - Rate limit max requests (default: 100)
- `NODE_ENV` - Environment (development, production, test)
- `API_GATEWAY` - API Gateway URL (default: http://localhost:8080/)
- `PLUGINS_STRAPI_API_TOKEN` - Strapi API token
- `STRAPI_URL` - Strapi URL (default: http://localhost:1337/api)

## Plugin Package Format

Plugins are specified in the `PLUGINS_PACKAGE_NAMES` environment variable as a comma-separated list:

### Node.js Plugins
```
PLUGINS_PACKAGE_NAMES="node:@nowcrm/plugin-one,node:@nowcrm/plugin-two@1.2.3,@nowcrm/plugin-three"
```

- Type prefix `node:` is optional - defaults to Node.js if not specified
- Package names can include version specifiers using `@version`
- If no version is specified, the latest version will be installed
- Packages are installed from GitHub npm registry (`@nowcrm` scope) or public npm registry

### Python Plugins

#### From PyPI
```
PLUGINS_PACKAGE_NAMES="python:requests,python:django@4.2.0,python:flask"
```

- Type prefix `python:` is required for Python packages
- Package names can include version specifiers using `@version` (installed as `==version` in pip)
- If no version is specified, the latest version will be installed
- Packages are installed in a Python virtual environment
- Uses pip with configurable index URL (default: PyPI)

#### From GitHub Git Repository
```
PLUGINS_PACKAGE_NAMES="python:git+https://github.com/nowtec/nowCRM-plugins@main#subdirectory=packages/pkg_a"
```

- Use `git+https://` prefix for Git-based installations
- Format: `git+https://github.com/org/repo@branch#subdirectory=path/to/package`
- Supports subdirectory installations for monorepos
- Private repositories: GitHub token from `PLUGINS_NPMRC_TOKEN` is automatically injected
- Branch/tag can be specified after `@` (e.g., `@main`, `@v1.0.0`)
- Subdirectory can be specified after `#subdirectory=` for monorepo packages

### Mixed Format
```
PLUGINS_PACKAGE_NAMES="node:@nowcrm/plugin-one,python:requests,node:@nowcrm/plugin-two@1.0.0,python:git+https://github.com/nowtec/nowCRM-plugins@main#subdirectory=packages/pkg_a"
```

You can mix Node.js and Python plugins (from PyPI or Git) in the same configuration.

## Installation

### Node.js Plugins
Node.js plugins are installed in the directory specified by `PLUGINS_INSTALL_DIR` (default: `./plugins`). The service:

1. Creates the plugins directory if it doesn't exist
2. Initializes a `package.json` file
3. Creates an `.npmrc` file with the GitHub token (if provided)
4. Installs all specified Node.js plugins using `npm install`
5. Loads and initializes the installed plugins

### Python Plugins
Python plugins are installed in a virtual environment specified by `PLUGINS_PYTHON_VENV_DIR` (default: `./plugins/python-venv`). The service:

1. Creates the virtual environment if it doesn't exist
2. Installs all specified Python plugins using `pip install`
3. Uses the configured pip index URL (default: PyPI)
4. Loads and initializes the installed plugins

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build
pnpm build

# Start production server
pnpm start

# Lint
pnpm lint

# Format
pnpm format
```

## API Endpoints

### Health Check

```
GET /health-check
```

Returns the health status of the service.

## Architecture

The service follows the same structure as other microservices in the monorepo:

```
apps/plugins/src/
├── api/              # API routes
├── common/           # Common utilities and middleware
│   ├── middleware/   # Express middleware
│   └── utils/        # Utility functions
├── lib/              # Core functionality
│   └── plugin-manager.ts  # Plugin download and initialization logic
├── index.ts          # Application entry point
└── server.ts         # Express server setup
```

## Docker

The service includes a Dockerfile for containerized deployment. It follows the same multi-stage build pattern as other services in the monorepo.

## Notes

- Plugins are installed using npm in the specified directory
- The service continues to start even if plugin installation fails (errors are logged)
- Private GitHub packages require a valid npmrc token
- Plugin loading happens asynchronously on startup

## Creating Plugins

For detailed information on how to create plugins for this service, see [PLUGIN_DEVELOPMENT.md](./PLUGIN_DEVELOPMENT.md).

The guide covers:
- Creating Node.js plugins (TypeScript/JavaScript)
- Creating Python plugins
- Plugin structure and best practices
- Publishing to npm/GitHub npm or PyPI
- Examples and templates
