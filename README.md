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

**Manual Configuration Steps:**
1. **Set up SNS Topic** in AWS SNS Console to receive SES events
2. **Create SNS Subscription** with HTTPS endpoint pointing to your Composer service
3. **Configure SES Configuration Set** to publish events to your SNS topic
4. **Set the configuration set** in AWS SES Console to use your SNS topic

**Required Environment Variables:**
- `COMPOSER_CRM_REDIRECT_HEALTH_CHECK` - URL for health check redirects
- `CUSTOMER_DOMAIN` - Your customer domain for webhook URL generation
- `COMPOSER_STRAPI_API_TOKEN` - Strapi API token for event processing

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

# nowCRM Configuration Guide

This guide provides a comprehensive summary of the installation verification protocol, channel configuration, and environment configuration for the nowCRM platform.

---

## Installation Verification Protocol

The Installation Verification Protocol outlines a step-by-step process to ensure proper deployment and functionality of the nowCRM platform and its associated services.

### Prerequisites
- Customer domain information
- Administrative credentials
- Test data (CSV files for imports)

### 1. Strapi Setup and Verification

#### 1.1 Verify Strapi Installation
- [ ] Confirm Strapi is running and accessible
- [ ] Check Strapi admin panel is responding

#### 1.2 Admin User Management
- [ ] Create Strapi admin user if necessary
- [ ] Create dedicated user for nowCRM with admin rights
- [ ] Verify user exists and has proper permissions

### 2. Strapi Token Access Rights Verification

#### 2.1 Public Token Verification
- [ ] Verify public token has appropriate access rights
- [ ] Test token functionality

#### 2.2 Service-Specific Token Verification
Verify tokens have proper access for:
- [ ] **DAL** (Data Access Layer)
- [ ] **Journeys** service
- [ ] **Composer** service

### 3. nowCRM Access Verification
- [ ] Verify nowCRM platform is accessible
- [ ] Confirm Admin user created in step 1.2 user **can** login, and with a wrong password it CAN NOT
- [ ] Verify forget and reset password functionality
- [ ] Document any access issues

### 4. Service Domain and Deployment Verification

#### 4.1 Domain Accessibility
Verify the following domains are accessible:
- [ ] `dal(-demo).CUSTOMERDOMAIN`
- [ ] `journeys(-demo).CUSTOMERDOMAIN`
- [ ] `composer(-demo).CUSTOMERDOMAIN`

#### 4.2 Service Health Check
For each service, verify:
1. Check service logs for:
   - [ ] **DAL service** - no crashes or critical errors
   - [ ] **Journeys service** - no crashes or critical errors
   - [ ] **Composer service** - no crashes or critical errors

### 5. nowCRM Functional Testing

#### 5.1 Contact and Organization Management
- [ ] **Create** a contact with organization
- [ ] **Edit** the contact information
- [ ] **Delete** a contact
- [ ] **Filter verification**: Find the contact using search/filter functionality

#### 5.2 Unsubscribe Functionality
- [ ] Verify unsubscribe link works correctly
- [ ] Test unsubscribe process end-to-end

#### 5.3 Composition Generation and Sending
- [ ] **Default channel**: Generate and send email composition
- [ ] **Other channels**: Test only if specific configurations are required
- [ ] Verify delivery and formatting

#### 5.4 Import Functionality

**Production environment:**
- [ ] Import CSV with a few test lines
- [ ] Verify import success

**Demo environment:**
- [ ] Import CSV with 100k records
- [ ] Monitor performance and completion

**Actions Import:**
- [ ] Repeat import process for actions
- [ ] **Filter verification**: Find imported actions using search/filter functionality

#### 5.5 Event Recording and Analytics
- [ ] Verify events are properly recorded
- [ ] Confirm event streaming is functional
- [ ] Check stats collection from Composer service
- [ ] Validate analytics data accuracy

### 6. Form Creation and Management

#### 6.1 Form Setup
- [ ] Create a new form
- [ ] Configure form sharing/distribution
- [ ] Test form accessibility

#### 6.2 Form Submission Testing
- [ ] Fill out the form completely
- [ ] Submit form data
- [ ] **Results verification**: Confirm form results are processed and stored correctly

### 7. Terms of Use Verification
- [ ] Verify Terms of Use page is accessible
- [ ] Confirm content is properly displayed
- [ ] Test acceptance functionality if applicable

### 8. Admin Settings Verification
- [ ] Access admin settings panel
- [ ] Verify all configuration options are available
- [ ] Test critical settings functionality
- [ ] Confirm permissions are working correctly

### 9. Journey Creation and Execution

#### 9.1 Journey Setup
- [ ] Create a simple journey workflow
- [ ] Configure journey triggers and actions
- [ ] Verify journey configuration is saved

