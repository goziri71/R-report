# Report System RDP - API Documentation

## Base URL

```
https://r-report-v1.onrender.com/api/v1
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Error Response Format

```json
{
  "status": false,
  "message": "Error description"
}
```

## Success Response Format

```json
{
  "status": true,
  "code": 200,
  "message": "Success message",
  "data": { ... }
}
```

---

## 1. Authentication Endpoints

### Login User

- **POST** `/auth/login-user`
- **Description**: Authenticate user and get JWT token
- **Body**:
  ```json
  {
    "email_address": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "status": true,
    "code": 200,
    "message": "Login successful",
    "data": {
      "authToken": "jwt-token-here"
    }
  }
  ```

### Get Current User

- **GET** `/auth/current-user`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Get current authenticated user details
- **Response**: User object

### Update User Details (Admin)

- **PATCH** `/auth/update-userdetails-admin/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Update user details (admin only)
- **Body**: Any combination of user fields
- **Response**: Updated user object

---

## 2. Incident Management

### Create Incident Report

- **POST** `/incident/user/report`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Submit incident report with file upload
- **Body**: FormData with report details and files
- **Response**: Created report object

### Get Current User Incidents

- **GET** `/incident/current/user`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Get current user's incident reports
- **Response**: Array of incident reports

---

## 3. Chat System

### File Upload

- **POST** `/chat/upload-file`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Upload file for chat
- **Body**: FormData with file
- **Response**: File upload details

### Create Direct Message

- **POST** `/chat/direct`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Create direct chat with another user
- **Body**: Chat creation details
- **Response**: Created chat object

### Create Group Chat

- **POST** `/chat/group`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Create group chat
- **Body**: Group chat details
- **Response**: Created group chat object

### Get User Chats

- **GET** `/chat/user`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Get all chats for current user
- **Response**: Array of chat objects

### Get Chat Messages

- **GET** `/chat/:chatId/messages`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Get messages for specific chat
- **Response**: Array of message objects

### Send Message

- **POST** `/chat/:chatId/message`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Send message to chat
- **Body**: Message content
- **Response**: Created message object

### Edit Message

- **PATCH** `/chat/message/:messageId`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Edit existing message
- **Body**: Updated message content
- **Response**: Updated message object

### Delete Message

- **DELETE** `/chat/message/:messageId`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Delete message
- **Response**: Success confirmation

### Add Reaction

- **POST** `/chat/message/:messageId/reaction`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Add reaction to message
- **Body**: Reaction details
- **Response**: Added reaction object

### Remove Reaction

- **DELETE** `/chat/message/:messageId/reaction`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Remove reaction from message
- **Response**: Success confirmation

### Mark Message as Read

- **POST** `/chat/message/:messageId/read`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Mark message as read
- **Response**: Success confirmation

### Get Unread Count

- **GET** `/chat/:chatId/unread-count`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Get unread message count for chat
- **Response**: Count object

### Add Participant

- **POST** `/chat/:chatId/participants`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Add participant to group chat
- **Body**: Participant details
- **Response**: Success confirmation

### Remove Participant

- **DELETE** `/chat/:chatId/participants`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Remove participant from group chat
- **Body**: Participant details
- **Response**: Success confirmation

### Update Notification Settings

- **PUT** `/chat/:chatId/notifications`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Update chat notification settings
- **Body**: Notification settings
- **Response**: Updated settings

### Push Notification Subscription

- **POST** `/chat/push/subscribe`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Subscribe to push notifications
- **Body**: Subscription details
- **Response**: Success confirmation

### Push Notification Unsubscription

- **DELETE** `/chat/push/unsubscribe`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Unsubscribe from push notifications
- **Response**: Success confirmation

---

## 4. Weekly Reports

### Create Weekly Report

- **POST** `/user/create-report`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Create weekly report
- **Body**: Report details
- **Response**: Created report object

### Get All Department Reports

- **GET** `/user/getAll-weeklyReport`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Get all weekly reports for department
- **Response**: Array of report objects

