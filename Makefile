COMPOSE_FILE=docker-compose.dev.yaml
ENV_FILE=.env
NETWORK_NAME=my_net

SERVICES = apps/composer apps/journeys apps/dal apps/nowcrm
ALL_SERVICES = composer journeys dal 
NOWCRM_SERVICE = nowcrm
DEV_SERVICES = dbdt strapi rabbitmq redis
STRAPI_SERVICE = strapi
TOKEN_NAME = journeys_dal_composer
SHELL := /bin/bash

# ============================================================
# Checks
# ============================================================

check-env:
	@if [ ! -f $(ENV_FILE) ]; then \
		echo "⚠️  $(ENV_FILE) not found."; \
		if [ -f .env.sample ]; then \
			cp .env.sample $(ENV_FILE); \
			echo "✅ Created $(ENV_FILE) from .env.sample"; \
		else \
			echo "❌ .env.sample not found! Creating empty .env..."; \
			touch $(ENV_FILE); \
		fi; \
		read -p "🌐 Enter CUSTOMER_DOMAIN (e.g. nowtec.solutions): " CUSTOMER_DOMAIN; \
		if [ -z "$$CUSTOMER_DOMAIN" ]; then \
			echo "❌ CUSTOMER_DOMAIN cannot be empty. Aborting."; \
			exit 1; \
		fi; \
		if grep -q '^CUSTOMER_DOMAIN=' $(ENV_FILE); then \
			sed -i '' "s|^CUSTOMER_DOMAIN=.*|CUSTOMER_DOMAIN=$$CUSTOMER_DOMAIN|" $(ENV_FILE); \
		else \
			echo "CUSTOMER_DOMAIN=$$CUSTOMER_DOMAIN" >> $(ENV_FILE); \
		fi; \
		echo "✅ Added CUSTOMER_DOMAIN=$$CUSTOMER_DOMAIN to $(ENV_FILE)"; \
		for dir in . $(SERVICES); do \
			if [ "$$dir" = "." ] || [ -d $$dir ]; then \
				env_path="$$dir/.env"; \
				sample_path="$$dir/.env.sample"; \
				if [ -f $$env_path ]; then \
					sed -i '' "/^CUSTOMER_DOMAIN=/! s|CUSTOMER_DOMAIN|$$CUSTOMER_DOMAIN|g" $$env_path; \
					echo "🔁 Updated $$env_path"; \
				elif [ -f $$sample_path ]; then \
					cp $$sample_path $$env_path; \
					sed -i '' "/^CUSTOMER_DOMAIN=/! s|CUSTOMER_DOMAIN|$$CUSTOMER_DOMAIN|g" $$env_path; \
					echo "🆕 Created $$env_path and replaced CUSTOMER_DOMAIN"; \
				else \
					echo "⚠️  No .env or .env.sample in $$dir, skipping"; \
				fi; \
			fi; \
		done; \
		echo "✨ All CUSTOMER_DOMAIN replacements complete."; \
	else \
		echo "✔️  $(ENV_FILE) already exists, skipping domain setup"; \
	fi


check-network:
	@if [ -z "$$(docker network ls --filter name=$(NETWORK_NAME) -q)" ]; then \
		echo "Creating docker network $(NETWORK_NAME)"; \
		docker network create $(NETWORK_NAME); \
	fi

# ============================================================
# Environment setup
# ============================================================

setup-envs:
	@echo "🧩 Checking and creating local .env files..."

	# 1️⃣ Root .env
	@if [ -f .env.sample ]; then \
		if [ ! -f .env ]; then \
			cp .env.sample .env; \
			echo "Created root .env from .env.sample"; \
		else \
			echo "✔️  Root .env already exists — skipping"; \
		fi \
	else \
		echo "⚠️  .env.sample not found in root — skipping"; \
	fi

	# 2️⃣ For each service
	@for dir in $(SERVICES); do \
		if [ -d $$dir ]; then \
			if [ -f $$dir/.env.sample ]; then \
				if [ ! -f $$dir/.env ]; then \
					cp $$dir/.env.sample $$dir/.env; \
					echo "Created $$dir/.env from $$dir/.env.sample"; \
				else \
					echo "✔️  $$dir/.env already exists — skipping"; \
				fi \
			else \
				echo "⚠️  $$dir/.env.sample not found — skipping"; \
			fi \
		fi \
	done
	@echo "Environment setup complete."

