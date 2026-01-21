#!/bin/sh

# Script to merge all endpoint JSON files into krakend.json
#
# This script reads all .json files from the endpoints/ directory
# and merges them into the endpoints array in krakend.json
#
# Note: KrakenD uses a special template syntax like {{ env "VAR" }}
# which isn't valid JSON. This script handles this by temporarily
# escaping the template syntax during processing.
#
# Usage: ./scripts/merge-endpoints.sh

set -eu

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KRAKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENDPOINTS_DIR="${KRAKEND_DIR}/endpoints"
KRAKEND_FILE="${KRAKEND_DIR}/krakend.json"

# Check for jq
if ! command -v jq > /dev/null 2>&1; then
  printf "${RED}Error: jq is not installed.${NC}\n"
  echo "Please install jq: brew install jq (macOS) or apt-get install jq (Linux)"
  exit 1
fi

# Check if krakend.json exists
if [ ! -f "${KRAKEND_FILE}" ]; then
  printf "${RED}Error: ${KRAKEND_FILE} not found${NC}\n"
  exit 1
fi

# Check if endpoints directory exists
if [ ! -d "${ENDPOINTS_DIR}" ]; then
  printf "${RED}Error: ${ENDPOINTS_DIR} directory not found${NC}\n"
  exit 1
fi

printf "${BLUE}Merging endpoint files into krakend.json...${NC}\n\n"

# Function to escape KrakenD template syntax for jq processing
# Uses @@@ as delimiter since it won't appear in env var names
escape_krakend_syntax() {
  # Replace {{ env "VAR" }} with @@@KRAKEND_BRACE_ENV@@@VAR@@@END@@@
  # and " env "VAR" " with @@@KRAKEND_SPACE_ENV@@@VAR@@@END@@@
  sed -e 's/{{ env "\([^"]*\)" }}/@@@KRAKEND_BRACE_ENV@@@\1@@@END@@@/g' \
      -e 's/" env "\([^"]*\)" "/"@@@KRAKEND_SPACE_ENV@@@\1@@@END@@@"/g'
}

# Function to unescape KrakenD template syntax after jq processing
unescape_krakend_syntax() {
  # Restore {{ env "VAR" }} and " env "VAR" "
  sed -e 's/@@@KRAKEND_BRACE_ENV@@@\([^@]*\)@@@END@@@/{{ env "\1" }}/g' \
      -e 's/"@@@KRAKEND_SPACE_ENV@@@\([^@]*\)@@@END@@@"/" env "\1" "/g'
}

# Create temporary file for merged endpoints
TEMP_ENDPOINTS=$(mktemp)
echo '[]' > "${TEMP_ENDPOINTS}"

# Counter for files processed
FILES_PROCESSED=0
TOTAL_ENDPOINTS=0

# Find all .json files in endpoints directory (excluding subdirectories)
for endpoint_file in "${ENDPOINTS_DIR}"/*.json; do
  # Skip if no files match
  [ -e "${endpoint_file}" ] || continue
  
  filename=$(basename "${endpoint_file}")
  
  # Create temporary escaped version of the file
  TEMP_ESCAPED=$(mktemp)
  escape_krakend_syntax < "${endpoint_file}" > "${TEMP_ESCAPED}"
  
  # Validate JSON file contains an array
  if ! jq -e 'type == "array"' "${TEMP_ESCAPED}" > /dev/null 2>&1; then
    printf "${YELLOW}Warning: Skipping ${filename} - not a valid JSON array${NC}\n"
    rm "${TEMP_ESCAPED}"
    continue
  fi
  
  # Count endpoints in this file
  count=$(jq 'length' "${TEMP_ESCAPED}")
  
  printf "  ${GREEN}✓${NC} ${filename} (${count} endpoints)\n"
  
  # Merge endpoints from this file
  jq -s '.[0] + .[1]' "${TEMP_ENDPOINTS}" "${TEMP_ESCAPED}" > "${TEMP_ENDPOINTS}.tmp"
  mv "${TEMP_ENDPOINTS}.tmp" "${TEMP_ENDPOINTS}"
  
  rm "${TEMP_ESCAPED}"
  
  FILES_PROCESSED=$((FILES_PROCESSED + 1))
  TOTAL_ENDPOINTS=$((TOTAL_ENDPOINTS + count))
done

if [ "${FILES_PROCESSED}" -eq 0 ]; then
  printf "${YELLOW}Warning: No valid endpoint files found in ${ENDPOINTS_DIR}${NC}\n"
  rm "${TEMP_ENDPOINTS}"
  exit 0
fi

# Create backup of original krakend.json
BACKUP_FILE="${KRAKEND_FILE}.backup"
cp "${KRAKEND_FILE}" "${BACKUP_FILE}"
printf "\n${BLUE}Created backup: ${BACKUP_FILE}${NC}\n"

# Escape krakend.json for processing
TEMP_KRAKEND_ESCAPED=$(mktemp)
escape_krakend_syntax < "${KRAKEND_FILE}" > "${TEMP_KRAKEND_ESCAPED}"

# Merge endpoints into krakend.json
# This replaces the endpoints array while preserving all other configuration
TEMP_KRAKEND=$(mktemp)
jq --slurpfile endpoints "${TEMP_ENDPOINTS}" '.endpoints = $endpoints[0]' "${TEMP_KRAKEND_ESCAPED}" > "${TEMP_KRAKEND}"

# Unescape and write to krakend.json
unescape_krakend_syntax < "${TEMP_KRAKEND}" > "${KRAKEND_FILE}"

# Clean up
rm "${TEMP_ENDPOINTS}" "${TEMP_KRAKEND_ESCAPED}" "${TEMP_KRAKEND}"

printf "\n${GREEN}═══════════════════════════════════════════════${NC}\n"
printf "${GREEN}✓ Successfully merged ${FILES_PROCESSED} files${NC}\n"
printf "${GREEN}✓ Total endpoints: ${TOTAL_ENDPOINTS}${NC}\n"
printf "${GREEN}✓ Output: ${KRAKEND_FILE}${NC}\n"
printf "${GREEN}═══════════════════════════════════════════════${NC}\n"
