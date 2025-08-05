# Frontend Implementation Guide - Unified Media Upload

## 🎯 **What Your Frontend Needs to Do**

Your frontend will have **one simple file input** that handles photos, videos, and files automatically. Here's exactly how to implement it:

## 📁 **1. HTML Structure**

Add this to your chat interface:

```html
<!-- File upload section -->
<div class="media-upload-section">
  <!-- Hidden file input -->
  <input
    type="file"
    id="mediaInput"
    accept="image/*,video/*,*/*"
    style="display: none;"
  />

  <!-- Upload button -->
  <button
    type="button"
    class="upload-btn"
    onclick="document.getElementById('mediaInput').click()"
  >
    📁 Send Media
  </button>

  <!-- Upload progress container -->
  <div id="uploadProgress" class="upload-progress-container"></div>
</div>

<!-- Chat messages container -->
<div id="chatMessages" class="chat-messages"></div>
```

## 🔧 **2. JavaScript Implementation**

Add this JavaScript to your existing socket connection:

```javascript
// === UNIFIED MEDIA UPLOAD SYSTEM ===

// 1. File input event listener
document.getElementById("mediaInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    handleFileUpload(file, currentChatId); // currentChatId should be your active chat ID
  }
  // Clear the input for next use
  event.target.value = "";
});

// 2. Unified file upload handler (Optimized for speed)
function handleFileUpload(file, chatId) {
  console.log(
    "📁 Processing file:",
    file.name,
    "Type:",
    file.type,
    "Size:",
    file.size
  );

  const reader = new FileReader();
  const tempId = Date.now().toString();

  // Show upload progress
  showUploadProgress(tempId, "Starting upload...");

  reader.onload = async (e) => {
    const base64Data = e.target.result.split(",")[1]; // Remove data URL prefix

    // For videos, skip duration extraction for faster upload
    // Duration can be extracted later if needed
    let duration = 0;

    // Only extract duration for small videos (< 10MB) to avoid blocking
    if (file.type.startsWith("video/") && file.size < 10 * 1024 * 1024) {
      try {
        const video = document.createElement("video");
        video.src = URL.createObjectURL(file);
        video.onloadedmetadata = () => {
          duration = video.duration;
          emitMediaUpload(base64Data, file, duration, chatId, tempId);
        };
        video.onerror = () => {
          // If duration extraction fails, continue without it
          emitMediaUpload(base64Data, file, 0, chatId, tempId);
        };
      } catch (error) {
        // If duration extraction fails, continue without it
        emitMediaUpload(base64Data, file, 0, chatId, tempId);
      }
    } else {
      // For large videos or non-video files, emit immediately
      emitMediaUpload(base64Data, file, 0, chatId, tempId);
    }
  };

  reader.readAsDataURL(file);
}

// 3. Emit media upload to server
function emitMediaUpload(fileData, file, duration, chatId, tempId) {
  console.log("🚀 Sending media to server:", {
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    duration: duration,
    tempId: tempId,
  });

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

// 4. Socket event listeners for media uploads
socket.on("media_delivered", (data) => {
  console.log("✅ Media uploaded successfully:", data);
  hideUploadProgress(data.tempId);
  showSuccessMessage(`${data.messageType} sent successfully!`);
});

socket.on("media_error", (data) => {
  console.error("❌ Media upload failed:", data.error);
  hideUploadProgress(data.tempId);
  showErrorMessage("Failed to send media: " + data.error);
});

// NEW: Progress tracking for better UX
socket.on("media_progress", (data) => {
  console.log("📊 Upload progress:", data.progress + "% - " + data.message);
  updateUploadProgress(data.tempId, data.progress, data.message);
});

// 5. Enhanced new_message handler for media types
socket.on("new_message", (message) => {
  console.log("🟢 New message received:", message);

  // Handle different message types
  switch (message.messageType) {
    case "photo":
      displayPhotoMessage(message);
      break;
    case "video":
      displayVideoMessage(message);
      break;
    case "file":
      displayFileMessage(message);
      break;
    case "voice":
      displayVoiceMessage(message);
      break;
    case "text":
    default:
      displayTextMessage(message);
      break;
  }
});

// 6. Media display functions
function displayPhotoMessage(message) {
  const messageElement = document.createElement("div");
  messageElement.className = "message photo-message";
  messageElement.innerHTML = `
    <div class="message-content">
      <img src="${
        message.fileData.url
      }" alt="Photo" style="max-width: 300px; max-height: 300px; border-radius: 8px;" />
      <div class="message-info">
        <span class="sender">${message.sender?.firstName} ${
    message.sender?.lastName
  }</span>
        <span class="timestamp">${new Date(
          message.createdAt
        ).toLocaleTimeString()}</span>
      </div>
    </div>
  `;
  appendMessageToChat(messageElement);
}

function displayVideoMessage(message) {
  const messageElement = document.createElement("div");
  messageElement.className = "message video-message";
  messageElement.innerHTML = `
    <div class="message-content">
      <video controls style="max-width: 300px; max-height: 300px; border-radius: 8px;">
        <source src="${message.fileData.url}" type="${
    message.fileData.mimeType
  }">
        Your browser does not support the video tag.
      </video>
      <div class="message-info">
        <span class="sender">${message.sender?.firstName} ${
    message.sender?.lastName
  }</span>
        <span class="timestamp">${new Date(
          message.createdAt
        ).toLocaleTimeString()}</span>
        ${
          message.fileData.duration
            ? `<span class="duration">${Math.round(
                message.fileData.duration
              )}s</span>`
            : ""
        }
      </div>
    </div>
  `;
  appendMessageToChat(messageElement);
}

function displayFileMessage(message) {
  const messageElement = document.createElement("div");
  messageElement.className = "message file-message";
  messageElement.innerHTML = `
    <div class="message-content">
      <div class="file-attachment">
        <div class="file-icon">📎</div>
        <div class="file-info">
          <div class="file-name">${
            message.fileData.originalName || message.fileData.filename
          }</div>
          <div class="file-size">${formatFileSize(message.fileData.size)}</div>
        </div>
        <a href="${message.fileData.url}" download="${
    message.fileData.originalName || message.fileData.filename
  }" class="download-btn">Download</a>
      </div>
      <div class="message-info">
        <span class="sender">${message.sender?.firstName} ${
    message.sender?.lastName
  }</span>
        <span class="timestamp">${new Date(
          message.createdAt
        ).toLocaleTimeString()}</span>
      </div>
    </div>
  `;
  appendMessageToChat(messageElement);
}

function displayVoiceMessage(message) {
  const messageElement = document.createElement("div");
  messageElement.className = "message voice-message";
  messageElement.innerHTML = `
    <div class="message-content">
      <div class="voice-attachment">
        <div class="voice-icon">🎤</div>
        <audio controls>
          <source src="${message.fileData.url}" type="${
    message.fileData.mimeType
  }">
          Your browser does not support the audio tag.
        </audio>
        <div class="duration">${Math.round(
          message.fileData.duration || 0
        )}s</div>
      </div>
      <div class="message-info">
        <span class="sender">${message.sender?.firstName} ${
    message.sender?.lastName
  }</span>
        <span class="timestamp">${new Date(
          message.createdAt
        ).toLocaleTimeString()}</span>
      </div>
    </div>
  `;
  appendMessageToChat(messageElement);
}

function displayTextMessage(message) {
  const messageElement = document.createElement("div");
  messageElement.className = "message text-message";
  messageElement.innerHTML = `
    <div class="message-content">
      <div class="text">${message.content}</div>
      <div class="message-info">
        <span class="sender">${message.sender?.firstName} ${
    message.sender?.lastName
  }</span>
        <span class="timestamp">${new Date(
          message.createdAt
        ).toLocaleTimeString()}</span>
      </div>
    </div>
  `;
  appendMessageToChat(messageElement);
}

// 7. Helper functions
function appendMessageToChat(messageElement) {
  const chatContainer = document.getElementById("chatMessages");
  if (chatContainer) {
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight; // Auto-scroll to bottom
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function showUploadProgress(tempId, message) {
  const progressContainer = document.getElementById("uploadProgress");
  const progressElement = document.createElement("div");
  progressElement.id = `progress-${tempId}`;
  progressElement.className = "upload-progress";
  progressElement.innerHTML = `
    <div class="progress-content">
      <div class="spinner"></div>
      <span>${message}</span>
    </div>
  `;

  if (progressContainer) {
    progressContainer.appendChild(progressElement);
  }
}

function hideUploadProgress(tempId) {
  const progressElement = document.getElementById(`progress-${tempId}`);
  if (progressElement) {
    progressElement.remove();
  }
}

// NEW: Update progress with percentage
function updateUploadProgress(tempId, progress, message) {
  const progressElement = document.getElementById(`progress-${tempId}`);
  if (progressElement) {
    progressElement.innerHTML = `
      <div class="progress-content">
        <div class="spinner"></div>
        <span>${message} (${progress}%)</span>
      </div>
    `;
  }
}

function showSuccessMessage(message) {
  // You can use toast notifications, alerts, or custom UI
  console.log("✅ " + message);
  // Example: showToast(message, "success");
}

function showErrorMessage(message) {
  // You can use toast notifications, alerts, or custom UI
  console.error("❌ " + message);
  // Example: showToast(message, "error");
}
```