#### 9.2 Journey Execution
- [ ] Run the created journey
- [ ] Monitor **Journeys service** for proper execution
- [ ] Verify **Composer service** handles journey actions correctly
- [ ] Check for any errors or failures in the workflow

### 🚀 Bonus: End-to-End Quick Verification
**Complete E2E Test:**
- [ ] Create a journey triggered by form completion
- [ ] Submit the form
- [ ] Verify the journey executes automatically
- [ ] Confirm all services work together seamlessly

---

## Channel Configuration

The Composer module in nowCRM supports multi-channel messaging, including Email, SMS, WhatsApp, LinkedIn, Twitter(X), Telegram, and WordPress. Each channel requires specific configuration in the CRM Admin Panel and, in some cases, external setup.



### General Channel Configuration Steps

1. **Navigate to the Admin Panel:**
   Go to the CRM Admin Panel and select the **Channels** section.

2. **Select the Channel:**
   Click on the channel you wish to configure (e.g., Email, WhatsApp, SMS, Telegram, Twitter(X), WordPress, LinkedIn, Unipile).

3. **Enter Required Credentials:**
   Fill in the required fields such as API keys, tokens, client IDs, secrets, or other authentication details as prompted.

4. **Authorize Access (if required):**
   For channels that require OAuth or similar authorization (e.g., LinkedIn), follow the provided link to authorize the CRM application to access your account.

5. **Save Credentials:**
   After entering all necessary information, click **Save Credentials**.

6. **Validate Connection:**
   Click the **Run Health Check** button for each channel. The status will update to show if the connection is active or if there are issues.

### Channel-Specific Configuration

#### 1. Email (Default Channel)
- Navigate to **Channels > Email** in the Admin Panel
- Click **Save Credentials**
- Click **Run Health Check** to verify the connection

