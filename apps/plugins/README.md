# @nowcrm/plugins

Standalone plugins host.

External plugin code is expected to live in a separate repository and be published to GitHub Packages.

## Runtime env

- `PLUGINS_HOST` (default: `localhost`)
- `PLUGINS_PORT` (default: `3030`)
- `PLUGINS_RUNTIME_DIR` (default: `/tmp/nowcrm-plugins-runtime`)
- `GITHUB_PACKAGES_TOKEN` (required for install)
- `GITHUB_PACKAGES_SCOPE` (default: `@nowtec`)
- `GITHUB_PACKAGES_REGISTRY` (default: `https://npm.pkg.github.com`)

See `.env.sample` for a template.

## API

- `GET /health-check`
- `POST /plugins/install` (installs and auto-runs)
- `POST /plugins/run`
- `POST /plugins/stop`
- `GET /plugins/status`

### Install request

```json
{
  "packageName": "@nowtec/your-plugin-package",
  "version": "1.2.3"
}
```

## Entrypoint resolution

`run` tries in this order:

1. `scripts.start`
2. `bin`
3. `main`

If none exists, run fails with an explicit error.
