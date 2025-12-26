# Migration from Strapi 4 to Strapi 5

## Strapi database migration

```sql
-- Add task_status column
ALTER TABLE tasks
ADD COLUMN task_status text;

-- Add check constraint for allowed statuses
ALTER TABLE tasks
ADD CONSTRAINT tasks_task_status_check
CHECK (task_status IN ('planned', 'in progress', 'done', 'expired'));

-- Convert plain text to Slate JSON structure in consents.text
UPDATE consents
SET text =
  jsonb_build_array(
    jsonb_build_object(
      'type', 'paragraph',
      'children',
      jsonb_build_array(
        jsonb_build_object(
          'text', text
        )
      )
    )
  )::text
WHERE text IS NOT NULL
  AND text !~ '^\s*\[';

-- Remove broken admin actions settings
DELETE FROM strapi_core_store_settings
WHERE key LIKE 'admin::actions%';
```

## Kubernetes environment update. Check values before applying
### DAL

```bash
kubectl patch secret dal-secrets -n namespace \
  --type='merge' \
  -p '{
    "stringData": {
      "STRAPI_URL": "http://strapi:port/api/",
      "COMPOSER_URL": "http://composer:port/",
      "RABBITMQ_URL": "amqp://user:password@rabbitmq-nt-apps:port"
      "DAL_STRAPI_API_URL": "http://strapi:port/api/"
    }
  }'
```

### Journeys

```bash
kubectl patch secret journeys-secrets -n namespace \
  --type='merge' \
  -p '{
    "stringData": {
      "CIRCUIT_BREAKER_FAILURE_THRESHOLD": "5",
      "CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS": "3",
      "CIRCUIT_BREAKER_RESET_TIMEOUT_MS": "60000",
      "COMPOSER_URL": "http://composer:port/",
      "JOURNEYS_REDIS_COMMAND_TIMEOUT": "5000",
      "JOURNEYS_REDIS_CONNECT_TIMEOUT": "10000",
      "JOURNEYS_REDIS_LAZY_CONNECT": "1",
      "JOURNEYS_REDIS_MAX_RETRIES": "3",
      "JOURNEYS_REDIS_RETRY_DELAY_MS": "1000",
      "RABBITMQ_CONSUMER_CONCURRENCY": "5",
      "RABBITMQ_MAX_RECONNECT_ATTEMPTS": "5",
      "RABBITMQ_MAX_RETRIES": "3",
      "RABBITMQ_PREFETCH_COUNT": "10",
      "RABBITMQ_RECONNECT_DELAY_MS": "5000",
      "RABBITMQ_RETRY_INITIAL_DELAY_MS": "1000",
      "RABBITMQ_RETRY_MAX_DELAY_MS": "30000",
      "REDIS_CLEANUP_CRON": "0 2 * * *",
      "STRAPI_PAGINATION_MAX_PAGES": "100",
      "STRAPI_PAGINATION_MAX_RECORDS": "10000",
      "STRAPI_URL": "http://strapi:port/api/"
    }
  }'
```

```bash
kubectl patch secret journeys-secrets -n nt-apps \
  --type='json' \
  -p='[
    {
      "op": "remove",
      "path": "/data/SHARED_STRAPI_URL"
    },
    {
      "op": "remove",
      "path": "/data/SHARED_COMPOSER_URL"
    }
  ]'
```

### Composer

```bash
kubectl patch secret composer-secrets -n nt-apps \
  --type='merge' \
  -p '{
    "stringData": {
      "STRAPI_URL": "http://strapi:port/api/",
      "COMPOSER_URL": "http://composer:port/",
      "JOURNEYS_URL": "http://journeys:port/",
      "DAL_URL": "http://dal:port/"
    }
  }'
```

### NowCRM

```bash
kubectl patch secret nowcrm-secrets -n nt-apps \
  --type='json' \
  -p='[
    {
      "op": "add",
      "path": "/stringData/NODE_ENV",
      "value": "production"
    },
    {
      "op": "add",
      "path": "/stringData/STRAPI_URL",
      "value": "http://strapi:port/api/"
    },
    {
      "op": "add",
      "path": "/stringData/DAL_URL",
      "value": "http://dal:port/"
    },
    {
      "op": "add",
      "path": "/stringData/COMPOSER_URL",
      "value": "http://composer:port/"
    },
    {
      "op": "add",
      "path": "/stringData/CRM_BASE_URL",
      "value": "https://crm.nowtec.solutions"
    },
    {
      "op": "add",
      "path": "/stringData/twoFA_ENABLED",
      "value": "false"
    },
    {
      "op": "add",
      "path": "/stringData/TEST_RUN",
      "value": "false"
    },
    {
      "op": "add",
      "path": "/stringData/NT_STACK_VERSION",
      "value": "1.0.1"
    },

    {
      "op": "remove",
      "path": "/data/CRM_STRAPI_API_URL"
    },
    {
      "op": "remove",
      "path": "/data/CRM_DAL_API_URL"
    },
    {
      "op": "remove",
      "path": "/data/SHARED_COMPOSER_URL"
    },
    {
      "op": "remove",
      "path": "/data/NEXTAUTH_SECRET"
    },
    {
      "op": "remove",
      "path": "/data/NEXTAUTH_URL"
    },
    {
      "op": "remove",
      "path": "/data/CRM_AUTH_SECRET"
    },
    {
      "op": "remove",
      "path": "/data/CRM_AUTH_URL"
    }
  ]'
```
### Strapi

1) Add and overwrite required values
```bash
kubectl patch secret strapi-secrets -n nt-apps \
  --type='merge' \
  -p '{
    "stringData": {
      "API_TOKEN_SALT": "",
      "APP_KEYS": "",
      "DATABASE_CLIENT": "postgres",
      "DATABASE_HOST": "",
      "DATABASE_PORT": "",
      "DATABASE_NAME": "",
      "DATABASE_USERNAME": "",
      "DATABASE_PASSWORD": "",
      "ADMIN_JWT_SECRET": ""
    }
  }'
```

2) Remove obsolete keys
```bash
kubectl patch secret strapi-secrets -n nt-apps \
  --type='json' \
  -p='[
    { "op": "remove", "path": "/data/STRAPI_API_TOKEN_SALT" },
    { "op": "remove", "path": "/data/STRAPI_APP_KEYS" },

    { "op": "remove", "path": "/data/STRAPI_DATABASE_HOST" },
    { "op": "remove", "path": "/data/STRAPI_DATABASE_PORT" },
    { "op": "remove", "path": "/data/STRAPI_DATABASE_NAME" },
    { "op": "remove", "path": "/data/STRAPI_DATABASE_USERNAME" },
    { "op": "remove", "path": "/data/STRAPI_DATABASE_PASSWORD" },

    { "op": "remove", "path": "/data/STRAPI_ADMIN_JWT_SECRET" }
  ]'
```