#### 2. WhatsApp
- Set up a WhatsApp Business Account and register for [Meta for Developers](https://developers.facebook.com/docs/whatsapp)
- Go to the [Meta App Dashboard](https://developers.facebook.com/apps/) and create or select your app
- Under **WhatsApp > API Setup**, generate a **WhatsApp Access Token** and retrieve your **WhatsApp Business Account ID**
- In the CRM Admin Panel, go to **Channels > WhatsApp**
- Enter the **WhatsApp Access Token** and **Business Account ID**
- Click **Save Credentials**
- Click **Run Health Check** to verify the connection

#### 3. SMS (AWS SNS)
- Sign in to the [AWS Management Console](https://console.aws.amazon.com/)
- Go to the [IAM Console](https://console.aws.amazon.com/iam/) and create or use an IAM user with SNS permissions
- Generate an **Access Key ID** and **Secret Access Key**
- Identify your **SNS region** (e.g., eu-central-1, us-east-1)
- In the CRM Admin Panel, go to **Channels > SMS**
- Enter the **Access Key ID**, **Secret Access Key**, and select the **SNS region**
- Click **Save Credentials**
- Click **Run Health Check** to verify the connection

#### 4. Telegram
- Open Telegram and search for [@BotFather](https://t.me/botfather)
- Use `/newbot` to create a new bot and follow the instructions to get your **Bot API Token**
- Add your bot to the desired group or channel as an administrator
- To get the **Channel ID**, use [userinfobot](https://t.me/userinfobot) or send a message to your bot and use the Telegram API to retrieve the chat ID
- In the CRM Admin Panel, go to **Channels > Telegram**
- Enter the **Bot API Token** and **Channel ID**
- Click **Save Credentials**
- Click **Run Health Check** to verify the connection

#### 5. Twitter (X)
- Register your application in the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
- Create a Project and an App to obtain your **API Key**, **API Secret Key**, **Bearer Token**, and **Access Tokens**
- In the CRM Admin Panel, go to **Channels > Twitter(X)**
- Enter the required credentials
- Click **Save Credentials**
- Click **Run Health Check** to verify the connection

#### 6. WordPress
- Ensure your WordPress site has the [WordPress REST API](https://developer.wordpress.org/rest-api/) enabled (default for WordPress 4.7+)
- (Optional) Install a plugin for authentication, such as [Application Passwords](https://wordpress.org/plugins/application-passwords/) or [JWT Authentication](https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/)
- Generate an **Application Password** or **JWT Token** for your WordPress user
- In the CRM Admin Panel, go to **Channels > WordPress**
- Enter the **WordPress Site URL**, **Username**, and **Application Password** or **JWT Token**
- Click **Save Credentials**
- Click **Run Health Check** to verify the connection

#### 7. LinkedIn
- Register your application in the [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
- Retrieve the **Client ID** and **Client Secret** from your LinkedIn app settings
- Obtain your **Organization URN** from your LinkedIn organization page
- In the CRM Admin Panel, go to **Channels > LinkedIn**
- Enter the **Client ID**, **Client Secret**, and **Organization URN**
- Click the **Authorize LinkedIn Access** link and complete the authorization flow
- Click **Save Credentials**
- If prompted, use **Refresh Access Token**
- Click **Run Health Check** to verify the connection

#### 8. Unipile (LinkedIn Messaging related)
- Register for a Unipile developer account at [Unipile Developer Portal](https://developers.unipile.com/) (if available)
- Obtain your **Unipile API Key** and any other required credentials from your Unipile dashboard
- In the CRM Admin Panel, go to **Channels > Unipile**
- Enter the **API Key** and any other required information
- Click **Save Credentials**
- Click **Run Health Check** to verify the connection

---

## Environment Configuration

Environment configuration is managed through `.env` files for each service. These files contain critical settings for database connections, API endpoints, authentication, and service-specific configurations.

### Core Environment Variables

#### Main .env File (Backend Configuration)
The main `.env` file contains backend configurations, secrets, and deployment settings.

#### Key Variables:
- Configure database connections, API endpoints, and service-specific settings for each service
- Ensure proper authentication tokens and credentials are set for inter-service communication

### Service-Specific Environment Configurations

#### DAL (Data Access Layer) Environment Variables
```
# Environment Configuration
NODE_ENV="development" # Options: 'development', 'production', 'test'
DAL_PORT="6001"            # The port your server will listen on
DAL_HOST="localhost"       # Hostname for the server

DAL_CORS_ORIGIN="http://localhost:3000" # Allowed CORS origin, adjust as necessary

DAL_COMMON_RATE_LIMIT_MAX_REQUESTS="100" # Max number of requests per window per IP
DAL_MINUTE_TO_LAUNCH="5"
DAL_STRAPI_API_URL="http://localhost:1337/api/"
DAL_STRAPI_API_TOKEN=""
DAL_CHECK_TIME="1440" # This variable helps journeys to understand when to close processed journey job and open new 1 for checking default is 1 day
DAL_JOB_FAIL_LIFE_TIME_DAYS="1"
DAL_JOB_COMPLETED_LIFE_TIME_DAYS="1"

DAL_REDIS_PORT="6379"
DAL_REDIS_HOST="localhost"

DAL_BASIC_AUTH_USERNAME=""
DAL_BASIC_AUTH_PASSWORD=""

DAL_WORKER_COUNT="4"
DAL_JOB_CONCURRENCY="1"

DAL_DATABASE_CLIENT="postgresql"
DAL_DATABASE_HOST="localhost"
DAL_DATABASE_PORT=5433
DAL_DATABASE_NAME=""
DAL_DATABASE_USERNAME=""
DAL_DATABASE_PASSWORD=""
DAL_DATABASE_RDS=false
DAL_DATABASE_SSL_SELF=false

DAL_SMTP_HOST="localhost"
DAL_SMTP_PORT="587"
DAL_SMTP_USER="username"
DAL_SMTP_PASS="password"
DAL_SMTP_FROM=""

# Basic Auth (optional)
DAL_BASIC_AUTH_USERNAME="admin"
DAL_BASIC_AUTH_PASSWORD="admin"

# Shared URLs
STRAPI_URL="http://localhost:1337/api/"
COMPOSER_URL="http://localhost:3020/"
RABBITMQ_URL="amqp://guest:guest@localhost:5672"
```

#### nowCRM Environment Variables
```
NODE_ENV='development' # Options: 'development', 'production', 'test'

CRM_BASE_URL="http://localhost:3000"

CRM_STRAPI_API_URL="http://localhost:1337/api/"
CRM_STRAPI_API_TOKEN=""
DAL_URL='http://localhost:6001/api/'

COMPOSER_URL="http://localhost:3020/"

# API URLs
STRAPI_URL="http://localhost:1337/api/"
JOURNEYS_URL="http://localhost:3010/"

# Authentication
CRM_STRAPI_API_TOKEN=""
CRM_TOTP_ENCRYPTION_KEY=""
AUTH_SECRET="pZsHmI9P7wcs03/BEuFtMxi9HbSuyCwyknuyx7BIads="
AUTH_URL="http://localhost:3000/api/auth"
AUTH_TRUST_HOST=false # for development use false in cause of http

# Configuration
NT_STACK_VERSION=""
TEST_RUN=false

# S3 Configuration (optional)
S3_ACCESS_KEY=""
S3_SECRET_KEY=""
S3_ENDPOINT=""
S3_BUCKET=""
S3_PUBLIC_URL_BASE=""

```

#### Composer Service Environment Variables
```
# Environment Configuration
NODE_ENV="development" # Options: 'development', 'production', 'test'
COMPOSER_PORT="3020"            # The port your server will listen on
COMPOSER_HOST="localhost"       # Hostname for the server

COMPOSER_CORS_ORIGIN="http://localhost:3000" # Allowed CORS origin, adjust as necessary
COMPOSER_COMMON_RATE_LIMIT_MAX_REQUESTS="100" # Max number of requests per window per IP

COMPOSER_CRM_REDIRECT_HEALTH_CHECK="http://localhost:3000/crm/admin-panel/channels"

# API Configuration
COMPOSER_STRAPI_API_TOKEN=""
STRAPI_URL="http://localhost:1337/api/"
COMPOSER_URL="http://localhost:3020/"

# Redis Configuration
COMPOSER_REDIS_PORT="6379"
COMPOSER_REDIS_HOST="localhost"

# AI Service Configuration
COMPOSER_OPENAI_API_KEY=""
COMPOSER_ANTHROPIC_KEY=""

# SMTP Configuration
COMPOSER_SMTP_HOST=""
COMPOSER_SMTP_PORT="18000"
COMPOSER_SMTP_USER=""
COMPOSER_SMTP_PASS=""

# Domain Configuration
CUSTOMER_DOMAIN=""
COMPOSER_CUSTOMER_IDENTITY=""

# Message Queue
RABBITMQ_URL="amqp://guest:guest@localhost:5672"
```

#### Journeys Service Environment Variables
```
# Environment Configuration
NODE_ENV="development" # Options: 'development', 'production', 'test'
JOURNEYS_PORT="3010"            # The port your server will listen on
JOURNEYS_HOST="localhost"       # Hostname for the server

JOURNEYS_CORS_ORIGIN="http://localhost:3000" # Allowed CORS origin, adjust as necessary
JOURNEYS_COMMON_RATE_LIMIT_MAX_REQUESTS="100" # Max number of requests per window per IP
JOURNEYS_MINUTE_TO_LAUNCH="5"

# API Configuration
JOURNEYS_STRAPI_API_TOKEN=""
STRAPI_URL="http://localhost:1337/api/"
COMPOSER_URL="http://localhost:3020/"

# Job Configuration
JOURNEYS_CHECK_TIME="1440" # This variable helps journeys to understand when to close processed journey job and open new 1 for checking default is 1 day
JOURNEYS_JOB_FAIL_LIFE_TIME_DAYS="1"
JOURNEYS_JOB_COMPLETED_LIFE_TIME_DAYS="1"

# Redis Configuration
JOURNEYS_REDIS_PORT="6379"
JOURNEYS_REDIS_HOST="localhost"
JOURNEYS_REDIS_MAX_RETRIES="3"
JOURNEYS_REDIS_RETRY_DELAY_MS="1000"
JOURNEYS_REDIS_CONNECT_TIMEOUT="10000"
JOURNEYS_REDIS_COMMAND_TIMEOUT="5000"
JOURNEYS_REDIS_LAZY_CONNECT="0"

# Redis Cleanup
REDIS_CLEANUP_CRON="0 2 * * *" # Daily at 2 AM

# Strapi Pagination
STRAPI_PAGINATION_MAX_PAGES="100"
STRAPI_PAGINATION_MAX_RECORDS="10000"

# Circuit Breaker Configuration
CIRCUIT_BREAKER_FAILURE_THRESHOLD="5"
CIRCUIT_BREAKER_RESET_TIMEOUT_MS="60000"
CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS="3"

# RabbitMQ Configuration
RABBITMQ_URL="amqp://guest:guest@localhost:5672"
RABBITMQ_PREFETCH_COUNT="10"
RABBITMQ_RECONNECT_DELAY_MS="5000"
RABBITMQ_MAX_RECONNECT_ATTEMPTS="10"
RABBITMQ_CONSUMER_CONCURRENCY="5"
RABBITMQ_MAX_RETRIES="3"
RABBITMQ_RETRY_INITIAL_DELAY_MS="1000"
RABBITMQ_RETRY_MAX_DELAY_MS="30000"
```



### Environment Configuration Best Practices

1. **Security**: Never share real credentials in documentation or screenshots. All credentials should be securely managed (e.g., in 1Password).

2. **Environment Separation**: Use different configurations for development, testing, and production environments.

3. **Variable Naming**: Use descriptive variable names with service prefixes to avoid conflicts (e.g., `CRM_`, `DAL_`, `BEXIO_`).

4. **Secrets Management**: Store sensitive information securely in variables or other secret management systems.

5. **Documentation**: Include a `.env.sample` file for each service, documenting every variable.

---

## Conclusion

This configuration guide provides a comprehensive overview of the installation verification protocol, channel configuration, and environment configuration for the nowCRM platform. Following these guidelines ensures proper deployment, functionality, and security of the system.

For technical support during installation:
- **Technical Team:** nowtec solutions AG Engineering <tech@nowtec.solutions>

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
