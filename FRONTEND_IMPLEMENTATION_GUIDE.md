# Frontend Implementation Guide - Complete API Reference

## 🎯 **API Base URL**

```
Base URL: http://localhost:4000/api/v1
Production: https://your-domain.com/api/v1
```

## 🔐 **Authentication**

All endpoints (except login and third-party) require Authorization header:

```javascript
headers: {
  'Authorization': `Bearer ${authToken}`,
  'Content-Type': 'application/json'
}
```

---

## 📚 **Complete API Endpoints**

### 🔑 **Authentication Endpoints**

**Base Path: `/api/v1/auth`**

#### 1. Login User

```javascript
POST /api/v1/auth/login-user
Body: {
  "email_address": "user@example.com",
  "password": "password123"
}
Response: {
  "status": true,
  "code": 200,
  "message": "Login successful",
  "data": {
    "user": { id, email, firstName, lastName, role, occupation },
    "authToken": "jwt_token_here"
  }
}
```

#### 2. Get Current User

```javascript
GET /api/v1/auth/current-user
Headers: { Authorization: "Bearer token" }
Response: {
  "status": true,
  "data": { id, email, firstName, lastName, role, occupation }
}
```

#### 3. Update User Details (Admin Only)

```javascript
PATCH /api/v1/auth/update-userdetails-admin/:id
Headers: { Authorization: "Bearer token" }
Body: {
  "firstName": "John",
  "lastName": "Doe",
  "occupation": "product",
  "role": "admin"
}
```

---

### 👥 **User Management Endpoints**

**Base Path: `/api/v1`**

#### 1. Get All Users (Admin)

```javascript
GET /api/v1/users
Headers: { Authorization: "Bearer token" }
Response: {
  "status": true,
  "data": [
    { id, email, firstName, lastName, role, occupation, isActive }
  ]
}
```

#### 2. Delete User (Admin)

```javascript
DELETE /api/v1/admin/user-delete/:id
Headers: { Authorization: "Bearer token" }
```

#### 3. Update User Status (Admin)

```javascript
PATCH /api/v1/admin/user-accountStat/:userId/:userStat
Headers: { Authorization: "Bearer token" }
// userStat: "active" or "inactive"
```

#### 4. Get Single User Details

```javascript
GET /api/v1/single-user/details/:id
Headers: { Authorization: "Bearer token" }
```

#### 5. Update User Role (Admin)

```javascript
PATCH /api/v1/user-role/:userId
Headers: { Authorization: "Bearer token" }
Body: {
  "role": "admin" // or "user", "superadmin"
}
```

---

### 📋 **Task Management Endpoints**

**Base Path: `/api/v1/task`**

#### 1. Create Task

```javascript
POST /api/v1/task/create-task
Headers: { Authorization: "Bearer token" }
Body: {
  "title": "Task title",
  "description": "Task description",
  "priority": "high", // "low", "medium", "high"
  "status": "to_do" // "to_do", "in_progress", "completed", "confirmed"
}
Response: {
  "code": 201,
  "status": true,
  "message": "Task created successfully",
  "data": { task_object }
}
```

#### 2. Get Tasks

```javascript
GET /api/v1/task/get-tasks
Headers: { Authorization: "Bearer token" }
Response: {
  "code": 200,
  "status": true,
  "message": "Tasks retrieved successfully",
  "data": [{ task_objects }]
}
```

#### 3. Edit Task

```javascript
PATCH /api/v1/task/edit-task/:id
Headers: { Authorization: "Bearer token" }
Body: {
  "title": "Updated title",
  "description": "Updated description",
  "priority": "medium",
  "status": "confirmed" // This triggers email to admins
}
Response: {
  "code": 200,
  "status": true,
  "message": "Task updated successfully",
  "data": { updated_task }
}
```

#### 4. Delete Task

```javascript
DELETE /api/v1/task/delete-task/:id
Headers: { Authorization: "Bearer token" }
```

#### 5. Assign Task (Admin Only)

```javascript
POST /api/v1/task/assign-task/:recipientId
Headers: { Authorization: "Bearer token" }
Body: {
  "title": "Assigned task",
  "description": "Task description",
  "priority": "high",
  "status": "to_do"
}
```

#### 6. Convert Tasks to Weekly Report (Admin Only)

```javascript
POST /api/v1/task/task-to-weekly-report
Headers: { Authorization: "Bearer token" }
Response: {
  "status": true,
  "message": "Weekly report created successfully",
  "data": { "reportId": 123 }
}
```

---

### 📊 **Weekly Report Endpoints**

**Base Path: `/api/v1/user`**

#### 1. Create Weekly Report

