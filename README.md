# nowCRM

**nowCRM** - your open source CRM with multichannel outreach capabilities and efficient data management at scale.



# nowCRM Developer Guide

**nowCRM** is the central customer relationship management platform developed by **nowtec solutions AG**.  
It connects several microservices (Strapi, Composer, Journeys, and DAL) into one modular ecosystem.  

> Licensed under the [Apache License 2.0](./LICENSE).  
> Attribution required — see [NOTICE](./NOTICE).

---

## 🧩 Architecture Overview

nowCRM relies on the following core services:

| Service | Description |
|----------|-------------|
| **Strapi** | Headless CMS used as the universal data backend, authentication layer, and admin panel. |
| **Composer** | Handles content generation, channel dispatch, and AWS SES event ingestion. |
| **Journeys** | Manages automated multi-step marketing journeys. |
| **DAL (Data Action Layer)** | Orchestrates heavy asynchronous or bulk operations using BullMQ. |
| **nowCRM (Frontend)** | The Next.js 15 web interface connecting users to all backend services. |

---

## ⚙️ Prerequisites

Before starting local development, ensure you have:

- Node.js v20+
- Yarn v1.22+
- Docker + Docker Compose
- Redis
- PostgreSQL
- Access to the internal Strapi and Composer APIs

---

## 🚀 Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/nowtec/nowCRM.git
cd nowCRM
```

### 2. Environment Configuration

Use the provided `.env.sample` files for each component to create `.env`:

| Service | Example file |
|----------|---------------|
| nowCRM | `.env.sample` |
| Composer | `composer/.env.example` |
| DAL | `dal/.env.example` |
| Strapi | `strapi-app/.env.example` |

Example for **nowCRM**:

```env
NEXT_PUBLIC_API_URL=http://localhost:1337
NEXTAUTH_SECRET=your-secret
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337/api
NEXT_PUBLIC_COMPOSER_URL=http://localhost:3020
```

---

### 3. Start Dependencies (Redis, PostgreSQL, Strapi)

```bash
sudo docker-compose -f docker-compose-dev.yaml up redis strapi
```

> Ensure PostgreSQL is available and credentials match your Strapi `.env`.

---

### 4. Run Each Service

#### nowCRM (Frontend)

```bash
yarn install
yarn dev
```

#### Composer

```bash
cd composer
yarn build
yarn start
```

> Use `yarn build` even in dev mode due to ESM loader requirements.

#### DAL

```bash
cd dal
yarn build
yarn start
```

#### Journeys (if used)

```bash
cd journeys
yarn dev
```

---

## 📨 Queueing System (DAL)

DAL uses **BullMQ** queues backed by Redis.

### Queues

| Queue | Purpose |
|--------|----------|
| `masssendQueue` | Defines bulk mailings with throttle intervals and target lists. |
| `sendQueue` | Dispatches individual messages respecting rate limits and retries. |

### Example Workflow

1. `masssendQueue` creates jobs for each recipient with delay = `index × throttleMs`.
2. `sendQueue` processes each contact job, sending messages and applying exponential backoff on failure.

**Observability:**
- Dashboard: [Bull Board / Arena]
- Metrics: Prometheus + Grafana
- Alerts: Redis connection checks and queue depth monitors

---

## 🧠 Composer Overview

### Core Functions

| Route | Description |
|--------|--------------|
| `/createReference` | Generates the base message composition. |
| `/createAdditionalResult` | Adds additional channel-specific content. |
| `/createComposition` | Builds complete multi-channel compositions. |

### Environment Variables

All variables are prefixed with `COMPOSER_`.

Example `.env` (shortened):

```env
COMPOSER_PORT=3020
COMPOSER_REDIS_HOST=localhost
COMPOSER_STRAPI_API_URL=http://localhost:1337/api/
COMPOSER_OPENAI_API_KEY="sk-..."
COMPOSER_SMTP_HOST="email-smtp.eu-central-1.amazonaws.com"
```

### SES Event Handling

SES → SNS → Webhook → Composer endpoint  
`https://COMPOSER.customerdomain.com/webhook/ses-event-to-strapi`

Manual step: set the configuration set in AWS SES Console.

---

## 🧩 Shared Module (`nowtec-shared`)

A private NPM package consolidating Strapi service logic, types, and utilities.  
Used by all services to unify data access patterns.

### Development Workflow

```bash
cd shared
yarn build
npm pack
```

Always bump version tags manually in `package.json` before merging shared updates.

---

## 🧰 Strapi Setup

**Purpose:** Central content hub and backend API for all apps.

### Key Features

- Content types for CRM data
- API endpoints for entities
- Admin panel for managing users, lists, and compositions
- Custom plugins for reporting and forms

### Running Locally

```bash
cd strapi-app
yarn develop
```

Production mode:
```bash
yarn build
yarn start
```

### Docker Notes

PostgreSQL service configured in `docker-compose.yaml` with:

```yaml
command: -c 'max_connections=500'
shm_size: 256mb
```

Database pool (`config/database.js`):

```js
pool: { min: 10, max: 500, acquireTimeoutMillis: 60000 }
```

---

## 🧩 Code Quality

Before pushing:

```bash
yarn lint:fix
yarn build
```

---

## 🧠 Developer Tips

- Always use environment variable prefixes (`COMPOSER_`, `DAL_`, `STRAPI_`, etc.)
- Avoid hardcoding API URLs; read from `.env`
- Monitor Redis queues actively during development
- Keep your `.npmrc` configured for private package registry access

---

## 📜 License & Attribution

© 2025 nowtec solutions AG  
Licensed under the [Apache License 2.0](./LICENSE)

Attribution notice (see [NOTICE](./NOTICE)) must be preserved in all forks and derivative works.
