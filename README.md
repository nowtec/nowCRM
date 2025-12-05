# nowCRM

**nowCRM** - your open source CRM with multichannel outreach capabilities and efficient data management at scale.

## Watch nowCRM in action

[![nowCRM latest features 2025 - Watch Video](https://cdn.loom.com/sessions/thumbnails/a76ce91ff48c407a94d14866b585dd17-aa4045a8e01c9b24-full-play.gif#t=0.1)](https://www.loom.com/share/a76ce91ff48c407a94d14866b585dd17)

## Screenshots

### Core Features

**Contact Management**
![nowCRM contacts](.github/workflows/screenshots/nowCRM%20contacts.png)

**Contact Details & Communication History**
![nowCRM contact details](.github/workflows/screenshots/nowCRM%20contact%20details.png)

**List Management**
![nowCRM lists](.github/workflows/screenshots/nowCRM%20lists.png)

### Marketing & Outreach

**Journeys - Automated Marketing Workflows**
![nowCRM journeys](.github/workflows/screenshots/nowCRM%20journeys.png)

**Composer - Multi-Channel Outreach**
![nowCRM composer](.github/workflows/screenshots/nowCRM%20composer%20-%20outreach%20via%20anychannel.png)

**Dynamic Variables in Email Campaigns**
![nowCRM dynamic variables](.github/workflows/screenshots/nowCRM%20dynamic%20variables%20in%20email.png)

### Content & Campaign Tools

**Form Builder**
![nowCRM form builder](.github/workflows/screenshots/nowCRM%20form%20Builder.png)

**Social Media Calendar**
![nowCRM social media calendar](.github/workflows/screenshots/nowCRM%20social%20media%20calendar.png)

**Contact Import**
![nowCRM contact import](.github/workflows/screenshots/nowCRM%20contact%20import.png)

---

# nowCRM Developer Guide

**nowCRM** is the central customer relationship management platform developed by **nowtec solutions AG**.  
It connects several microservices (Strapi, Composer, Journeys, and DAL) into one modular solution.  

> Licensed under the [GNU Affero General Public License v3.0](./LICENSE).  
> Attribution required — see [NOTICE](./NOTICE).

---

## 🧩 Architecture Overview

nowCRM relies on the following core services:

| Service | Description |
|----------|-------------|
| **Strapi 5** | Headless CMS used as the universal data backend, authentication layer, and admin panel. |
| **Composer** | Handles content generation, channel dispatch, and AWS SES event ingestion. |
| **Journeys** | Manages automated multi-step marketing journeys. |
| **DAL (Data Access Layer)** | Orchestrates heavy asynchronous or bulk operations. |
| **nowCRM (Frontend)** | The Next.js 15 web interface connecting users to all backend services. |

---

## ⚙️ Prerequisites

Before starting local development, ensure you have:

- Node.js, 20+
- pnpm
- Docker + Docker Compose

---

## 🚀 Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/nowtec/nowCRM.git
cd nowCRM
```


### 2. You can start nowCRM in two main ways:

* **Option A**: One step Docker setup with `make up`
* **Option B**: Local step by step setup with `make dev` and per service commands

---

### Option A: Full Docker setup with `make up`

This is the quickest way to get a complete environment running.

1. Make sure Docker and Docker Compose are running on your machine.

2. From the project root, run:

   ```bash
   make up
   ```

3. You will be prompted to enter your **customer domain**
   For example:

   ```text
   Enter your customer domain (e.g. nowtec.solutions):
   ```

4. After you confirm the domain, the full setup will run automatically inside Docker
   All required services will be started and wired together.


   

---

### Option B: Local development, service by service

If you prefer to run everything locally outside of Docker, you can bring up the environment step by step.

#### 1. Prepare the dev environment

From the project root, run:

```bash
make dev
```

This command prepares the local development environment (dependencies, configs, etc.) for all services.

#### 2. Start backend services

For **DAL**, **Composer** and **Journeys**, go into each service root folder and run:

```bash
pnpm build
pnpm start
```

Examples:

```bash
cd dal
pnpm build
pnpm start
```

```bash
cd composer
pnpm build
pnpm start
```

```bash
cd journeys
pnpm build
pnpm start
```

#### 3. Start nowCRM frontend

From the `nowcrm` (frontend) root folder:

```bash
pnpm dev
```

The frontend will start in development mode and connect to the locally running backend services.


## 🔨 Queueing System (DAL)

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
- New Relic, or Prometheus + Graphana

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
pnpm develop
```

Production mode:
```bash
pnpm build
pnpm start
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
pnpm lint:fix
pnpm build
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
Licensed under the [GNU Affero General Public License v3.0](./LICENSE)

**IMPORTANT:** This software is licensed under AGPL-3.0, which means:

- ✅ You can use, modify, and distribute this software freely
- ✅ You can use it commercially
- ⚠️ **You MUST** provide the source code of any modifications
- ⚠️ **You MUST** disclose your modifications under AGPL-3.0
- ⚠️ **You MUST** provide source code access to all users if you run it as a network service (SaaS, web application, etc.)
- ⚠️ **You MUST** retain all copyright and attribution notices

Attribution notice (see [NOTICE](./NOTICE)) must be preserved in all forks, derivative works, and any network-accessible deployments.

### Network Use Provision

If you modify nowCRM and make it available to users over a network (including as a web service, SaaS, or API), you are required to make the complete source code of your modified version available to those users under AGPL-3.0. This is the key difference from standard GPL licenses.

### Commercial Licensing

For commercial licensing options that may provide different terms, please contact:
- Website: https://www.nowtec.solutions
- Email: opensource@nowtec.solutions

---

## 🤝 Contributing

We welcome contributions! By contributing to nowCRM, you agree that your contributions will be licensed under AGPL-3.0.

Please ensure:
1. All new files include the appropriate AGPL-3.0 header
2. You have the right to contribute the code
3. Your code follows the project's coding standards
4. You've tested your changes thoroughly

---

## 📞 Support

For questions, issues, or support:
- GitHub Issues: [https://github.com/nowtec/nowCRM/issues](https://github.com/nowtec/nowCRM/issues)
- Documentation: [https://github.com/nowtec/nowCRM](https://github.com/nowtec/nowCRM)