```javascript
POST /api/v1/user/create-report
Headers: { Authorization: "Bearer token" }
Body: {
  "ActionItem": ["Task 1", "Task 2"],
  "OngoingTask": ["Ongoing 1", "Ongoing 2"],
  "CompletedTask": ["Completed 1", "Completed 2"],
  "status": "submitted" // or "draft"
}
```

#### 2. Save Draft

```javascript
PATCH /api/v1/user/drafts/:reportId
Headers: { Authorization: "Bearer token" }
Body: {
  "ActionItem": ["Updated task"],
  "OngoingTask": ["Updated ongoing"],
  "CompletedTask": ["Updated completed"]
}
```

#### 3. Submit Draft

```javascript
POST /api/v1/user/drafts/:reportId/submit
Headers: { Authorization: "Bearer token" }
```

#### 4. Get My Drafts

```javascript
GET / api / v1 / user / my - drafts;
Headers: {
  Authorization: "Bearer token";
}
```

#### 5. Get All Department Reports (Admin)

```javascript
GET / api / v1 / user / getAll - weeklyReport;
Headers: {
  Authorization: "Bearer token";
}
```

#### 6. Edit Weekly Report (Admin)

```javascript
PATCH /api/v1/user/editTarget-weeklyReport/:targetUser
Headers: { Authorization: "Bearer token" }
```

#### 7. Delete Weekly Report (Admin)

```javascript
DELETE /api/v1/user/weekly-reports/:targetUser/:reportid
Headers: { Authorization: "Bearer token" }
```

---

### 🚨 **Incident Reporting Endpoints**

**Base Path: `/api/v1/incident`**

#### 1. Submit Incident Report

```javascript
POST /api/v1/incident/user/report
Headers: { Authorization: "Bearer token" }
Content-Type: multipart/form-data
FormData: {
  "message": "Incident description",
  "subject": "Incident subject",
  "photo": file, // Optional
  "voiceNote": file // Optional
}
Response: {
  "code": 201,
  "status": true,
  "message": "Incident report submitted successfully",
  "data": { incident_object }
}
```

#### 2. Get Current User (Duplicate)

```javascript
GET / api / v1 / incident / current / user;
Headers: {
  Authorization: "Bearer token";
}
```

---

### 📑 **Report Management Endpoints**

**Base Path: `/api/v1/report`**

#### 1. Get All Reports (Admin)

```javascript
GET /api/v1/report/admin-get/all-report
Headers: { Authorization: "Bearer token" }
Response: {
  "status": true,
  "data": [{ incident_reports }]
}
```

#### 2. Delete Incident Report (Admin)

```javascript
DELETE /api/v1/report/admin-delete/incidentReport/:id
Headers: { Authorization: "Bearer token" }
```

---

### 📅 **Event Management Endpoints**

**Base Path: `/api/v1/admin`**

#### 1. Create Event (Admin Only)

```javascript
POST /api/v1/admin/create-event
Headers: { Authorization: "Bearer token" }
Body: {
  "eventTitle": "Event Title",
  "eventDescription": "Event Description",
  "eventDate": "05152025", // MMDDYYYY format
  "eventTime": "9:00 AM" // HH:MM AM/PM format
}
Response: {
  "code": 201,
  "status": "successful",
  "data": { event_object }
}
```

#### 2. Get All Events

```javascript
GET /api/v1/admin/get-all/event
Headers: { Authorization: "Bearer token" }
Query Parameters: ?page=1&limit=10
Response: {
  "status": true,
  "data": [{ event_objects }]
}
```

#### 3. Update Event (Admin Only)

```javascript
PATCH /api/v1/admin/update-event/:id
Headers: { Authorization: "Bearer token" }
Body: {
  "eventTitle": "Updated Title",
  "eventDescription": "Updated Description",
  "eventDate": "06152025",
  "eventTime": "2:00 PM"
}
```

#### 4. Delete Event (Admin Only)

```javascript
DELETE /api/v1/admin/delete-event/:id
Headers: { Authorization: "Bearer token" }
```

---

### 💬 **Chat Endpoints**

**Base Path: `/api/v1/chat`**

#### 1. Upload File

```javascript
POST /api/v1/chat/upload-file
Headers: { Authorization: "Bearer token" }
Content-Type: multipart/form-data
FormData: {
  "file": file_object
}
```

#### 2. Create Direct Chat

```javascript
POST /api/v1/chat/direct
Headers: { Authorization: "Bearer token" }
Body: {
  "participants": [userId1, userId2]
}
```

#### 3. Create Group Chat

```javascript
POST /api/v1/chat/group
Headers: { Authorization: "Bearer token" }
Body: {
  "name": "Group Name",
  "participants": [userId1, userId2, userId3]
}
```

