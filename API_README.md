# API Documentation Guide

This project includes comprehensive API documentation for the Report System RDP backend API.

## Files Included

1. **`API_DOCUMENTATION.md`** - Human-readable API documentation in Markdown format
2. **`swagger.json`** - OpenAPI 3.0 specification file
3. **`swagger-ui.html`** - Interactive Swagger UI interface

## How to Use

### Option 1: Interactive Swagger UI (Recommended)

1. Open `swagger-ui.html` in your web browser
2. The Swagger UI will automatically load the API specification
3. You can:
   - Browse all available endpoints
   - See request/response schemas
   - Test API calls directly from the browser
   - View authentication requirements

### Option 2: Markdown Documentation

1. Open `API_DOCUMENTATION.md` in any Markdown viewer
2. Read through the comprehensive endpoint descriptions
3. Copy example requests for your frontend implementation

### Option 3: Programmatic Integration

1. Use the `swagger.json` file with any OpenAPI-compatible tool
2. Import into tools like:
   - Postman
   - Insomnia
   - Swagger Codegen
   - OpenAPI Generator

## Setting Up for Your Hosted Server

### 1. Update Base URL

In both `swagger.json` and `API_DOCUMENTATION.md`, replace:

```
https://your-hosted-server.com
```

With your actual hosted server URL, for example:

```
https://myapp.herokuapp.com
```

### 2. Deploy Documentation

You can deploy these files to:

- Your server's public directory
- GitHub Pages
- Any static hosting service
- Include in your frontend project

### 3. Frontend Integration

Your frontend developers can:

- Use the Swagger UI to understand API endpoints
- Copy request examples directly into their code
- Understand authentication requirements
- See all available endpoints and their parameters

## API Features

### Authentication

- JWT-based authentication
- Bearer token in Authorization header
- Token expires after 24 hours

### Rate Limiting

- Global rate limiting for all endpoints
- Stricter rate limiting for authentication endpoints

### File Uploads

- Support for multipart/form-data
- Maximum file size: 10MB
- Supported for incident reports and chat messages

### Real-time Features

- WebSocket support via Socket.IO
- Real-time chat functionality
- Push notifications

## Endpoint Categories

1. **Authentication** - User login and session management
2. **Incident Management** - Report creation and management
3. **Chat System** - Real-time messaging and file sharing
4. **Weekly Reports** - Periodic reporting system
5. **Admin Management** - User and system administration
6. **Event Management** - Event creation and management
7. **Push Notifications** - Subscription management

## Error Handling

All endpoints return consistent error responses:

```json
{
  "status": false,
  "message": "Error description"
}
```

## Success Responses

Successful operations return:

```json
{
  "status": true,
  "code": 200,
  "message": "Success message",
  "data": { ... }
}
```

## CORS Configuration

The API allows requests from:

- Local development servers (localhost:5173, localhost:5174)
- Your production frontend domains

## Environment Variables

Make sure your server has these environment variables configured:

- `PORT` - Server port (default: 4000)
- `JWT_SECRET` - Secret for JWT tokens
- Database connection details
- MongoDB connection string

## Getting Started

1. **For Frontend Developers:**

   - Open `swagger-ui.html` to explore the API
   - Use the interactive interface to test endpoints
   - Copy example requests for implementation

2. **For API Consumers:**

   - Read `API_DOCUMENTATION.md` for detailed explanations
   - Use `swagger.json` with your preferred API client
   - Start with authentication endpoints to get JWT tokens

3. **For Integration:**
   - Use the OpenAPI specification with code generation tools
   - Import into API testing tools
   - Generate client libraries for your preferred language

## Support

If you need help with the API:

1. Check the Swagger UI for endpoint details
2. Review the Markdown documentation
3. Test endpoints using the interactive interface
4. Check server logs for detailed error information

## Updates

When you add new endpoints or modify existing ones:

1. Update `swagger.json` with the new OpenAPI specification
2. Update `API_DOCUMENTATION.md` with human-readable descriptions
3. The Swagger UI will automatically reflect changes from `swagger.json`

---

**Note:** This documentation is generated from your actual codebase and reflects the current API structure. Keep it updated as you develop new features or modify existing endpoints.
