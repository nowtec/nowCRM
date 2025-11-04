# App Generator Script

This script generates a new Node.js microservice application in the `/apps` directory with a complete, production-ready setup following NOWCRM's architecture and conventions.

## What is this?

The `generate-app` script is a template-based generator that creates a new Node.js microservice application with all the necessary boilerplate code, configuration files, and dependencies pre-configured. It's designed to quickly bootstrap new microservices that follow the project's standards and best practices.

## When to use this

**Use this generator when you need to create a new Node.js microservice** for the NOWCRM project. The generated application includes:

- Express.js server setup
- TypeScript configuration
- Pino logging system
- Biome linting configuration
- Security middleware (Helmet, rate limiting)
- Error handling middleware
- Health check endpoints
- OpenAPI documentation setup
- Docker configuration
- tsup build configuration
- Environment variable validation with Envalid

## Usage

### Basic Usage

```bash
pnpm generate-app <app-name> [description]
```

### Examples

```bash
# Generate a new microservice named "user-service"
pnpm generate-app user-service "User management microservice"

# Generate a new microservice named "notification-service"
pnpm generate-app notification-service
```

### Requirements

- **App name is required** - The script will show an error if no name is provided
- App name should be in kebab-case (e.g., `my-service`, `user-auth`)
- Description is optional but recommended

## What gets generated

The script creates a complete application structure in `/apps/<app-name>`:

```
apps/<app-name>/
├── src/
│   ├── index.ts                 # Application entry point
│   ├── server.ts                # Express server setup
│   ├── logger.ts                # Pino logger configuration
│   ├── api/
│   │   └── healthCheck/         # Health check endpoints
│   ├── api-docs/                # OpenAPI documentation setup
│   └── common/
│       ├── middleware/          # Error handling, rate limiting, request logging
│       └── utils/               # Environment configuration
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── biome.json                   # Biome linting configuration
├── tsup.config.ts               # Build configuration
├── Dockerfile                   # Docker configuration
└── .gitignore                   # Git ignore rules
```

## Features

### Automatic Configuration

- **Template variable replacement**: All `{{APP_NAME}}`, `{{APP_NAME_KEBAB}}`, and `{{NODE_APP}}` placeholders are automatically replaced with your app name
- **Environment variables**: All `NODE_APP_*` variables are replaced with your app name in uppercase (e.g., `MY_SERVICE_HOST`, `MY_SERVICE_PORT`)
- **Path fixes**: tsconfig.json paths are automatically corrected for the monorepo structure
- **Dependency installation**: Automatically runs `pnpm install` after generation

### Included Dependencies

The generated app comes with:

- **express** - Web server framework
- **pino**, **pino-http**, **pino-pretty** - Logging system
- **helmet** - Security headers
- **express-rate-limit** - Rate limiting middleware
- **http-status-codes** - HTTP status code constants
- **zod** - Schema validation
- **envalid** - Environment variable validation
- **tsup** - TypeScript bundler
- **@biomejs/biome** - Linting and formatting
- **@nowcrm/services** - Shared services library

## Generated Files Details

### Server Setup (`src/server.ts`)

- Express server with security middleware
- Rate limiting configured
- Request logging with Pino
- Health check endpoints
- OpenAPI documentation router
- Error handling middleware

### Environment Configuration (`src/common/utils/env-config.ts`)

Pre-configured environment variables with validation:
- `{APP_NAME}_HOST` - Server host
- `{APP_NAME}_PORT` - Server port
- `{APP_NAME}_CORS_ORIGIN` - CORS origin
- `{APP_NAME}_COMMON_RATE_LIMIT_MAX_REQUESTS` - Rate limit configuration

### TypeScript Configuration

- Configured for Node.js with ESNext modules
- Path aliases set up (`@/*` for `src/*`)
- References to `@nowcrm/services` library
- Proper path references for monorepo structure

## After Generation

Once the app is generated, you can:

1. Navigate to your app:
   ```bash
   cd apps/<app-name>
   ```

2. Start development:
   ```bash
   pnpm dev
   ```

3. Build for production:
   ```bash
   pnpm build
   ```

4. Run the production server:
   ```bash
   pnpm start
   ```

## Customization

After generation, you can customize:

- Add additional API routes in `src/api/`
- Modify middleware in `src/common/middleware/`
- Update environment variables in `src/common/utils/env-config.ts`
- Add new dependencies in `package.json`
- Configure Docker settings in `Dockerfile`

## Troubleshooting

### Error: "App already exists"

If you see this error, the app directory already exists. Choose a different name or remove the existing directory.

### Error: "App name is required"

Make sure you provide an app name as the first argument:
```bash
pnpm generate-app my-service
```

### Dependencies installation fails

If automatic `pnpm install` fails, you can manually run:
```bash
pnpm install
```

## Script Location

The generator script is located at:
```
scripts/generate-app/index.ts
```

Templates are located at:
```
scripts/generate-app/templates/node/
```

## Notes

- The script automatically handles workspace configuration
- All generated files follow NOWCRM coding standards
- The generated app is ready for immediate development
- Docker configuration is included for containerization

