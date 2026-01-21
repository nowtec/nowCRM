FROM golang:1.25.3 as builder

# Build auth plugin
COPY ./auth-plugin/ /auth-plugin
RUN cd /auth-plugin && go mod download && go build -buildmode=plugin -o auth-plugin.so .

FROM krakend:2.12

# Enable KrakenD Flexible Configuration for runtime environment variable substitution
ENV FC_ENABLE=1

# Install jq and bash for endpoint generation scripts
RUN apk update && apk add --no-cache jq bash

# Copy files needed for endpoint generation (maintaining directory structure)
COPY ./scripts/ /tmp/krakend/scripts/
COPY ./endpoints/ /tmp/krakend/endpoints/
COPY ./krakend.json /tmp/krakend/krakend.json
RUN chmod +x /tmp/krakend/scripts/*.sh

# Generate Strapi endpoints and merge into krakend.json
WORKDIR /tmp/krakend
RUN ./scripts/generate-strapi-endpoints.sh && \
    ./scripts/merge-endpoints.sh && \
    cp krakend.json /etc/krakend/krakend.json

# Ensure config file is readable
RUN chmod 644 /etc/krakend/krakend.json

# Validate config syntax with dummy env vars (Flexible Config requires env vars to be set)
# These dummy values are only used for validation - actual values come from runtime env
RUN KRAKEND_STRAPI_URL=http://strapi:1337 \
    KRAKEND_DAL_URL=http://dal:6001 \
    KRAKEND_COMPOSER_URL=http://composer:3020 \
    KRAKEND_JOURNEYS_URL=http://journeys:3010 \
    krakend check --lint-no-network -c /etc/krakend/krakend.json

# Copy plugins
COPY --from=builder /auth-plugin/auth-plugin.so /etc/krakend/plugins/

# Run Krakend
CMD ["krakend", "run", "-c", "/etc/krakend/krakend.json"]