# ============================================================
# STRAPI DATABASE + AWS ENV GENERATION
# ============================================================

generate-env:
	@echo "🔐 Generating STRAPI_* secrets in $(ENV_FILE) if missing or empty..."
	@touch $(ENV_FILE)
	@set -e; \
	for VAR in \
		STRAPI_DATABASE_NAME \
		STRAPI_DATABASE_USERNAME \
		STRAPI_DATABASE_PASSWORD \
		STRAPI_AWS_REGION \
		STRAPI_AWS_ACCESS_KEY_ID \
		STRAPI_AWS_ACCESS_SECRET \
		STRAPI_AWS_BUCKET \
		STRAPI_ADMIN_JWT_SECRET \
		STRAPI_API_TOKEN_SALT \
		STRAPI_TRANSFER_TOKEN_SALT \
		STRAPI_APP_KEYS \
		STRAPI_TEST_ADMIN_PASSWORD \
		TEST_USER_USERNAME \
		TEST_USER_PASSWORD \
		CRM_TOTP_ENCRYPTION_KEY \
		CRM_AUTH_SECRET; \
	do \
		LINE=$$(grep -E "^$$VAR=" $(ENV_FILE) 2>/dev/null || true); \
		VALUE=$$(echo "$$LINE" | cut -d'=' -f2- | tr -d '" '); \
		if [ -z "$$LINE" ] || [ -z "$$VALUE" ]; then \
			case $$VAR in \
				STRAPI_DATABASE_NAME) VAL="strapi_$$(LC_ALL=C tr -dc 'a-z0-9' </dev/urandom | head -c 8)";; \
				STRAPI_DATABASE_USERNAME) VAL="strapi_$$(LC_ALL=C tr -dc 'a-z0-9' </dev/urandom | head -c 8)";; \
				STRAPI_DATABASE_PASSWORD) VAL="$$(LC_ALL=C tr -dc 'A-Za-z0-9@#%^+=_' </dev/urandom | head -c 32)";; \
				STRAPI_AWS_REGION) VAL="eu-central-1";; \
				STRAPI_AWS_ACCESS_KEY_ID) VAL="your_aws_access_key_id";; \
				STRAPI_AWS_ACCESS_SECRET) VAL="your_aws_access_secret";; \
				STRAPI_AWS_BUCKET) VAL="your_s3_bucket_name";; \
				STRAPI_ADMIN_JWT_SECRET) VAL="$$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 64)";; \
				STRAPI_API_TOKEN_SALT) VAL="$$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32)";; \
				STRAPI_TRANSFER_TOKEN_SALT) VAL="$$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32)";; \
				STRAPI_APP_KEYS) VAL="$$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 64),$$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 64)";; \
				STRAPI_TEST_ADMIN_PASSWORD) VAL="$$(LC_ALL=C tr -dc 'A-Za-z0-9@#%^+=' </dev/urandom | head -c 16)";; \
				CRM_TOTP_ENCRYPTION_KEY) VAL="$$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 64)";; \
				CRM_AUTH_SECRET) VAL="$$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 64)";; \
			esac; \
			if grep -q "^$$VAR=" $(ENV_FILE); then \
				sed -i '' "s|^$$VAR=.*|$$VAR=\"$$VAL\"|" $(ENV_FILE); \
				echo "✅ Updated empty $$VAR=\"$$VAL\""; \
			else \
				echo "$$VAR=\"$$VAL\"" >> $(ENV_FILE); \
				echo "✅ Added $$VAR=\"$$VAL\""; \
			fi; \
		else \
			echo "$$VAR already set — skipping"; \
		fi; \
	done; \
	\
	echo "Syncing CRM vars with apps/nowcrm/.env..."; \
	NOWCRM_ENV="apps/nowcrm/.env"; \
	if [ -f $$NOWCRM_ENV ]; then \
		for ROOT_VAR in CRM_TOTP_ENCRYPTION_KEY CRM_AUTH_SECRET; do \
			case $$ROOT_VAR in \
				CRM_TOTP_ENCRYPTION_KEY) TARGET_VAR="CRM_TOTP_ENCRYPTION_KEY";; \
				CRM_AUTH_SECRET) TARGET_VAR="AUTH_SECRET";; \
			esac; \
			ROOT_VAL=$$(grep -E "^$$ROOT_VAR=" $(ENV_FILE) | cut -d'=' -f2- | tr -d '"'); \
			if grep -q "^$$TARGET_VAR=" $$NOWCRM_ENV; then \
				sed -i '' "s|^$$TARGET_VAR=.*|$$TARGET_VAR=\"$$ROOT_VAL\"|" $$NOWCRM_ENV; \
				echo "Updated $$TARGET_VAR in nowcrm env"; \
			else \
				echo "$$TARGET_VAR=\"$$ROOT_VAL\"" >> $$NOWCRM_ENV; \
				echo "Added $$TARGET_VAR to nowcrm env"; \
			fi; \
		done; \
	else \
		echo "apps/nowcrm/.env not found — skipping"; \
	fi