#### 4. Get User Chats

```javascript
GET / api / v1 / chat / user;
Headers: {
  Authorization: "Bearer token";
}
```

#### 5. Get Chat Messages

```javascript
GET /api/v1/chat/:chatId/messages
Headers: { Authorization: "Bearer token" }
```

#### 6. Get Unread Messages Count

```javascript
GET /api/v1/chat/:chatId/unread-count
Headers: { Authorization: "Bearer token" }
```

#### 7. Send Message

```javascript
POST /api/v1/chat/:chatId/message
Headers: { Authorization: "Bearer token" }
Body: {
  "content": "Message content",
  "messageType": "text" // "text", "photo", "video", "file", "voice"
}
```

#### 8. Edit Message

```javascript
PATCH /api/v1/chat/message/:messageId
Headers: { Authorization: "Bearer token" }
Body: {
  "content": "Updated message content"
}
```

#### 9. Delete Message

```javascript
DELETE /api/v1/chat/message/:messageId
Headers: { Authorization: "Bearer token" }
```

#### 10. Mark Message as Read

```javascript
POST /api/v1/chat/message/:messageId/read
Headers: { Authorization: "Bearer token" }
```

#### 11. Add Reaction

```javascript
POST /api/v1/chat/message/:messageId/reaction
Headers: { Authorization: "Bearer token" }
Body: {
  "emoji": "👍"
}
```

#### 12. Remove Reaction

```javascript
DELETE /api/v1/chat/message/:messageId/reaction
Headers: { Authorization: "Bearer token" }
Body: {
  "emoji": "👍"
}
```

#### 13. Add Participant (Group Chat)

```javascript
POST /api/v1/chat/:chatId/participants
Headers: { Authorization: "Bearer token" }
Body: {
  "userId": 123
}
```

#### 14. Remove Participant (Group Chat)

```javascript
DELETE /api/v1/chat/:chatId/participants
Headers: { Authorization: "Bearer token" }
Body: {
  "userId": 123
}
```

#### 15. Update Notification Settings

```javascript
PUT /api/v1/chat/:chatId/notifications
Headers: { Authorization: "Bearer token" }
Body: {
  "muted": true // or false
}
```

#### 16. Subscribe to Push Notifications

```javascript
POST /api/v1/chat/push/subscribe
Headers: { Authorization: "Bearer token" }
Body: {
  "subscription": {
    "endpoint": "...",
    "keys": { "p256dh": "...", "auth": "..." }
  }
}
```

#### 17. Unsubscribe from Push Notifications

```javascript
DELETE / api / v1 / chat / push / unsubscribe;
Headers: {
  Authorization: "Bearer token";
}
```

---

### 🔌 **Third Party Endpoints**

**Base Path: `/api/v1/thirdparty`**

#### 1. Test Login (No Auth Required)

```javascript
POST / api / v1 / thirdparty / test / login - pupil;
Body: {
  // Third party login data
}
```

---

### 📱 **Push Notification Endpoints**

**Base Path: `/api`**

#### 1. Subscribe to Push Notifications

```javascript
POST /api/subscribe
Body: {
  "userId": 123,
  "subscription": {
    "endpoint": "...",
    "keys": { "p256dh": "...", "auth": "..." }
  }
}
```

#### 2. Unsubscribe from Push Notifications

```javascript
POST /api/unsubscribe
Body: {
  "userId": 123
}
```

---

## 🔌 **Socket.IO Events**

### Connection

```javascript
const socket = io("http://localhost:4000");

// Join user to their personal room
socket.emit("join_user_room", { userId: currentUserId });

// Join specific chat room
socket.emit("join_chat", { chatId: "chat_123" });
```

### Chat Events

```javascript
// Send media (photos, videos, files)
socket.emit("send_media", {
  chatId: "chat_123",
  fileData: "base64_data",
  fileName: "image.jpg",
  mimeType: "image/jpeg",
  fileSize: 123456,
  duration: 0, // for videos/audio
  tempId: "temp_123",
});

// Listen for new messages
socket.on("new_message", (message) => {
  console.log("New message:", message);
  // Handle different message types: text, photo, video, file, voice
});

// Listen for media upload progress
socket.on("media_progress", (data) => {
  console.log(`Upload progress: ${data.progress}% - ${data.message}`);
});

// Listen for successful media delivery
socket.on("media_delivered", (data) => {
  console.log("Media uploaded successfully:", data);
});

// Listen for media upload errors
socket.on("media_error", (data) => {
  console.error("Media upload failed:", data.error);
});

// Listen for message reactions
socket.on("message_reaction", (data) => {
  console.log("Reaction added/removed:", data);
});

// Listen for message edits
socket.on("message_edited", (data) => {
  console.log("Message edited:", data);
});

// Listen for message deletions
socket.on("message_deleted", (data) => {
  console.log("Message deleted:", data);
});
```

