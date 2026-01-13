// SPDX-License-Identifier: Apache-2.0

package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// pluginName is the plugin name
var pluginName = "auth-plugin"

// HandlerRegisterer is the symbol the plugin loader will try to load. It must implement the Registerer interface
var HandlerRegisterer = registerer(pluginName)

type registerer string

func (r registerer) RegisterHandlers(f func(
	name string,
	handler func(context.Context, map[string]interface{}, http.Handler) (http.Handler, error),
)) {
	f(string(r), r.registerHandlers)
}

func (r registerer) registerHandlers(_ context.Context, extra map[string]interface{}, h http.Handler) (http.Handler, error) {
	// Extract configuration
	config, ok := extra[pluginName].(map[string]interface{})
	if !ok {
		return h, errors.New("auth-plugin configuration not found")
	}

	// Get auth endpoint URL
	authURL, ok := config["auth_url"].(string)
	if !ok || authURL == "" {
		return h, errors.New("auth-plugin: auth_url is required in configuration")
	}

	// Get auth header name (defaults to "Authorization")
	authHeaderName := "Authorization"
	if headerName, ok := config["auth_header_name"].(string); ok && headerName != "" {
		authHeaderName = headerName
	}

	// Get timeout (defaults to 5 seconds)
	timeout := 5 * time.Second
	if timeoutStr, ok := config["timeout"].(string); ok {
		if parsedTimeout, err := time.ParseDuration(timeoutStr); err == nil {
			timeout = parsedTimeout
		}
	}

	// Get cache TTL (defaults to 0, no caching)
	cacheTTL := 0 * time.Second
	if ttlStr, ok := config["cache_ttl"].(string); ok {
		if parsedTTL, err := time.ParseDuration(ttlStr); err == nil {
			cacheTTL = parsedTTL
		}
	}

	// Get excluded paths
	excludedPaths := make(map[string]bool)
	if paths, ok := config["excluded_paths"].([]interface{}); ok {
		for _, path := range paths {
			if pathStr, ok := path.(string); ok {
				excludedPaths[pathStr] = true
			}
		}
	}

	// Get enabled paths (if specified, only check auth for these paths)
	enabledPaths := make(map[string]bool)
	if paths, ok := config["enabled_paths"].([]interface{}); ok {
		for _, path := range paths {
			if pathStr, ok := path.(string); ok {
				enabledPaths[pathStr] = true
			}
		}
	}

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: timeout,
	}

	// Create cache map if TTL is set
	var cache map[string]*cacheEntry
	var cacheMutex sync.RWMutex
	if cacheTTL > 0 {
		cache = make(map[string]*cacheEntry)
		logger.Info(fmt.Sprintf("[PLUGIN: %s] Cache enabled with TTL: %v", pluginName, cacheTTL))
	}

	logger.Info(fmt.Sprintf("[PLUGIN: %s] Initialized with auth_url: %s, timeout: %v", pluginName, authURL, timeout))

	// Return the handler wrapping the default handler with auth logic
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		path := req.URL.Path

		// Check if path is excluded
		if excludedPaths[path] {
			logger.Debug(fmt.Sprintf("[PLUGIN: %s] Path %s is excluded from auth", pluginName, path))
			h.ServeHTTP(w, req)
			return
		}

		// If enabled_paths is specified, only check auth for those paths
		if len(enabledPaths) > 0 && !enabledPaths[path] {
			logger.Debug(fmt.Sprintf("[PLUGIN: %s] Path %s is not in enabled_paths, skipping auth", pluginName, path))
			h.ServeHTTP(w, req)
			return
		}

		// Extract auth header
		authToken := req.Header.Get(authHeaderName)
		if authToken == "" {
			logger.Warning(fmt.Sprintf("[PLUGIN: %s] Missing %s header for path %s", pluginName, authHeaderName, path))
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{
				"error": fmt.Sprintf("Missing %s header", authHeaderName),
			})
			return
		}

		// Check cache if enabled
		if cache != nil {
			cacheMutex.RLock()
			entry, found := cache[authToken]
			cacheMutex.RUnlock()

			if found {
				if time.Since(entry.timestamp) < cacheTTL {
					if entry.valid {
						logger.Debug(fmt.Sprintf("[PLUGIN: %s] Token validated from cache", pluginName))
						h.ServeHTTP(w, req)
						return
					}
					logger.Debug(fmt.Sprintf("[PLUGIN: %s] Token invalid from cache", pluginName))
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(entry.statusCode)
					json.NewEncoder(w).Encode(map[string]string{
						"error": entry.message,
					})
					return
				}
				// Cache expired, remove entry
				cacheMutex.Lock()
				delete(cache, authToken)
				cacheMutex.Unlock()
			}
		}

		// Validate token by calling auth endpoint
		valid, statusCode, message := r.validateToken(client, authURL, authToken, authHeaderName)

		// Update cache if enabled
		if cache != nil && valid {
			cacheMutex.Lock()
			cache[authToken] = &cacheEntry{
				valid:      valid,
				statusCode: statusCode,
				message:    message,
				timestamp:  time.Now(),
			}
			cacheMutex.Unlock()
		}

		if !valid {
			logger.Warning(fmt.Sprintf("[PLUGIN: %s] Token validation failed: %s", pluginName, message))
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(statusCode)
			json.NewEncoder(w).Encode(map[string]string{
				"error": message,
			})
			return
		}

		logger.Debug(fmt.Sprintf("[PLUGIN: %s] Token validated successfully", pluginName))
		h.ServeHTTP(w, req)
	}), nil
}

