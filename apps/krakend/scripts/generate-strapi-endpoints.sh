#!/bin/bash

# Script to generate KrakenD endpoint configurations for Strapi collections
# 
# This script reads endpoint names from endpoints/strapi/endpoints-list.json
# and generates routes for:
# - /strapi/api/{endpoint} (GET, POST, PUT, DELETE)
# - /strapi/api/{endpoint}/{id} (GET, POST, PUT, DELETE)
# 
# Usage: ./scripts/generate-strapi-endpoints.sh

set -eu

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KRAKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENDPOINTS_DIR="${KRAKEND_DIR}/endpoints/strapi"
ENDPOINTS_LIST_FILE="${ENDPOINTS_DIR}/endpoints-list.json"
OUTPUT_FILE="${KRAKEND_DIR}/endpoints/strapi-generated.json"

METHODS=("GET" "POST" "PUT" "DELETE")

if ! command -v jq > /dev/null 2>&1; then
  printf "${RED}Error: jq is not installed.${NC}\n"
  echo "Please install jq: brew install jq (macOS) or apt-get install jq (Linux)"
  exit 1
fi

if [ ! -f "${ENDPOINTS_LIST_FILE}" ]; then
  printf "${RED}Error: ${ENDPOINTS_LIST_FILE} not found${NC}\n"
  echo "Please create this file with an array of endpoint names, e.g.:"
  echo '["contacts", "companies", "deals"]'
  exit 1
fi

# Validate that endpoints-list.json contains an array
if ! jq -e 'type == "array"' "${ENDPOINTS_LIST_FILE}" > /dev/null 2>&1; then
  printf "${RED}Error: endpoints-list.json must contain an array of endpoint names${NC}\n"
  exit 1
fi

ENDPOINT_COUNT=$(jq 'length' "${ENDPOINTS_LIST_FILE}")
if [ "${ENDPOINT_COUNT}" -eq 0 ]; then
  printf "${YELLOW}Warning: No endpoints found in endpoints-list.json${NC}\n"
  exit 0
fi

# Initialize empty array
TEMP_FILE=$(mktemp)
echo '[]' > "${TEMP_FILE}"

# Generate endpoints for each endpoint name
jq -r '.[]' "${ENDPOINTS_LIST_FILE}" | while IFS= read -r endpoint_name; do
  # Skip empty lines or invalid entries
  if [ -z "${endpoint_name}" ] || [ "${endpoint_name}" = "null" ]; then
    continue
  fi

  # Remove quotes from endpoint name (if any)
  endpoint_name=$(echo "${endpoint_name}" | tr -d '"')

  # Generate collection endpoints (/strapi/api/{endpoint})
  for method in "${METHODS[@]}"; do
    endpoint_json=$(jq -n \
      --arg endpoint "/strapi/api/${endpoint_name}" \
      --arg method "${method}" \
      --arg url_pattern "/api/${endpoint_name}" \
      --arg host '{{ env "KRAKEND_STRAPI_URL" }}' \
      '{
        endpoint: $endpoint,
        method: $method,
        output_encoding: "json",
        input_headers: ["Authorization","Content-Type","Content-Lenght"],
        input_query_strings: ["*"],
        backend: [{
          url_pattern: $url_pattern,
          host: [$host],
          encoding: "json",
          extra_config: {
            "backend/http": {
              headers_to_pass: ["Authorization"],
              return_error_details: "backend_status"
            }
          }
        }]
      }')
    
    jq --argjson new_endpoint "${endpoint_json}" '. += [$new_endpoint]' "${TEMP_FILE}" > "${TEMP_FILE}.tmp"
    mv "${TEMP_FILE}.tmp" "${TEMP_FILE}"
  done

  # Generate single item endpoints (/strapi/api/{endpoint}/{id})
  for method in "${METHODS[@]}"; do
    endpoint_json=$(jq -n \
      --arg endpoint "/strapi/api/${endpoint_name}/{id}" \
      --arg method "${method}" \
      --arg url_pattern "/api/${endpoint_name}/{id}" \
      --arg host '{{ env "KRAKEND_STRAPI_URL" }}' \
      '{
        endpoint: $endpoint,
        method: $method,
        output_encoding: "json",
        input_headers: ["Authorization","Content-Type","Content-Lenght"],
        input_query_strings: ["*"],
        backend: [{
          url_pattern: $url_pattern,
          host: [$host],
          encoding: "json",
          extra_config: {
            "backend/http": {
              headers_to_pass: ["Authorization"],
              return_error_details: "backend_status"
            }
          }
        }]
      }')
    
    jq --argjson new_endpoint "${endpoint_json}" '. += [$new_endpoint]' "${TEMP_FILE}" > "${TEMP_FILE}.tmp"
    mv "${TEMP_FILE}.tmp" "${TEMP_FILE}"
  done
done

# Count endpoints before modifying the file
TOTAL_ENDPOINTS=$(jq 'length' "${TEMP_FILE}")

# Write output file with proper formatting (valid JSON)
jq '.' "${TEMP_FILE}" > "${OUTPUT_FILE}.tmp"

# Fix the host field format to match KrakenD's expected format
# Replace: "{{ env \"KRAKEND_STRAPI_URL\" }}" with: "{{ env "KRAKEND_STRAPI_URL" }}"
sed 's/{{ env \\"KRAKEND_STRAPI_URL\\" }}/{{ env "KRAKEND_STRAPI_URL" }}/g' "${OUTPUT_FILE}.tmp" > "${OUTPUT_FILE}"
rm "${OUTPUT_FILE}.tmp"

rm "${TEMP_FILE}"
printf "${GREEN}✓ Generated ${TOTAL_ENDPOINTS} endpoints for ${ENDPOINT_COUNT} collections${NC}\n"
printf "${GREEN}✓ Output written to: ${OUTPUT_FILE}${NC}\n"
echo ""
echo "To merge with krakend.json, run:"
echo "  ./merge-endpoints.sh"