---

## 🎨 **Frontend Implementation Examples**

### Authentication Setup

```javascript
class AuthService {
  constructor() {
    this.baseURL = "http://localhost:4000/api/v1";
    this.token = localStorage.getItem("authToken");
  }

  async login(email, password) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (data.status) {
        this.token = data.data.authToken;
        localStorage.setItem("authToken", this.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        return data;
      }
      throw new Error(data.message);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  logout() {
    this.token = null;
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  }

  getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }
}
```

### Task Management

```javascript
class TaskService {
  constructor(authService) {
    this.auth = authService;
    this.baseURL = "http://localhost:4000/api/v1/task";
  }

  async createTask(taskData) {
    const response = await fetch(`${this.baseURL}/create-task`, {
      method: "POST",
      headers: this.auth.getAuthHeaders(),
      body: JSON.stringify(taskData),
    });
    return response.json();
  }

  async getTasks() {
    const response = await fetch(`${this.baseURL}/get-tasks`, {
      headers: this.auth.getAuthHeaders(),
    });
    return response.json();
  }

  async updateTask(taskId, updates) {
    const response = await fetch(`${this.baseURL}/edit-task/${taskId}`, {
      method: "PATCH",
      headers: this.auth.getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return response.json();
  }

  async deleteTask(taskId) {
    const response = await fetch(`${this.baseURL}/delete-task/${taskId}`, {
      method: "DELETE",
      headers: this.auth.getAuthHeaders(),
    });
    return response.json();
  }
}
```

### Media Upload for Chat

```javascript
// File input event listener
document.getElementById("mediaInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    handleFileUpload(file, currentChatId);
  }
  event.target.value = "";
});

// Unified file upload handler
function handleFileUpload(file, chatId) {
  const reader = new FileReader();
  const tempId = Date.now().toString();

  showUploadProgress(tempId, "Starting upload...");

  reader.onload = async (e) => {
    const base64Data = e.target.result.split(",")[1];
    let duration = 0;

    if (file.type.startsWith("video/") && file.size < 10 * 1024 * 1024) {
      try {
        const video = document.createElement("video");
        video.src = URL.createObjectURL(file);
        video.onloadedmetadata = () => {
          duration = video.duration;
          emitMediaUpload(base64Data, file, duration, chatId, tempId);
        };
      } catch (error) {
        emitMediaUpload(base64Data, file, 0, chatId, tempId);
      }
    } else {
      emitMediaUpload(base64Data, file, 0, chatId, tempId);
    }
  };

  reader.readAsDataURL(file);
}

// Emit media upload to server
function emitMediaUpload(fileData, file, duration, chatId, tempId) {
  socket.emit("send_media", {
    chatId: chatId,
    fileData: fileData,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    duration: duration,
    tempId: tempId,
  });
}
```

---

## 🎯 **Key Features Implemented**

### ✅ **Task Management**

- Create, read, update, delete tasks
- Task assignment (admin only)
- Status tracking with email notifications
- Priority levels and department-based filtering
- Convert tasks to weekly reports

### ✅ **Real-time Chat**

- Direct and group messaging
- File uploads (photos, videos, documents)
- Message reactions and editing
- Read receipts and notifications
- Push notification support

### ✅ **Incident Reporting**

- Submit incidents with photos and voice notes
- Email notifications to all users
- Admin can view and delete reports

### ✅ **Event Management**

- Create company-wide events
- Date/time validation
- Admin-only event management
- Pagination support

### ✅ **User Management**

- Role-based access control
- Account activation/deactivation
- Department-based permissions
- Profile management

### ✅ **Weekly Reporting**

- Draft and submit reports
- Department-specific reporting
- Admin oversight and editing

---

## 🚀 **Getting Started Checklist**

1. **Setup Authentication**: Implement login/logout functionality
2. **Initialize Socket.IO**: Connect to real-time events
3. **Create Services**: Build API service classes for each module
4. **Handle Errors**: Implement proper error handling and user feedback
5. **Add Loading States**: Show progress indicators for API calls
6. **Implement Routing**: Set up navigation between different modules
7. **Test Features**: Verify all endpoints work with your frontend

---

## 📱 **Mobile Considerations**

- All endpoints support CORS for cross-origin requests
- File uploads work with mobile camera/gallery
- Push notifications supported for real-time updates
- Responsive design considerations for mobile UI

This comprehensive guide covers all available API endpoints and provides practical implementation examples for your frontend development! 🎉