print-env:
	@echo "---- Effective STRAPI env from $(ENV_FILE) ----"
	@grep -E '^(STRAPI_DATABASE_|STRAPI_AWS_)' $(ENV_FILE) | sed 's/\(PASSWORD=\).*/\1********/' | sed 's/\(SECRET=\).*/\1********/'

init-env: check-env setup-envs generate-env print-env

# ============================================================
# Token injection logic
# ============================================================

inject-strapi-token:
	@echo "⏳ Waiting for Strapi container to initialize and create tokens..."

	@echo "⏳ Waiting (max 180s) for CRM_STRAPI_API_TOKEN..."
	@i=0; \
	while [ $$i -lt 36 ]; do \
		if docker logs $(STRAPI_SERVICE) 2>&1 | grep -q 'CRM_STRAPI_API_TOKEN='; then \
			echo "CRM_STRAPI_API_TOKEN found"; \
			break; \
		fi; \
		echo "waiting for CRM_STRAPI_API_TOKEN..."; \
		sleep 5; \
		i=$$((i+1)); \
	done; \
	if [ $$i -eq 36 ]; then echo "Timeout waiting for CRM_STRAPI_API_TOKEN"; fi

	@echo "⏳ Extracting CRM_STRAPI_API_TOKEN..."
	@set -e; \
	CRM_TOKEN=$$(docker logs $(STRAPI_SERVICE) 2>&1 \
		| sed 's/\x1b\[[0-9;]*m//g' \
		| grep -Eo 'CRM_STRAPI_API_TOKEN=[0-9a-fA-F]+' \
		| tail -1 \
		| cut -d= -f2 \
		| tr -d '\r\n '); \
	\
	if [ -z "$$CRM_TOKEN" ]; then \
		echo "CRM_STRAPI_API_TOKEN not found in logs"; \
	else \
		echo "Retrieved CRM_STRAPI_API_TOKEN: $$CRM_TOKEN"; \
		for env_file in $(ENV_FILE) $(SERVICES:%=%/.env) apps/nowcrm/.env; do \
			if [ -f $$env_file ]; then \
				if grep -q '^CRM_STRAPI_API_TOKEN' $$env_file; then \
					sed -i '' "s|^CRM_STRAPI_API_TOKEN=.*|CRM_STRAPI_API_TOKEN=\"$$CRM_TOKEN\"|" $$env_file; \
					echo "Updated CRM_STRAPI_API_TOKEN in $$env_file"; \
				fi; \
			fi; \
		done; \
	fi

	@echo "⏳ Extracting JOURNEYS_DAL_COMPOSER_API_TOKEN..."

	@set -e; \
	JOURNEYS_TOKEN=$$(docker logs $(STRAPI_SERVICE) 2>&1 \
		| sed 's/\x1b\[[0-9;]*m//g' \
		| grep -Eo 'JOURNEYS_DAL_COMPOSER_API_TOKEN=[0-9a-fA-F]+' \
		| tail -1 \
		| cut -d= -f2 \
		| tr -d '\r\n '); \
	\
	if [ -z "$$JOURNEYS_TOKEN" ]; then \
		echo "Token JOURNEYS_DAL_COMPOSER_API_TOKEN missing"; \
		exit 0; \
	fi; \
	\
	echo "Retrieved JOURNEYS_DAL_COMPOSER_API_TOKEN: $$JOURNEYS_TOKEN"; \
	echo "Updating COMPOSER_STRAPI_API_TOKEN, DAL_STRAPI_API_TOKEN and JOURNEYS_STRAPI_API_TOKEN only if empty..."; \
	\
	for env_file in $(ENV_FILE) $(SERVICES:%=%/.env) apps/nowcrm/.env; do \
		if [ -f $$env_file ]; then \
			for VAR in COMPOSER_STRAPI_API_TOKEN DAL_STRAPI_API_TOKEN JOURNEYS_STRAPI_API_TOKEN; do \
				LINE=$$(grep -E "^$$VAR=" $$env_file || true); \
				VALUE=$$(echo $$LINE | cut -d= -f2- | tr -d '"' ); \
				if [ -n "$$LINE" ] && [ -z "$$VALUE" ]; then \
					sed -i '' "s|^$$VAR=.*|$$VAR=\"$$JOURNEYS_TOKEN\"|" $$env_file; \
					echo "Updated empty $$VAR in $$env_file"; \
				fi; \
			done; \
		fi; \
	done