## 🎨 **3. CSS Styling**

Add this CSS for a nice look:

```css
/* Media upload section */
.media-upload-section {
  padding: 10px;
  border-top: 1px solid #eee;
  background: #f9f9f9;
}

.upload-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.upload-btn:hover {
  background: #0056b3;
}

/* Upload progress */
.upload-progress-container {
  margin-top: 10px;
}

.upload-progress {
  background: #e3f2fd;
  border: 1px solid #2196f3;
  border-radius: 4px;
  padding: 8px 12px;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
}

.progress-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Message styles */
.message {
  margin: 10px 0;
  padding: 10px;
  border-radius: 8px;
  max-width: 70%;
}

.message.sent {
  background: #007bff;
  color: white;
  margin-left: auto;
}

.message.received {
  background: #f1f1f1;
  color: #333;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.message-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  opacity: 0.8;
}

/* File attachment styles */
.file-attachment {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.file-icon {
  font-size: 24px;
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: bold;
  margin-bottom: 2px;
}

.file-size {
  font-size: 12px;
  opacity: 0.8;
}

.download-btn {
  background: #28a745;
  color: white;
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.download-btn:hover {
  background: #218838;
}

/* Voice attachment styles */
.voice-attachment {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.voice-icon {
  font-size: 24px;
}

.duration {
  font-size: 12px;
  opacity: 0.8;
}
```