### Edit Weekly Report

- **PATCH** `/user/editTarget-weeklyReport/:targetUser`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Edit weekly report for specific user
- **Body**: Updated report details
- **Response**: Updated report object

### Delete Weekly Report

- **DELETE** `/user/weekly-reports/:targetUser/:reportid`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Delete weekly report
- **Response**: Success confirmation

---

## 5. Admin Management

### Get All Users

- **GET** `/users`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Get all users (admin only)
- **Response**: Array of user objects

### Delete User

- **DELETE** `/admin/user-delete/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Delete user (admin only)
- **Response**: Success confirmation

### Update User Status

- **PATCH** `/admin/user-accountStat/:userId/:userStat`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Update user account status (admin only)
- **Response**: Success confirmation

### Get Single User Details

- **GET** `/single-user/details/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Get detailed user information (admin only)
- **Response**: User object

### Update User Role

- **PATCH** `/user-role/:userId`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Update user role (admin only)
- **Body**: New role
- **Response**: Success confirmation

---

## 6. Event Management

### Create Event

- **POST** `/admin/create-event`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Create new event (admin only)
- **Body**: Event details
- **Response**: Created event object

### Get All Events

- **GET** `/admin/get-all/event`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Get all events
- **Response**: Array of event objects

### Update Event

- **PATCH** `/admin/update-event/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Update event (admin only)
- **Body**: Updated event details
- **Response**: Updated event object

### Delete Event

- **DELETE** `/admin/delete-event/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Delete event (admin only)
- **Response**: Success confirmation

---

## 7. Report Management

### Get All Reports (Admin)

- **GET** `/report/admin-get/all-report`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Get all incident reports (admin only)
- **Response**: Array of report objects

### Delete Incident Report

- **DELETE** `/report/admin-delete/incidentReport/:id`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Delete incident report (admin only)
- **Response**: Success confirmation

---

## 8. Third Party Integration

### Test Login Pupil

- **POST** `/thirdparty/test/login-pupil`
- **Description**: Test endpoint for third party integration
- **Body**: Login credentials
- **Response**: Authentication result

---

## 9. Push Notifications

### Subscribe to Push

- **POST** `/subscribe`
- **Description**: Subscribe to push notifications
- **Body**: User ID and subscription details
- **Response**: Success confirmation

### Unsubscribe from Push

- **POST** `/unsubscribe`
- **Description**: Unsubscribe from push notifications
- **Body**: User ID
- **Response**: Success confirmation

---

## 10. WebSocket Events

The application also supports real-time communication via Socket.IO:

### Connection

- **Event**: `connection`
- **Description**: Client connects to server

### Chat Events

- **Event**: `join-chat`
- **Description**: Join a specific chat room

- **Event**: `leave-chat`
- **Description**: Leave a specific chat room

- **Event**: `send-message`
- **Description**: Send message to chat

- **Event**: `typing`
- **Description**: User typing indicator

---

## Rate Limiting

The API implements rate limiting:

- **Global**: General rate limiting for all endpoints
- **Auth**: Stricter rate limiting for authentication endpoints

---

## File Upload

File uploads are supported for:

- Incident reports
- Chat messages
- Profile pictures

Maximum file size: 10MB

---

## CORS Configuration

The API allows requests from:

- `http://localhost:5174`
- `http://localhost:5173`
- `https://redbiller-work-neon.vercel.app`
- `https://main.d5ival0pckjqv.amplifyapp.com`

---

## Environment Variables

Required environment variables:

- `PORT`: Server port (default: 4000)
- `JWT_SECRET`: Secret for JWT tokens
- `DB_NAME`: Database name
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_HOST`: Database host
- `DB_PORT`: Database port (default: 5432)
- `MONGODB_URI`: MongoDB connection string

---

## Notes

1. All timestamps are in ISO 8601 format
2. File uploads use multipart/form-data
3. JWT tokens expire after 24 hours
4. Admin endpoints require admin or superadmin role
5. The system uses PostgreSQL for user data and MongoDB for chat system
