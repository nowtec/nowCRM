# nowCRM — local stack task runner. Bootstrap logic lives in scripts/.

SHELL := /bin/bash
.SHELLFLAGS := -ec
.DEFAULT_GOAL := help
.ONESHELL:

COMPOSE_FILE ?= docker-compose.dev.yaml
ENV_FILE     ?= .env
COMPOSE = docker compose --env-file $(ENV_FILE) -f $(COMPOSE_FILE)

INFRA_SERVICES  = dbdt redis rabbitmq mailpit
APP_SERVICES    = strapi composer journeys dal plugins krakend
# Recreated after inject-strapi-token, since they read the token at creation.
TOKEN_CONSUMERS = composer journeys dal plugins
CRM_SERVICE     = nowcrm

BUILD_TARGETS = nowcrm-strapi:strapi nowcrm-dev:nowcrm nowcrm-journeys-dev:journeys \
                nowcrm-composer-dev:composer nowcrm-dal-dev:dal \
                nowcrm-plugins-dev:plugins krakend-nowtec:krakend

.PHONY: help up dev watch down restart stop logs ps status \
        init-env print-env print-creds inject-strapi-token \
        build build-if-missing rebuild clean clean-volumes prune check-docker

# ============================================================
# Checks
# ============================================================

check-docker:
	@command -v docker >/dev/null 2>&1 || { \
		echo "error: docker is not installed or not on PATH."; \
		echo "       See https://docs.docker.com/get-docker/"; exit 1; }
	@docker compose version >/dev/null 2>&1 || { \
		echo "error: the Docker Compose v2 plugin is required ('docker compose')."; \
		echo "       The legacy 'docker-compose' binary is not supported."; exit 1; }
	@docker info >/dev/null 2>&1 || { \
		echo "error: cannot talk to the Docker daemon. Is it running?"; exit 1; }

# ============================================================
# Environment
# ============================================================

init-env:
	@ENV_FILE=$(ENV_FILE) ./scripts/env-setup.sh

print-env:
	@echo "---- Effective Strapi env from $(ENV_FILE) ----"
	@grep -E '^(STRAPI_DATABASE_|STRAPI_AWS_)' $(ENV_FILE) \
		| sed -E 's/(PASSWORD|SECRET|KEY_ID)=.*/\1=********/'

inject-strapi-token:
	@ENV_FILE=$(ENV_FILE) \
	STRAPI_CONTAINER="$$($(COMPOSE) ps -q strapi)" \
	./scripts/inject-strapi-token.sh

print-creds:
	@. ./scripts/lib/env-file.sh
	@echo ""
	@echo "=================================================================="
	@echo " Strapi admin: http://localhost:1337/admin"
	@echo "   login:    $$(env_get STRAPI_STANDART_EMAIL $(ENV_FILE))"
	@CID="$$($(COMPOSE) ps -q strapi)"; \
	PASS=""; \
	if [ -n "$$CID" ]; then \
		PASS="$$(docker logs "$$CID" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' \
			| grep 'STRAPI_ADMIN_PASSWORD:' | tail -1 | cut -d: -f2- \
			| sed 's/^[[:space:]]*//' | tr -d '\r\n')"; \
	fi; \
	if [ -n "$$PASS" ]; then echo "   password: $$PASS"; \
	else echo "   password: not in logs (only printed on first boot)"; fi
	@echo ""
	@if [ -n "$$($(COMPOSE) ps -q $(CRM_SERVICE) 2>/dev/null)" ]; then \
		echo " CRM: http://localhost:3000/crm"; \
	else \
		echo " CRM: not running in Docker (that is what 'make dev' does)."; \
		echo "   Start it on the host:  pnpm --filter @nowcrm/nowcrm dev"; \
		echo "   Or in a container:     make up"; \
	fi
	@echo "   Create a user in Strapi (Content Manager -> User), then sign in."
	@echo "   Set 'Confirmed' = true on that user, or the gateway rejects its token."
	if [ -n "$$PASS" ]; then \
		echo "   The Strapi admin password is printed above only on first boot.";
	fi
	@echo "=================================================================="

# ============================================================
# Build
# ============================================================

build: check-docker
	@$(COMPOSE) build

build-if-missing: check-docker
	@missing=""
	@for pair in $(BUILD_TARGETS); do \
		image="$${pair%%:*}"; service="$${pair##*:}"; \
		if docker image inspect "$$image" >/dev/null 2>&1; then \
			echo "  ok      $$image"; \
		else \
			echo "  missing $$image"; missing="$$missing $$service"; \
		fi; \
	done; \
	if [ -n "$$missing" ]; then \
		echo "==> Building:$$missing"; \
		$(COMPOSE) build $$missing; \
	else \
		echo "==> All images present"; \
	fi

# ============================================================
# Lifecycle
# ============================================================

up: check-docker init-env build-if-missing
	@echo "==> Starting infrastructure and backend services..."
	@$(COMPOSE) up -d $(INFRA_SERVICES) $(APP_SERVICES)
	@$(MAKE) inject-strapi-token
	@echo "==> Starting $(CRM_SERVICE) with the injected tokens..."
	@$(COMPOSE) up -d $(TOKEN_CONSUMERS) $(CRM_SERVICE)
	@$(MAKE) print-creds

