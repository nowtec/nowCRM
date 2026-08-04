# Go plugins are rejected at load time unless built with the exact toolchain and
# dependency versions of the KrakenD binary. Keep this tag in lockstep with the
# runtime tag below.
FROM krakend/builder:2.12.1 AS builder

WORKDIR /auth-plugin

COPY ./auth-plugin/ ./

RUN go mod download && \
    go build -buildmode=plugin -o auth-plugin.so .

FROM krakend:2.12.1

# Enable KrakenD Flexible Configuration for runtime environment variable substitution
ENV FC_ENABLE=1

RUN apk add --no-cache jq bash

COPY ./scripts/ /tmp/krakend/scripts/
COPY ./endpoints/ /tmp/krakend/endpoints/
COPY ./krakend.json /tmp/krakend/krakend.json
RUN chmod +x /tmp/krakend/scripts/*.sh && \
    cd /tmp/krakend && \
    ./scripts/generate-strapi-endpoints.sh && \
    ./scripts/merge-endpoints.sh && \
    cp krakend.json /etc/krakend/krakend.json && \
    chmod 644 /etc/krakend/krakend.json && \
    rm -rf /tmp/krakend

COPY --from=builder /auth-plugin/auth-plugin.so /etc/krakend/plugins/

# Flexible Configuration needs these set at parse time; runtime values override them.
RUN KRAKEND_STRAPI_URL=http://strapi:1337 \
    KRAKEND_DAL_URL=http://dal:6001 \
    KRAKEND_COMPOSER_URL=http://composer:3020 \
    KRAKEND_JOURNEYS_URL=http://journeys:3010 \
    krakend check --lint-no-network -c /etc/krakend/krakend.json

# krakend.json sets `plugin.folder` to the relative path "./plugins/", so the
# working directory must be /etc/krakend or the auth plugin silently never loads.
WORKDIR /etc/krakend

EXPOSE 8080

CMD ["krakend", "run", "-c", "/etc/krakend/krakend.json"]
