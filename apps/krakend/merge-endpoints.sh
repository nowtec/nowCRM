#!/bin/bash

# Script to merge all endpoint JSON files into krakend.json
# This script reads all .json files from the endpoints/ directory,
# merges their endpoint arrays, and updates krakend.json

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' 

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENDPOINTS_DIR="${SCRIPT_DIR}/endpoints"
KRAKEND_JSON="${SCRIPT_DIR}/krakend.json"

if ! command -v jq &> /dev/null; then
  echo -e "${RED}Error: jq is not installed.${NC}"
  echo "Please install jq: brew install jq (macOS) or apt-get install jq (Linux)"
  exit 1
fi

if [ ! -d "${ENDPOINTS_DIR}" ]; then
  echo -e "${RED}Error: endpoints directory not found at ${ENDPOINTS_DIR}${NC}"
  exit 1
fi

if [ ! -f "${KRAKEND_JSON}" ]; then
  echo -e "${RED}Error: krakend.json not found at ${KRAKEND_JSON}${NC}"
  exit 1
fi

ENDPOINT_FILES=$(find "${ENDPOINTS_DIR}" -name "*.json" -type f | sort)

if [ -z "${ENDPOINT_FILES}" ]; then
  echo -e "${YELLOW}Warning: No JSON files found in ${ENDPOINTS_DIR}${NC}"
  exit 1
fi

echo -e "${GREEN}Found endpoint files:${NC}"
echo "${ENDPOINT_FILES}" | sed 's/^/  - /'

TEMP_FILE=$(mktemp)

echo -e "\n${GREEN}Merging endpoints...${NC}"
jq -s 'add' $(echo "${ENDPOINT_FILES}" | tr '\n' ' ') > "${TEMP_FILE}"

ENDPOINT_COUNT=$(jq 'length' "${TEMP_FILE}")
echo -e "${GREEN}Total endpoints to merge: ${ENDPOINT_COUNT}${NC}"

echo -e "\n${GREEN}Updating krakend.json...${NC}"
jq --slurpfile endpoints "${TEMP_FILE}" '.endpoints = $endpoints[0]' "${KRAKEND_JSON}" > "${TEMP_FILE}.krakend"

mv "${TEMP_FILE}.krakend" "${KRAKEND_JSON}"

rm "${TEMP_FILE}"

echo -e "\n${GREEN}✓ Successfully merged ${ENDPOINT_COUNT} endpoints into krakend.json${NC}"