func (r registerer) validateToken(client *http.Client, authURL, token, headerName string) (bool, int, string) {
	// Create request to auth endpoint
	req, err := http.NewRequest("GET", authURL, nil)
	if err != nil {
		logger.Error(fmt.Sprintf("[PLUGIN: %s] Failed to create auth request: %v", pluginName, err))
		return false, 500, "Internal server error"
	}

	// Set authorization header
	req.Header.Set(headerName, token)

	// Make request
	resp, err := client.Do(req)
	if err != nil {
		logger.Error(fmt.Sprintf("[PLUGIN: %s] Auth request failed: %v", pluginName, err))
		return false, 503, "Authentication service unavailable"
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		logger.Error(fmt.Sprintf("[PLUGIN: %s] Failed to read auth response: %v", pluginName, err))
		return false, 500, "Internal server error"
	}

	// Check status code
	if resp.StatusCode == http.StatusOK {
		return true, 200, "OK"
	}

	// Try to parse error message from response
	var errorMsg string
	var errorResp map[string]interface{}
	if err := json.Unmarshal(body, &errorResp); err == nil {
		if msg, ok := errorResp["message"].(string); ok {
			errorMsg = msg
		} else if msg, ok := errorResp["error"].(string); ok {
			errorMsg = msg
		}
	}

	if errorMsg == "" {
		errorMsg = "Invalid token"
	}

	// Return appropriate status code
	if resp.StatusCode == http.StatusUnauthorized {
		return false, 401, errorMsg
	}
	if resp.StatusCode == http.StatusForbidden {
		return false, 403, errorMsg
	}

	return false, resp.StatusCode, errorMsg
}

func main() {}

// Logger interface
var logger Logger = noopLogger{}

func (registerer) RegisterLogger(v interface{}) {
	l, ok := v.(Logger)
	if !ok {
		return
	}
	logger = l
	logger.Info(fmt.Sprintf("[PLUGIN: %s] Logger loaded", pluginName))
}

type Logger interface {
	Debug(v ...interface{})
	Info(v ...interface{})
	Warning(v ...interface{})
	Error(v ...interface{})
	Critical(v ...interface{})
	Fatal(v ...interface{})
}

// Empty logger implementation
type noopLogger struct{}

func (n noopLogger) Debug(_ ...interface{})    {}
func (n noopLogger) Info(_ ...interface{})     {}
func (n noopLogger) Warning(_ ...interface{})  {}
func (n noopLogger) Error(_ ...interface{})     {}
func (n noopLogger) Critical(_ ...interface{}) {}
func (n noopLogger) Fatal(_ ...interface{})    {}

// cacheEntry represents a cached authentication result
type cacheEntry struct {
	valid      bool
	statusCode int
	message    string
	timestamp  time.Time
}