dev: check-docker init-env build-if-missing
	@echo "==> Starting the development stack..."
	@$(COMPOSE) up -d $(INFRA_SERVICES) $(APP_SERVICES)
	@$(MAKE) inject-strapi-token
	@echo "==> Applying the injected tokens..."
	@$(COMPOSE) up -d $(TOKEN_CONSUMERS) $(CRM_SERVICE)
	@$(MAKE) print-creds
	@echo ""
	# The bracket stops the pattern matching this recipe's own shell.
	@if pgrep -f "[d]ocker-compose compose .*-f $(COMPOSE_FILE) watch" >/dev/null 2>&1; then \
		echo "==> A 'docker compose watch' is already running for this project."; \
		echo "    The stack above is up; this shell will not start a second watcher."; \
		echo "    Stop the other one (Ctrl-C in its terminal) and re-run 'make dev',"; \
		echo "    or keep using it — it is already syncing your edits."; \
		exit 0; \
	fi
	@echo "==> Watching for changes. Saving a file under apps/ or libs/ updates the"
	@echo "    running container; editing a package.json rebuilds its image."
	@echo "    Ctrl-C stops watching; the services keep running (make down to stop)."
	@trap 'exit 0' INT; $(COMPOSE) watch --no-up || [ $$? -eq 130 ]

watch: dev

down: check-docker
	@$(COMPOSE) down

stop: check-docker
	@$(COMPOSE) stop

restart: check-docker
	@$(COMPOSE) restart

rebuild: check-docker
	@$(COMPOSE) build --no-cache
	@$(COMPOSE) up -d --force-recreate
	@$(MAKE) inject-strapi-token

rebuild-%: check-docker
	@$(COMPOSE) build --no-cache $*
	@$(COMPOSE) up -d --force-recreate $*

# ============================================================
# Inspection
# ============================================================

ps status: check-docker
	@$(COMPOSE) ps

logs: check-docker
	@$(COMPOSE) logs -f --tail=100

logs-%: check-docker
	@$(COMPOSE) logs -f --tail=100 $*

sh-%: check-docker
	@$(COMPOSE) exec $* sh 2>/dev/null || $(COMPOSE) exec $* bash

# ============================================================
# Cleanup
# ============================================================

clean: check-docker
	@$(COMPOSE) down -v --remove-orphans

clean-volumes: check-docker
	@$(COMPOSE) down -v

prune: check-docker
	@echo "This prunes unused images, networks and build cache for EVERY project"
	@echo "on this machine, not just nowCRM."
	@read -r -p "Continue? [y/N] " reply; \
	case "$$reply" in [yY]*) docker system prune -af ;; *) echo "Aborted." ;; esac

# ============================================================
# Help
# ============================================================

help:
	@echo ""
	@echo "nowCRM — local stack"
	@echo ""
	@echo "Every target below runs against $(COMPOSE_FILE). It builds the 'dev' target"
	@echo "of each service Dockerfile, so the containers run development servers"
	@echo "rather than compiled output. For production, pass the prod file:"
	@echo "COMPOSE_FILE=docker-compose.prod.yaml make up"
	@echo ""
	@echo "Getting started"
	@echo "  make dev                  Start every service in Docker, then watch the source tree."
	@echo "                            Saving a file updates the running container."
	@echo "                            Stays in the foreground; Ctrl-C stops watching and"
	@echo "                            leaves the services running. Alias: make watch"
	@echo "  make up                   Start every service in Docker, detached, no watching"
	@echo "  make down                 Stop and remove containers"
	@echo ""
	@echo "  The CRM is served on http://localhost:3000 and Strapi on :1337."
	@echo "  Editing a package.json or pnpm-lock.yaml rebuilds that service's image."
	@echo ""
	@echo "Environment"
	@echo "  make init-env             Create .env files and generate missing secrets"
	@echo "  make print-env            Show Strapi env with secrets masked"
	@echo "  make print-creds          Re-print the Strapi/CRM sign-in details"
	@echo "  make inject-strapi-token  Re-read Strapi's tokens into the .env files"
	@echo ""
	@echo "Build"
	@echo "  make build                Build all images"
	@echo "  make build-if-missing     Build only images that do not exist yet"
	@echo "  make rebuild              Rebuild everything with --no-cache and recreate"
	@echo "  make rebuild-<service>    Rebuild and recreate a single service"
	@echo ""
	@echo "Inspection"
	@echo "  make ps | status          List services"
	@echo "  make logs                 Follow logs for all services"
	@echo "  make logs-<service>       Follow logs for one service"
	@echo "  make sh-<container>       Open a shell in a running container"
	@echo ""
	@echo "Cleanup"
	@echo "  make clean                Remove nowCRM containers, networks and volumes"
	@echo "  make clean-volumes        Remove nowCRM volumes"
	@echo "  make prune                Prune unused Docker data machine-wide (prompts)"
	@echo ""
	@echo "Overrides:  COMPOSE_FILE=$(COMPOSE_FILE) ENV_FILE=$(ENV_FILE)"
	@echo "  e.g.  COMPOSE_FILE=docker-compose.prod.yaml make ps"
	@echo ""
