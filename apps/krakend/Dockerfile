FROM krakend:2.12.0

COPY ./krakend.json ./

# Check and test that the file is valid
RUN krakend check --lint-no-network -c krakend.json