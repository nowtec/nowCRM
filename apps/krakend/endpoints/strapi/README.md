# Strapi Endpoints Generator

This directory contains templates and configuration for automatically generating KrakenD endpoint configurations for Strapi collections.

## How It Works

The generator creates routes for each endpoint name you specify:

- **Collection routes**: `/strapi/api/{endpoint}` with GET, POST, PUT, DELETE methods
- **Single item routes**: `/strapi/api/{endpoint}/{id}` with GET, POST, PUT, DELETE methods

For example, if you add `"contacts"` to the endpoints list, it will generate:
- `/strapi/api/contacts` (GET, POST, PUT, DELETE)
- `/strapi/api/contacts/{id}` (GET, POST, PUT, DELETE)

## Usage

1. **Add endpoint names** to `endpoints-list.json`:
```json
[
  "contacts",
  "companies",
  "deals",
  "users"
]
```

2. **Run the generator script**:
```bash
cd apps/krakend
./scripts/generate-strapi-endpoints.sh
```

3. **Merge with krakend.json**:
```bash
./merge-endpoints.sh
```

The generated file (`strapi-generated.json`) will be automatically included when you run the merge script.

## Files

- `endpoints-list.json` - Configuration file listing all Strapi collection endpoint names
- `collection.json` - Template for collection routes (reference only)
- `single.json` - Template for single item routes (reference only)
- `../strapi-generated.json` - Generated endpoints (auto-generated, do not edit manually)

## Adding New Endpoints

To add a new Strapi collection endpoint:

1. Add the endpoint name to `endpoints-list.json`
2. Run `./scripts/generate-strapi-endpoints.sh`
3. Run `./merge-endpoints.sh` to update `krakend.json`

That's it! No need to manually create endpoint configurations.