## 🚀 **4. How It Works - Step by Step**

### **User Experience:**

1. User clicks "📁 Send Media" button
2. File picker opens (accepts images, videos, documents)
3. User selects any file
4. System automatically detects file type and uploads
5. Progress indicator shows during upload
6. File appears in chat with appropriate display (image preview, video player, or download link)

### **Technical Flow:**

1. **File Selection**: `handleFileUpload()` is called
2. **File Reading**: File is converted to base64
3. **Video Duration**: If video, duration is extracted
4. **Server Upload**: `socket.emit("send_media", ...)` sends to server
5. **Auto-Detection**: Server determines file type from MIME type
6. **Storage**: File uploaded to appropriate Supabase bucket
7. **Message Creation**: Chat message created with file data
8. **Real-Time Delivery**: Message broadcast to all chat participants
9. **Display**: Frontend receives `new_message` and displays appropriately

## 📱 **5. Integration with Your Existing Code**

### **Add to your existing socket connection:**

```javascript
// Add these event listeners to your existing socket setup
socket.on("media_delivered", handleMediaDelivered);
socket.on("media_error", handleMediaError);
socket.on("new_message", handleNewMessage); // Enhanced version
```

### **Add the file input to your HTML:**

```html
<!-- Add this near your existing chat input -->
<input
  type="file"
  id="mediaInput"
  accept="image/*,video/*,*/*"
  style="display: none;"
/>
<button onclick="document.getElementById('mediaInput').click()">
  📁 Send Media
</button>
```

### **Add the JavaScript functions:**

Copy all the JavaScript functions above into your existing script file.

## 🎯 **6. Testing Your Implementation**

1. **Test Photo Upload**: Select a .jpg or .png file
2. **Test Video Upload**: Select a .mp4 or .mov file
3. **Test File Upload**: Select a .pdf or .doc file
4. **Test Real-Time**: Open chat in two browsers and verify delivery
5. **Test Progress**: Verify upload progress indicators work
6. **Test Error Handling**: Try uploading very large files

## ✅ **What You Get**

- **One Button**: Single upload button for all file types
- **Auto-Detection**: No need to specify file type
- **Real-Time**: Instant delivery to all chat participants
- **Progress Tracking**: Visual feedback during uploads
- **Error Handling**: Clear error messages
- **Responsive Display**: Images show preview, videos play, files download

Your frontend will now have a seamless media upload experience! 🎉
