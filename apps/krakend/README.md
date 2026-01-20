# KrakenD API Gateway Configuration

This document explains the KrakenD API Gateway configuration for NOWCRM and provides guidance on how to extend it.

## Table of Contents

- [Overview](#overview)
- [Configuration Approach](#configuration-approach)
- [Building and Deployment](#building-and-deployment)
- [Global Configuration](#global-configuration)
- [Endpoint Configuration](#endpoint-configuration)
- [Middleware & Extra Config](#middleware--extra-config)
- [Authentication & Caching](#authentication--caching)
- [Adding New Endpoints](#adding-new-endpoints)
- [Extending Configuration](#extending-configuration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

KrakenD is a high-performance API Gateway that acts as a single entry point for all backend services in the NOWCRM architecture. It provides:

- **Request routing** to multiple backend services
- **Authentication** via custom auth plugin
- **Rate limiting** to prevent abuse
- **CORS** handling for cross-origin requests
- **Response caching** to improve performance
- **Request aggregation** and transformation

### Architecture

```
Client Request
    ↓
KrakenD Gateway (Port 8080)
    ↓
    ├──→ Composer Service (Port 3020)
    ├──→ Journeys Service (Port 3010)
    ├──→ DAL Service (Port 6001)
    └──→ Strapi CMS (Port 1337)
```

## Configuration Approach

### Flexible Configuration (Runtime Environment Variables)

KrakenD uses **Flexible Configuration** with runtime environment variable substitution. This allows the same Docker image to work across different environments (Docker Compose, Kubernetes, etc.) without rebuilding.

#### How It Works

1. **Configuration Template**: `krakend.json` uses `{{ env "VARIABLE_NAME" }}` syntax for backend URLs
2. **Runtime Substitution**: Environment variables are substituted when KrakenD starts
3. **Single Image**: One Docker image works for all environments

#### Configuration Syntax

```json
{
  "backend": [
    {
      "host": ["{{ env \"KRAKEND_STRAPI_URL\" }}"]
    }
  ]
}
```

The `{{ env "VAR_NAME" }}` syntax is evaluated at runtime, not build time.

### Required Environment Variables

| Variable | Description | Example (Docker Compose) | Example (Kubernetes) |
|----------|-------------|-------------------------|---------------------|
| `FC_ENABLE` | Enable Flexible Configuration | `1` | `1` |
| `KRAKEND_STRAPI_URL` | Strapi CMS service URL | `http://strapi:1337` | `http://strapi-service.namespace.svc.cluster.local:1337` |
| `KRAKEND_DAL_URL` | DAL (Data Access Layer) service URL | `http://dal:6001` | `http://dal-service.namespace.svc.cluster.local:6001` |
| `KRAKEND_COMPOSER_URL` | Composer service URL | `http://composer:3020` | `http://composer-service.namespace.svc.cluster.local:3020` |
| `KRAKEND_JOURNEYS_URL` | Journeys service URL | `http://journeys:3010` | `http://journeys-service.namespace.svc.cluster.local:3010` |

**Note**: `FC_ENABLE=1` is automatically set in the Dockerfile, but must be set in runtime environments.

## Building and Deployment

### Dockerfile Structure

The Dockerfile uses a multi-stage build:

1. **Builder stage**: Compiles the Go auth plugin
2. **Runtime stage**: Sets up KrakenD with Flexible Configuration enabled

Key features:
- Flexible Configuration enabled via `ENV FC_ENABLE=1`
- Config file copied to `/etc/krakend/krakend.json`
- Config validated during build with dummy env vars
- Auth plugin copied to `/etc/krakend/plugins/`

### Building the Image

#### Local Build (Docker Compose)

```bash
# Build locally (no build args needed)
docker compose -f docker-compose.dev.yaml build krakend
```

#### CI/CD Build (GitHub Actions)

The GitHub Actions workflow builds the image automatically on PR merge:

```yaml
# .github/workflows/main.yaml
build-and-push-krakend:
  steps:
    - name: Build and push Docker image for Krakend
      uses: docker/build-push-action@v5
      with:
        context: ./apps/krakend
        file: ./apps/krakend/Dockerfile
        push: true
        tags: |
          ghcr.io/nowtec/nowcrm/krakend:latest
          ghcr.io/nowtec/nowcrm/krakend:${{ needs.create_release.outputs.tag_name }}
```

**No build arguments required** - the image uses runtime environment variables.

### Docker Compose Deployment

```yaml
services:
  krakend:
    container_name: krakend-nowtec
    image: krakend-nowtec  # or ghcr.io/nowtec/nowcrm/krakend:latest
    build:
      context: ./apps/krakend
      dockerfile: Dockerfile
    environment:
      FC_ENABLE: 1
      KRAKEND_STRAPI_URL: ${KRAKEND_STRAPI_URL:-http://strapi:1337}
      KRAKEND_DAL_URL: ${KRAKEND_DAL_URL:-http://dal:6001}
      KRAKEND_COMPOSER_URL: ${KRAKEND_COMPOSER_URL:-http://composer:3020}
      KRAKEND_JOURNEYS_URL: ${KRAKEND_JOURNEYS_URL:-http://journeys:3010}
    restart: unless-stopped
    ports:
      - "8080:8080"
    depends_on:
      - strapi
    networks:
      - my_net
```

### Kubernetes Deployment

#### Using Helm Chart

```yaml
# values.yaml or ArgoCD Application
image:
  repository: ghcr.io/nowtec/nowcrm/krakend
  tag: "v0.0.93"

env:
  - name: FC_ENABLE
    value: "1"
  - name: KRAKEND_STRAPI_URL
    value: "http://strapi-service.namespace.svc.cluster.local:1337"
  - name: KRAKEND_DAL_URL
    value: "http://dal-service.namespace.svc.cluster.local:6001"
  - name: KRAKEND_COMPOSER_URL
    value: "http://composer-service.namespace.svc.cluster.local:3020"
  - name: KRAKEND_JOURNEYS_URL
    value: "http://journeys-service.namespace.svc.cluster.local:3010"
```

#### Using Secrets/ConfigMaps

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: krakend-secrets
type: Opaque
stringData:
  FC_ENABLE: "1"
  KRAKEND_STRAPI_URL: "http://strapi-service.namespace.svc.cluster.local:1337"
  KRAKEND_DAL_URL: "http://dal-service.namespace.svc.cluster.local:6001"
  KRAKEND_COMPOSER_URL: "http://composer-service.namespace.svc.cluster.local:3020"
  KRAKEND_JOURNEYS_URL: "http://journeys-service.namespace.svc.cluster.local:3010"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: krakend
spec:
  template:
    spec:
      containers:
      - name: krakend
        image: ghcr.io/nowtec/nowcrm/krakend:latest
        envFrom:
        - secretRef:
            name: krakend-secrets
```

### Verifying Configuration

After deployment, verify environment variables are set:

```bash
# In Docker container
docker exec krakend-nowtec env | grep KRAKEND

# In Kubernetes pod
kubectl exec -it deployment/krakend -- env | grep KRAKEND
```

Expected output:
```
FC_ENABLE=1
KRAKEND_STRAPI_URL=http://strapi:1337
KRAKEND_DAL_URL=http://dal:6001
KRAKEND_COMPOSER_URL=http://composer:3020
KRAKEND_JOURNEYS_URL=http://journeys:3010
```

## Global Configuration

### Schema & Version

```json
"$schema": "https://www.krakend.io/schema/v2.12/krakend.json",
"version": 3
```

- **Schema**: Validates configuration against KrakenD v2.12 schema
- **Version**: Configuration format version (currently 3)

### Timeout Settings

```json
"timeout": "10000ms"
```

- **Global timeout**: Maximum time KrakenD waits for backend responses (10 seconds)
- Applies to all endpoints unless overridden per endpoint
- Format: `{number}{unit}` (e.g., `10000ms`, `5s`, `1m`)

### Cache Configuration

```json
"cache_ttl": "300s"
```

- **Global cache TTL**: Default cache duration for endpoint responses (5 minutes)
- Can be overridden per endpoint
- Cached responses are keyed by request URL and parameters

### Output Encoding

```json
"output_encoding": "json"
```

- **Default encoding**: All endpoints return JSON by default
- Can be overridden per endpoint (`json`, `xml`, `string`, `no-op`)

### Debug Features

```json
"debug_endpoint": false,
"echo_endpoint": false
```

- **Debug endpoint**: Enables `/__debug/` endpoint for troubleshooting (disabled by default)
- **Echo endpoint**: Enables `/__echo/` endpoint to echo requests (disabled by default)

## Endpoint Configuration

Each endpoint defines how KrakenD routes requests to backend services.

### Basic Endpoint Structure

```json
{
  "endpoint": "/path/to/resource",
  "method": "GET|POST|PUT|DELETE",
  "output_encoding": "json",
  "backend": [
    {
      "url_pattern": "/backend/path",
      "host": ["{{ env \"KRAKEND_COMPOSER_URL\" }}"],
      "encoding": "json"
    }
  ]
}
```

### Endpoint Fields

- **`endpoint`**: Public URL path exposed by KrakenD
  - Supports path parameters: `{param}` (e.g., `/api/{path}`)
  - Example: `/composer/create-composition`

- **`method`**: HTTP method(s) allowed
  - Common: `GET`, `POST`, `PUT`, `DELETE`
  - Can define multiple endpoints with same path but different methods

- **`output_encoding`**: Response format (usually `json`)

- **`backend`**: Array of backend services to call
  - **`url_pattern`**: Path to forward to backend (can include `{param}`)
  - **`host`**: Array of backend service URLs using `{{ env "VAR_NAME" }}` syntax
  - **`encoding`**: Expected response format from backend

### Current Endpoint Categories

#### Health Check Endpoints

```json
"/composer/health-check"  → {{ env "KRAKEND_COMPOSER_URL" }}/health-check
"/journeys/health-check"  → {{ env "KRAKEND_JOURNEYS_URL" }}/health-check
"/dal/health-check"       → {{ env "KRAKEND_DAL_URL" }}/health-check
```

#### Composer Service Endpoints

- `/composer/create-composition` - Create new composition
- `/composer/create-reference` - Create reference
- `/composer/regenerate` - Regenerate content
- `/composer/quick-write` - Quick write feature
- `/composer/structured-response` - Structured AI responses
- `/composer/send-to-channels` - Send content to channels

#### Channel Management Endpoints

- `/composer/send-to-channels` - Send content to channels
- `/composer/send-to-channels/health-check` - Channel service health
- `/composer/send-to-channels/get-callback/{provider}` - Get OAuth callback URL
- `/composer/send-to-channels/callback/{provider}` - Handle OAuth callbacks (GET/POST)

#### Webhook Endpoints

- `/composer/webhook` - Composer webhook handler
- `/journeys/webhooks/trigger` - Trigger journey webhook

#### Queue Management Endpoints

- `/composer/admin/queues/{path}` - Composer queue admin (GET)
- `/composer/admin/queues/api/{path}` - Composer queue API (GET/POST)
- `/dal/admin/queues/{path}` - DAL queue admin (GET)
- `/dal/api/queue/{path}` - DAL queue API (GET/POST)

#### DAL (Data Access Layer) Endpoints

- `/dal/upload-csv` - CSV upload endpoint
- `/dal/import-progress` - Import progress tracking
- `/dal/mass-actions/*` - Bulk operations:
  - `/dal/mass-actions/delete` - Bulk delete
  - `/dal/mass-actions/update` - Bulk update
  - `/dal/mass-actions/export` - Bulk export
  - `/dal/mass-actions/anonymize` - Bulk anonymization
  - `/dal/mass-actions/add-to-list` - Add to list
  - `/dal/mass-actions/add-to-organization` - Add to organization
  - `/dal/mass-actions/add-to-journey` - Add to journey
  - `/dal/mass-actions/update-subscription` - Update subscriptions

#### Strapi CMS Endpoints

- `/strapi/api/{path}` - Proxy all Strapi API routes (GET/POST/PUT/DELETE)
- Routes to `{{ env "KRAKEND_STRAPI_URL" }}/api/{path}`

## Middleware & Extra Config

### Rate Limiting

Rate limiting is configured globally and can be overridden per endpoint.

### CORS Configuration

```json
"security/cors": {
  "allow_origins": ["*"],
  "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  "allow_headers": ["Content-Type", "Authorization"],
  "expose_headers": ["Content-Length"],
  "max_age": "12h",
  "allow_credentials": false
}
```

- **`allow_origins`**: Allowed origins (`["*"]` = all origins)
- **`allow_methods`**: Allowed HTTP methods
- **`allow_headers`**: Allowed request headers
- **`expose_headers`**: Headers exposed to client
- **`max_age`**: Preflight cache duration (12 hours)

### Authentication Plugin

KrakenD uses a custom authentication plugin that validates tokens via Strapi:

```json
"plugin/http-server": {
  "name": ["auth-plugin"],
  "auth-plugin": {
    "auth_url": "{{ env \"KRAKEND_STRAPI_URL\" }}/api/token-verify",
    "auth_header_name": "Authorization",
    "timeout": "5s",
    "cache_ttl": "600s",
    "excluded_paths": [
      "/composer/health-check",
      "/journeys/health-check",
      "/dal/health-check"
    ]
  }
}
```

#### How It Works

1. **Request arrives** with Authorization header
2. **Check excluded paths** - health checks bypass auth
3. **Validate token** - Calls Strapi `/api/token-verify` endpoint
4. **Cache result** - Successful validations cached for 10 minutes (600s)
5. **Allow or deny** - Request proceeds or returns 401

#### Excluded Paths

Health check endpoints are excluded from authentication:
- `/composer/health-check`
- `/journeys/health-check`
- `/dal/health-check`

### Request Validation (CEL)

Some endpoints use CEL (Common Expression Language) for request validation:

```json
"extra_config": {
  "validation/cel": [
    {
      "check_expr": "req_headers['Authorization'] != ''"
    }
  ]
}
```

## Authentication & Caching

### Authentication Flow

```
Request with Authorization header
    ↓
Check if path is excluded (health checks)
    ↓
If not excluded → Check cache for token validation
    ↓
If cached and valid → Use cached response
    ↓
If not cached → Call {{ env "KRAKEND_STRAPI_URL" }}/api/token-verify
    ↓
Cache successful response (600s TTL)
    ↓
Continue to endpoint or return 401
```

### Cache Configuration

- **Auth cache TTL**: `600s` (10 minutes)
- **Cache key**: Authorization header value
- **Cache scope**: Per-token (different tokens cached separately)
- **Invalidation**: Automatic after TTL expires

### Adjusting Cache Duration

To change auth cache duration, modify `cache_ttl` in the auth plugin config:

```json
"auth-plugin": {
  "cache_ttl": "300s"  // 5 minutes
  // or
  "cache_ttl": "1800s" // 30 minutes
}
```

**Considerations:**
- Shorter TTL = more secure but more auth calls
- Longer TTL = fewer auth calls but stale tokens may pass
- Recommended: 5-15 minutes for most use cases

## Adding New Endpoints

### Step-by-Step Guide

1. **Identify the backend service**:
   - Composer: Use `{{ env "KRAKEND_COMPOSER_URL" }}`
   - Journeys: Use `{{ env "KRAKEND_JOURNEYS_URL" }}`
   - DAL: Use `{{ env "KRAKEND_DAL_URL" }}`
   - Strapi: Use `{{ env "KRAKEND_STRAPI_URL" }}`

2. **Add endpoint configuration**:

```json
{
  "endpoint": "/your/new/endpoint",
  "method": "POST",
  "output_encoding": "json",
  "backend": [
    {
      "url_pattern": "/backend/path",
      "host": ["{{ env \"KRAKEND_COMPOSER_URL\" }}"],
      "encoding": "json"
    }
  ]
}
```

3. **Place in appropriate section**:
   - Group related endpoints together
   - Maintain consistent naming conventions
   - Use the `endpoints/` directory structure if using merge script

### Using Endpoint Files

Endpoints can be organized in separate files in the `endpoints/` directory:

- `endpoints/composer.json` - Composer service endpoints
- `endpoints/journeys.json` - Journeys service endpoints
- `endpoints/dal.json` - DAL service endpoints
- `endpoints/strapi.json` - Strapi CMS endpoints

Merge them into `krakend.json` using:

```bash
./merge-endpoints.sh
```

### Example: Adding a New Composer Endpoint

```json
{
  "endpoint": "/composer/new-feature",
  "method": "POST",
  "output_encoding": "json",
  "input_headers": ["Authorization", "Content-Type"],
  "extra_config": {
    "validation/cel": [
      {
        "check_expr": "req_headers['Authorization'] != ''"
      }
    ]
  },
  "backend": [
    {
      "url_pattern": "/composer/new-feature",
      "host": ["{{ env \"KRAKEND_COMPOSER_URL\" }}"],
      "encoding": "json"
    }
  ]
}
```

### Example: Adding Path Parameters

```json
{
  "endpoint": "/api/users/{userId}/posts",
  "method": "GET",
  "output_encoding": "json",
  "backend": [
    {
      "url_pattern": "/api/users/{userId}/posts",
      "host": ["{{ env \"KRAKEND_STRAPI_URL\" }}"],
      "encoding": "json"
    }
  ]
}
```

### Example: Multiple Backends (Load Balancing)

```json
{
  "endpoint": "/api/data",
  "method": "GET",
  "output_encoding": "json",
  "backend": [
    {
      "url_pattern": "/api/data",
      "host": [
        "{{ env \"KRAKEND_STRAPI_URL\" }}",
        "http://strapi-replica:1337"
      ],
      "encoding": "json"
    }
  ]
}
```

## Extending Configuration

### Adding Per-Endpoint Timeout

```json
{
  "endpoint": "/slow/operation",
  "method": "POST",
  "timeout": "30s",
  "output_encoding": "json",
  "backend": [
    {
      "url_pattern": "/slow/operation",
      "host": ["{{ env \"KRAKEND_COMPOSER_URL\" }}"],
      "encoding": "json"
    }
  ]
}
```

### Adding Per-Endpoint Cache

```json
{
  "endpoint": "/cached/data",
  "method": "GET",
  "output_encoding": "json",
  "extra_config": {
    "github.com/devopsfaith/krakend-cache": {
      "ttl": "3600s"
    }
  },
  "backend": [
    {
      "url_pattern": "/data",
      "host": ["{{ env \"KRAKEND_STRAPI_URL\" }}"],
      "encoding": "json"
    }
  ]
}
```

### Excluding Endpoints from Authentication

Add the path to the `excluded_paths` array in the auth plugin configuration:

```json
"auth-plugin": {
  "excluded_paths": [
    "/composer/health-check",
    "/public/endpoint"  // Add new excluded path here
  ]
}
```

### Adding Request Validation

```json
{
  "endpoint": "/validated/endpoint",
  "method": "POST",
  "output_encoding": "json",
  "extra_config": {
    "validation/cel": [
      {
        "check_expr": "req_headers['Authorization'] != ''",
        "error": "Authorization header required"
      },
      {
        "check_expr": "req_body.email.size() > 0",
        "error": "email is required"
      }
    ]
  },
  "backend": [
    {
      "url_pattern": "/endpoint",
      "host": ["{{ env \"KRAKEND_COMPOSER_URL\" }}"],
      "encoding": "json"
    }
  ]
}
```

## Best Practices

### 1. Endpoint Organization

- Group related endpoints together
- Use consistent naming conventions
- Organize endpoints in separate files when using merge script
- Document complex endpoints

### 2. Security

- Always use authentication for sensitive endpoints (except health checks)
- Set appropriate rate limits
- Validate input with CEL expressions when needed
- Use HTTPS in production (configured at infrastructure level)
- Keep auth cache TTL reasonable (5-15 minutes)

### 3. Performance

- Use caching for frequently accessed, rarely changing data
- Set appropriate cache TTLs
- Use connection pooling (handled by KrakenD)
- Monitor timeout values
- Use health check endpoints for monitoring

### 4. Environment Variables

- Always use `{{ env "VAR_NAME" }}` syntax for backend URLs
- Never hardcode service URLs in configuration
- Set `FC_ENABLE=1` in runtime environment
- Use appropriate service names for each environment

### 5. Testing

- Test with different Authorization tokens
- Verify cache behavior with repeated requests
- Test health check endpoints (should work without auth)
- Verify environment variable substitution works correctly

### 6. Monitoring

- Monitor rate limit violations
- Track authentication failures
- Monitor backend service health via health check endpoints
- Track cache hit rates

## Troubleshooting

### Common Issues

#### 1. Environment Variables Not Set

**Symptoms**: KrakenD fails to start or cannot connect to backends

**Solution**:
```bash
# Check environment variables
docker exec krakend-nowtec env | grep KRAKEND
# or
kubectl exec deployment/krakend -- env | grep KRAKEND

# Verify FC_ENABLE is set
echo $FC_ENABLE  # Should output: 1
```

#### 2. Backend Service Connection Errors

**Symptoms**: 502 Bad Gateway or connection refused errors

**Solution**:
```bash
# Test connectivity from KrakenD container
docker exec krakend-nowtec curl http://strapi:1337/health-check
# or
kubectl exec deployment/krakend -- curl http://strapi-service:1337/health-check

# Verify DNS resolution
docker exec krakend-nowtec nslookup strapi
# or
kubectl exec deployment/krakend -- nslookup strapi-service.namespace.svc.cluster.local
```

#### 3. Authentication Failures

**Symptoms**: All requests return 401 Unauthorized

**Solution**:
- Check Strapi service is running and accessible
- Verify Authorization header format: `Bearer <token>`
- Check auth plugin configuration
- Verify `auth_url` uses correct environment variable: `{{ env "KRAKEND_STRAPI_URL" }}/api/token-verify`
- Check KrakenD logs for auth plugin errors

#### 4. Configuration File Not Found

**Symptoms**: `open krakend.json: permission denied` or `file not found`

**Solution**:
- Verify config file is at `/etc/krakend/krakend.json`
- Check file permissions (should be 644)
- Verify Dockerfile copied file correctly

#### 5. Flexible Configuration Not Working

**Symptoms**: Backend URLs show as literal `{{ env "VAR_NAME" }}` instead of actual URLs

**Solution**:
- Verify `FC_ENABLE=1` is set in environment
- Check environment variables are actually set (not just declared)
- Restart KrakenD after setting environment variables

### Debugging Commands

```bash
# Check KrakenD configuration syntax (requires env vars)
docker exec krakend-nowtec \
  KRAKEND_STRAPI_URL=http://strapi:1337 \
  KRAKEND_DAL_URL=http://dal:6001 \
  KRAKEND_COMPOSER_URL=http://composer:3020 \
  KRAKEND_JOURNEYS_URL=http://journeys:3010 \
  krakend check -c /etc/krakend/krakend.json

# View KrakenD logs
docker logs krakend-nowtec
# or
kubectl logs -f deployment/krakend

# Test endpoint routing
curl -X GET http://localhost:8080/composer/health-check

# Test with authentication
curl -X GET http://localhost:8080/composer/create-composition \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Verifying Environment Variable Substitution

To verify that environment variables are being substituted correctly, check the parsed configuration:

```bash
# In container, check if config is parsed correctly
docker exec krakend-nowtec cat /tmp/KrakenD_parsed_config_*.json | grep -A 2 "host"
```

You should see actual URLs (e.g., `http://strapi:1337`) instead of `{{ env "KRAKEND_STRAPI_URL" }}`.

## References

- [KrakenD Documentation](https://www.krakend.io/docs/)
- [KrakenD CEL Documentation](https://www.krakend.io/docs/endpoints/common-expression-language-cel/)
- [KrakenD Caching](https://www.krakend.io/docs/backends/caching/)
- [KrakenD Rate Limiting](https://www.krakend.io/docs/throttling/rate-limit/)
- [KrakenD Flexible Configuration](https://www.krakend.io/docs/configuration/flexible-config/)

## Configuration Schema

The configuration follows KrakenD v2.12 schema. For the latest schema reference, visit:
https://www.krakend.io/schema/v2.12/krakend.json
