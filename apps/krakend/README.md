# KrakenD API Gateway Configuration

This document explains the KrakenD API Gateway configuration for NOWCRM and provides guidance on how to extend it.

## Table of Contents

- [Overview](#overview)
- [Global Configuration](#global-configuration)
- [Endpoint Configuration](#endpoint-configuration)
- [Middleware & Extra Config](#middleware--extra-config)
- [Authentication & Caching](#authentication--caching)
- [Adding New Endpoints](#adding-new-endpoints)
- [Extending Configuration](#extending-configuration)
- [Best Practices](#best-practices)

## Overview

KrakenD is a high-performance API Gateway that acts as a single entry point for all backend services in the NOWCRM architecture. It provides:

- **Request routing** to multiple backend services
- **Authentication** via CEL middleware
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
"timeout": "3000ms"
```

- **Global timeout**: Maximum time KrakenD waits for backend responses (3 seconds)
- Applies to all endpoints unless overridden per endpoint
- Format: `{number}{unit}` (e.g., `3000ms`, `5s`, `1m`)

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
"debug_endpoint": true,
"echo_endpoint": true
```

- **Debug endpoint**: Enables `/__debug/` endpoint for troubleshooting
- **Echo endpoint**: Enables `/__echo/` endpoint to echo requests (useful for testing)

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
      "host": ["http://service:port"],
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
  - **`host`**: Array of backend service URLs (supports load balancing)
  - **`encoding`**: Expected response format from backend

### Current Endpoint Categories

#### Health Check Endpoints

```json
"/health-check/composer"  → http://composer:3020/health-check
"/health-check/journeys"  → http://journeys:3010/health-check
"/health-check/dal"       → http://nowcrm-dal:6001/health-check
```

#### Composer Service Endpoints

- `/composer/create-composition` - Create new composition
- `/composer/create-reference` - Create reference
- `/composer/regenerate` - Regenerate content
- `/composer/quick-write` - Quick write feature
- `/composer/structured-response` - Structured AI responses

#### Channel Management Endpoints

- `/send-to-channels` - Send content to channels
- `/send-to-channels/health-check` - Channel service health
- `/send-to-channels/get-callback-{provider}` - Get OAuth callback URL
- `/send-to-channels/callback/{provider}` - Handle OAuth callbacks (GET/POST)

#### Webhook Endpoints

- `/webhook/composer` - Composer webhook handler
- `/webhooks/journeys/trigger` - Trigger journey webhook

#### Queue Management Endpoints

- `/admin/queues/composer/{path}` - Composer queue admin (GET)
- `/admin/queues/api/composer/{path}` - Composer queue API (GET/POST)
- `/admin/queues/dal/{path}` - DAL queue admin (GET)
- `/api/dal/queue/{path}` - DAL queue API (GET/POST)

#### DAL (Data Access Layer) Endpoints

- `/dal/upload` - File upload endpoint
- `/mass-actions/*` - Bulk operations:
  - `/mass-actions/delete` - Bulk delete
  - `/mass-actions/update` - Bulk update
  - `/mass-actions/export` - Bulk export
  - `/mass-actions/anonymize` - Bulk anonymization
  - `/mass-actions/add-to-list` - Add to list
  - `/mass-actions/add-to-organization` - Add to organization
  - `/mass-actions/add-to-journey` - Add to journey
  - `/mass-actions/update-subscription` - Update subscriptions

#### Strapi CMS Endpoints

- `/api/{path}` - Proxy all Strapi API routes (GET/POST/PUT/DELETE)
- Routes to `http://strapi:1337/api/{path}`

## Middleware & Extra Config

### Rate Limiting

```json
"github.com/devopsfaith/krakend-ratelimit/juju/router": {
  "maxRate": 1000,
  "clientMaxRate": 100,
  "strategy": "ip"
}
```

- **`maxRate`**: Global rate limit (1000 requests per second)
- **`clientMaxRate`**: Per-client rate limit (100 requests per second)
- **`strategy`**: Rate limiting strategy (`ip` = by IP address)

### CORS Configuration

```json
"github.com/devopsfaith/krakend-cors": {
  "allow_origins": ["*"],
  "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  "allow_headers": ["Content-Type", "Authorization"],
  "expose_headers": ["Content-Length"],
  "max_age": "12h"
}
```

- **`allow_origins`**: Allowed origins (`["*"]` = all origins)
- **`allow_methods`**: Allowed HTTP methods
- **`allow_headers`**: Allowed request headers
- **`expose_headers`**: Headers exposed to client
- **`max_age`**: Preflight cache duration (12 hours)

### CEL Middleware (Authentication)

```json
"middleware/cel": {
  "pre": [
    {
      "expression": "request.headers['Authorization'].size() > 0",
      "error": "missing authorization header"
    },
    {
      "expression": "auth_response.status == 200",
      "error": "invalid token",
      "auth_call": {
        "method": "GET",
        "url": "http://strapi:1337/api/auth/me",
        "headers": {
          "Authorization": "{{ .Request.Headers.Authorization }}"
        },
        "cache_ttl": "600s"
      }
    }
  ]
}
```

#### How It Works

1. **First check**: Validates Authorization header exists
2. **Second check**: Calls Strapi `/api/auth/me` to validate token
3. **Caching**: Successful auth responses are cached for 10 minutes (600s)
4. **Cache key**: Based on Authorization header value

#### CEL Expression Language

- **`request.headers['Authorization'].size() > 0`**: Checks header exists
- **`auth_response.status == 200`**: Validates auth response is successful
- **`{{ .Request.Headers.Authorization }}`**: Template variable for token

## Authentication & Caching

### Authentication Flow

```
Request with Authorization header
    ↓
CEL Middleware checks header exists
    ↓
Check cache for token (keyed by Authorization header)
    ↓
If cached and valid → Use cached response
    ↓
If not cached → Call http://strapi:1337/api/auth/me
    ↓
Cache successful response (600s TTL)
    ↓
Continue to endpoint or return error
```

### Cache Configuration

- **Auth cache TTL**: `600s` (10 minutes)
- **Cache key**: Authorization header value
- **Cache scope**: Per-token (different tokens cached separately)
- **Invalidation**: Automatic after TTL expires

### Adjusting Cache Duration

To change auth cache duration, modify `cache_ttl` in the `auth_call`:

```json
"auth_call": {
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
   - Composer: `http://composer:3020`
   - Journeys: `http://journeys:3010`
   - DAL: `http://nowcrm-dal:6001`
   - Strapi: `http://strapi:1337`

2. **Add endpoint configuration**:

```json
{
  "endpoint": "/your/new/endpoint",
  "method": "POST",
  "output_encoding": "json",
  "backend": [
    {
      "url_pattern": "/backend/path",
      "host": ["http://service:port"],
      "encoding": "json"
    }
  ]
}
```

3. **Place in appropriate section**:
   - Group related endpoints together
   - Maintain consistent naming conventions
   - Add comments if needed (though JSON doesn't support comments)

### Example: Adding a New Composer Endpoint

```json
{
  "endpoint": "/composer/new-feature",
  "method": "POST",
  "output_encoding": "json",
  "backend": [
    {
      "url_pattern": "/composer/new-feature",
      "host": ["http://composer:3020"],
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
      "host": ["http://strapi:1337"],
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
        "http://strapi:1337",
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
      "host": ["http://service:port"],
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
      "host": ["http://service:port"],
      "encoding": "json"
    }
  ]
}
```

### Adding Request/Response Transformation

```json
{
  "endpoint": "/transformed/endpoint",
  "method": "POST",
  "output_encoding": "json",
  "extra_config": {
    "modifier/martian": {
      "header.Modifier": {
        "scope": ["request", "response"],
        "name": "X-Custom-Header",
        "value": "custom-value"
      }
    }
  },
  "backend": [
    {
      "url_pattern": "/endpoint",
      "host": ["http://service:port"],
      "encoding": "json"
    }
  ]
}
```

### Excluding Endpoints from Authentication

To exclude an endpoint from auth checks, add it to a separate endpoint group or use endpoint-specific CEL configuration:

```json
{
  "endpoint": "/public/endpoint",
  "method": "GET",
  "output_encoding": "json",
  "extra_config": {
    "middleware/cel": {
      "skip": true
    }
  },
  "backend": [
    {
      "url_pattern": "/public/endpoint",
      "host": ["http://service:port"],
      "encoding": "json"
    }
  ]
}
```

### Adding Custom Rate Limits Per Endpoint

```json
{
  "endpoint": "/sensitive/endpoint",
  "method": "POST",
  "output_encoding": "json",
  "extra_config": {
    "github.com/devopsfaith/krakend-ratelimit/juju/router": {
      "maxRate": 10,
      "clientMaxRate": 5,
      "strategy": "ip"
    }
  },
  "backend": [
    {
      "url_pattern": "/sensitive/endpoint",
      "host": ["http://service:port"],
      "encoding": "json"
    }
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
    "middleware/cel": {
      "pre": [
        {
          "expression": "request.body.email.size() > 0",
          "error": "email is required"
        },
        {
          "expression": "'@' in request.body.email",
          "error": "invalid email format"
        }
      ]
    }
  },
  "backend": [
    {
      "url_pattern": "/endpoint",
      "host": ["http://service:port"],
      "encoding": "json"
    }
  ]
}
```

## Best Practices

### 1. Endpoint Organization

- Group related endpoints together
- Use consistent naming conventions
- Document complex endpoints with comments in separate docs

### 2. Security

- Always use authentication for sensitive endpoints
- Set appropriate rate limits
- Validate input with CEL expressions when needed
- Use HTTPS in production (configured at infrastructure level)

### 3. Performance

- Use caching for frequently accessed, rarely changing data
- Set appropriate cache TTLs
- Use connection pooling (handled by KrakenD)
- Monitor timeout values

### 4. Error Handling

- Provide meaningful error messages in CEL expressions
- Use appropriate HTTP status codes
- Log errors for debugging (configured in KrakenD runtime)

### 5. Testing

- Use `/__echo/` endpoint to test request routing
- Use `/__debug/` endpoint to inspect request/response
- Test with different Authorization tokens
- Verify cache behavior with repeated requests

### 6. Monitoring

- Monitor rate limit violations
- Track authentication failures
- Monitor backend service health
- Track cache hit rates

## Troubleshooting

### Common Issues

1. **Authentication fails on every request**
   - Check Strapi service is running
   - Verify Authorization header format
   - Check cache TTL configuration

2. **Rate limit errors**
   - Adjust `maxRate` or `clientMaxRate`
   - Check if IP-based strategy is appropriate
   - Consider per-endpoint rate limits

3. **Timeout errors**
   - Increase global or endpoint-specific timeout
   - Check backend service performance
   - Verify network connectivity

4. **CORS errors**
   - Verify `allow_origins` configuration
   - Check `allow_headers` includes required headers
   - Ensure `allow_methods` includes request method

### Debugging Commands

```bash
# Check KrakenD configuration syntax
krakend check -c krakend.json

# Test endpoint routing
curl -X GET http://localhost:8080/__echo/your/endpoint

# Debug request
curl -X GET http://localhost:8080/__debug/your/endpoint
```

## References

- [KrakenD Documentation](https://www.krakend.io/docs/)
- [KrakenD CEL Documentation](https://www.krakend.io/docs/endpoints/common-expression-language-cel/)
- [KrakenD Caching](https://www.krakend.io/docs/backends/caching/)
- [KrakenD Rate Limiting](https://www.krakend.io/docs/throttling/rate-limit/)

## Configuration Schema

The configuration follows KrakenD v2.12 schema. For the latest schema reference, visit:
https://www.krakend.io/schema/v2.12/krakend.json
