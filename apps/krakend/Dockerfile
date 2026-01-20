FROM golang:1.25.3 as builder

# Build auth plugin
COPY ./auth-plugin/ /auth-plugin
RUN cd /auth-plugin && go mod download && go build -buildmode=plugin -o auth-plugin.so .

FROM krakend:2.12

# Copy config
COPY krakend.json .

# Validate config
RUN krakend check --lint-no-network -c krakend.json

# Copy plugins
COPY --from=builder /auth-plugin/auth-plugin.so /etc/krakend/plugins/

# Run Krakend
CMD ["krakend", "run", "-c", "krakend.json"]
