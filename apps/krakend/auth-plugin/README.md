# Auth Plugin for KrakenD

This plugin provides authentication middleware for KrakenD API Gateway. It intercepts incoming requests, validates the Authorization header by calling an external authentication endpoint, and returns appropriate HTTP status codes (200 OK, 401 Unauthorized, or 403 Forbidden).

## Features

- **Token Validation**: Validates tokens by forwarding the Authorization header to your authentication endpoint
- **Caching**: Optional caching of validation results to reduce load on auth service
- **Path Exclusion**: Exclude specific paths from authentication checks
- **Path Inclusion**: Optionally only check authentication for specific paths
- **Configurable**: Customizable timeout, cache TTL, and header name

## Configuration

Add the plugin to your `krakend.json` configuration:

```json
{
  "extra_config": {
    "plugin/http-server": {
      "name": ["auth-plugin"],
      "auth-plugin": {
        "auth_url": "http://your-auth-service:port/api/auth/validate",
        "auth_header_name": "Authorization",
        "timeout": "5s",
        "cache_ttl": "600s",
        "excluded_paths": ["/health-check", "/public"]
      }
    }
  }
}
```

### Configuration Options

- **`auth_url`** (required): The URL of your authentication endpoint that will validate tokens
- **`auth_header_name`** (optional, default: "Authorization"): The name of the header containing the auth token
- **`timeout`** (optional, default: "5s"): Timeout for auth validation requests
- **`cache_ttl`** (optional, default: no caching): Cache TTL for validation results (e.g., "600s" for 10 minutes)
- **`excluded_paths`** (optional): Array of paths to exclude from authentication checks
- **`enabled_paths`** (optional): If specified, only these paths will be checked for authentication

## How It Works

1. **Request Interception**: The plugin wraps all HTTP handlers and intercepts incoming requests
2. **Path Checking**: Checks if the path is excluded or should be checked
3. **Header Extraction**: Extracts the Authorization header from the request
4. **Cache Check**: If caching is enabled, checks cache for previous validation results
5. **Token Validation**: Makes HTTP request to auth endpoint with the token
6. **Response Handling**:
   - If auth endpoint returns 200 OK → Request proceeds
   - If auth endpoint returns 401 → Returns 401 Unauthorized
   - If auth endpoint returns 403 → Returns 403 Forbidden
   - Other errors → Returns appropriate status code

## Building

Build the plugin as a shared library:

```bash
cd auth-plugin
go mod download
go build -buildmode=plugin -o auth-plugin.so .
```

Copy the `.so` file to your KrakenD plugins directory (default: `/etc/krakend/plugins/`).

## Example Auth Endpoint Response

Your authentication endpoint should return:

- **200 OK**: Token is valid
- **401 Unauthorized**: Token is invalid or expired
- **403 Forbidden**: Token is valid but user lacks permissions

Optional error message in response body:
```json
{
  "error": "Token expired",
  "message": "Token expired"
}
```

## Usage Examples

### Protect All Routes Except Health Checks

```json
{
  "auth-plugin": {
    "auth_url": "http://strapi:1337/api/auth/me",
    "excluded_paths": ["/health-check/composer", "/health-check/journeys"]
  }
}
```

### Only Protect Specific Routes

```json
{
  "auth-plugin": {
    "auth_url": "http://strapi:1337/api/auth/me",
    "enabled_paths": ["/api/users", "/api/posts"]
  }
}
```

### With Caching

```json
{
  "auth-plugin": {
    "auth_url": "http://strapi:1337/api/auth/me",
    "cache_ttl": "600s"
  }
}
```

## Error Responses

The plugin returns JSON error responses:

```json
{
  "error": "Missing Authorization header"
}
```

```json
{
  "error": "Invalid token"
}
```

## Logging

The plugin uses KrakenD's logger and logs:
- Debug: Cache hits, path exclusions
- Info: Plugin initialization, cache configuration
- Warning: Missing headers, validation failures
- Error: Auth endpoint failures, network errors