print-strapi-creds:
	@echo ""
	@echo "Please save your credentials for future logins!"
	@echo "Reading Strapi credentials from logs..."
	@URL="http://localhost:1337/admin"; \
	EMAIL="$$(grep -E '^STRAPI_STANDART_EMAIL=' $(ENV_FILE) | cut -d= -f2-)"; \
	PASS="$$(docker logs $(STRAPI_SERVICE) 2>&1 \
		| grep 'STRAPI_ADMIN_PASSWORD:' \
		| tail -1 \
		| cut -d: -f2- \
		| sed 's/^[[:space:]]*//' \
		| tr -d '\r\n')"; \
	echo "Strapi URL: $$URL"; \
	echo "Login: $$EMAIL"; \
	if [ -z "$$PASS" ]; then \
		echo "Password: not found in logs"; \
	else \
		echo "Password: $$PASS"; \
	fi

print-crm-creds:
	@echo ""
	@echo "Please open Strapi,"
	@echo "go to Content Manager, open User and create your own account."
	@echo "Use this account to log in to the CRM. CRM URL: http://localhost:3000/crm"
	
# ============================================================
# Main commands
# ============================================================

up: init-env check-network
	@echo "Starting Docker containers except nowcrm..."
	docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) up -d $(DEV_SERVICES) $(ALL_SERVICES)
	@$(MAKE) inject-strapi-token

	@echo "Starting nowcrm only after tokens are ready..."
	docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) up -d $(NOWCRM_SERVICE)

	@$(MAKE) print-strapi-creds
	@$(MAKE) print-crm-creds

dev: init-env check-network
	@echo "Starting DEV stack (Strapi + DB + RabbitMQ + Redis)..."
	docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) up -d $(DEV_SERVICES)
	@$(MAKE) inject-strapi-token

	@echo "Starting nowcrm after token injection..."
	docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) up -d $(NOWCRM_SERVICE)

	@$(MAKE) print-strapi-creds
	@$(MAKE) print-crm-creds

down:
	docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) down

restart:
	docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) restart

logs:
	docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) logs -f --tail=100

logs-%:
	docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) logs -f --tail=100 $*

rebuild:
	docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) build --no-cache
	docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) up -d --force-recreate
	@$(MAKE) inject-strapi-token

rebuild-%:
	docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) build --no-cache $*
	docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) up -d --force-recreate $*
	@$(MAKE) inject-strapi-token

ps:
	docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) ps

clean:
	docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) down -v --remove-orphans
	docker system prune -f

clean-volumes:
	docker volume prune -f

sh-%:
	docker exec -it $* sh || docker exec -it $* bash

status:
	@echo "Network: $(NETWORK_NAME)"
	@docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE) ps

help:
	@echo ""
	@echo "Default Docker Compose Makefile"
	@echo ""
	@echo "Usage:"
	@echo "  make up              - start all containers and auto-inject STRAPI_API_TOKEN"
	@echo "  make down            - stop all containers"
	@echo "  make rebuild         - rebuild and re-inject token"
	@echo "  make init-env        - generate STRAPI_DATABASE_* + STRAPI_AWS_* vars"
	@echo "  make inject-strapi-token - manually fetch token and inject it"
	@echo ""

.PHONY: up down restart logs rebuild ps clean help setup-envs inject-strapi-token init-env generate-env
