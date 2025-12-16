# Swagger/OpenAPI Integration Guide

This document explains the Swagger/OpenAPI integration for the MarTech API.

## Overview

Swagger UI provides interactive API documentation that allows you to:
- Browse all available endpoints
- View request/response schemas
- Test endpoints directly from the browser
- Export OpenAPI specification for client generation

## Accessing Documentation

**Swagger UI**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

**OpenAPI JSON Spec**: [http://localhost:3000/api-docs.json](http://localhost:3000/api-docs.json)

## Features

### 1. Complete API Coverage

All endpoints are documented with:
- **Authentication** - Sign up, sign in, sign out, session management
- **Events** - Event ingestion and user journey queries
- **Monitoring** - Health checks and buffer statistics

### 2. Interactive Testing

You can test all endpoints directly from Swagger UI:

1. Click on any endpoint to expand it
2. Click "Try it out"
3. Fill in parameters or request body
4. Click "Execute"
5. View the response

### 3. Authentication Testing

To test authenticated endpoints:

1. First, sign up or sign in via the `/api/auth/sign-up/email` or `/api/auth/sign-in/email` endpoint
2. The session cookie will be automatically stored by your browser
3. All subsequent requests will include the authentication cookie
4. Test protected endpoints like `/session`

### 4. Schema Definitions

All data models are documented under "Schemas":
- **User** - User account information
- **Session** - Authentication session data
- **Event** - Event ingestion payload
- **Error** - Error response format

## Implementation Details

### Files Structure

```
src/
├── swagger.ts              # OpenAPI specification and configuration
├── index.ts                # Swagger UI middleware setup
├── routes.ts               # JSDoc annotations for endpoints
└── controllers/
    ├── auth.controller.ts  # Auth endpoint documentation
    └── events.controller.ts
```

### How It Works

1. **swagger.ts** - Defines the OpenAPI 3.0 specification:
   - API metadata (title, description, version)
   - Server URLs (dev and production)
   - Security schemes (cookie authentication)
   - Reusable schemas (User, Session, Event, Error)

2. **JSDoc Annotations** - Route documentation using `@swagger` tags:
   ```typescript
   /**
    * @swagger
    * /events:
    *   post:
    *     tags:
    *       - Events
    *     summary: Ingest one or more events
    *     ...
    */
   ```

3. **swagger-jsdoc** - Parses JSDoc comments and merges with base spec

4. **swagger-ui-express** - Serves the interactive documentation UI

### Adding New Endpoints

To document a new endpoint:

1. Add JSDoc comment above the route registration in `routes.ts`:

```typescript
/**
 * @swagger
 * /your-endpoint:
 *   get:
 *     tags:
 *       - YourTag
 *     summary: Brief description
 *     description: Detailed description
 *     parameters:
 *       - in: query
 *         name: paramName
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.get('/your-endpoint', handler);
```

2. If you need a new schema, add it to `swagger.ts` under `components.schemas`

3. Restart the server - changes are picked up automatically

## Best Practices

1. **Always include examples** - Add example values for better clarity
2. **Document all responses** - Include success and error cases
3. **Use schema references** - Reference shared schemas with `$ref: '#/components/schemas/SchemaName'`
4. **Tag endpoints logically** - Group related endpoints with tags
5. **Describe security requirements** - Use `security` field for protected endpoints

## Export and Integration

### Generate Client SDK

You can use the OpenAPI spec to generate client SDKs:

```bash
# Download the spec
curl http://localhost:3000/api-docs.json > openapi.json

# Generate TypeScript client
npx @openapitools/openapi-generator-cli generate \
  -i openapi.json \
  -g typescript-axios \
  -o ./generated-client
```

### Import to Postman

1. Open Postman
2. Click "Import"
3. Enter URL: `http://localhost:3000/api-docs.json`
4. Click "Import"

All endpoints will be available in Postman with proper documentation.

### Import to Insomnia

1. Open Insomnia
2. Click "Create" → "Import From"
3. Select "URL"
4. Enter: `http://localhost:3000/api-docs.json`
5. Click "Fetch and Import"

## Troubleshooting

### Documentation not updating

1. Restart the server
2. Clear browser cache
3. Check for JSDoc syntax errors in routes.ts

### Endpoints missing

1. Verify JSDoc comments have `@swagger` tag
2. Check that route file is included in `swagger.ts` `apis` array
3. Ensure route is actually registered in Express

### Authentication not working

1. Make sure you've signed in first via `/api/auth/sign-in/email`
2. Check that cookies are enabled in your browser
3. For cross-origin requests, ensure CORS is properly configured

## Resources

- [Swagger/OpenAPI Specification](https://swagger.io/specification/)
- [swagger-jsdoc Documentation](https://github.com/Surnet/swagger-jsdoc)
- [swagger-ui-express Documentation](https://github.com/scottie1984/swagger-ui-express)
- [OpenAPI Generator](https://openapi-generator.tech/)
