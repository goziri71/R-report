// Service Worker for handling push notifications
self.addEventListener("push", (event) => {
  console.log("Push event received:", event);

  // Add error handling for missing data
  if (!event.data) {
    console.log("Push event has no data");
    return;
  }

  try {
    const data = event.data.json();
    console.log("Push data parsed:", data);

    // Validate required fields
    if (!data.title || !data.body) {
      console.error("Push notification missing required fields:", data);
      return;
    }

    const options = {
      body: data.body,
      icon: data.icon || "/icon-192x192.png",
      badge: data.badge || "/badge-72x72.png",
      data: data.data || {}, // Ensure data is always an object
      requireInteraction: true,
      tag: data.data?.chatId ? `chat-${data.data.chatId}` : "default", // Group notifications by chat
      renotify: true, // Allow replacing existing notifications with same tag
      vibrate: [200, 100, 200], // Add vibration pattern
      actions: [
        {
          action: "open",
          title: "Open Chat",
          icon: "/icon-open.png", // Optional: add action icons
        },
        {
          action: "close",
          title: "Close",
          icon: "/icon-close.png",
        },
      ],
    };

    console.log("Showing notification with options:", options);

    event.waitUntil(
      self.registration
        .showNotification(data.title, options)
        .then(() => {
          console.log("Notification shown successfully");
        })
        .catch((error) => {
          console.error("Error showing notification:", error);
        })
    );
  } catch (error) {
    console.error("Error parsing push data:", error);
  }
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);
  console.log("Action:", event.action);
  console.log("Notification data:", event.notification.data);

  // Close the notification
  event.notification.close();

  // Handle different actions
  if (event.action === "close") {
    console.log("Notification dismissed");
    return;
  }

  // For "open" action or default click (no action)
  if (event.action === "open" || !event.action) {
    const urlToOpen = event.notification.data?.url || "/";
    console.log("Opening URL:", urlToOpen);

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {
          console.log("Found clients:", clientList.length);

          // First, try to find an existing chat window
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            console.log("Checking client URL:", client.url);

            // Check if the specific chat is already open
            if (client.url.includes(urlToOpen) && "focus" in client) {
              console.log("Found existing chat window, focusing");
              return client.focus();
            }
          }

          // If specific chat not found, check for any app window
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];

            // Check if app is already open (adjust domain as needed)
            if (
              client.url.includes(self.location.origin) &&
              "focus" in client
            ) {
              console.log("Found existing app window, navigating to chat");

              // Navigate to the specific chat
              if ("navigate" in client) {
                return client.navigate(urlToOpen).then(() => client.focus());
              } else {
                // Fallback: focus and let the app handle routing
                client.postMessage({
                  type: "NAVIGATE_TO_CHAT",
                  url: urlToOpen,
                  chatId: event.notification.data?.chatId,
                });
                return client.focus();
              }
            }
          }

          // No existing window found, open new one
          console.log("No existing window found, opening new window");
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
        .catch((error) => {
          console.error("Error handling notification click:", error);
        })
    );
  }
});

// Handle background sync (optional - for offline message sending)
self.addEventListener("sync", (event) => {
  console.log("Background sync event:", event.tag);

  if (event.tag === "chat-sync") {
    event.waitUntil(
      // Handle any pending chat operations
      console.log("Handling chat sync...")
    );
  }
});

// Handle service worker activation
self.addEventListener("activate", (event) => {
  console.log("Service worker activated");

  // Clean up old caches if needed
  event.waitUntil(
    clients.claim().then(() => {
      console.log("Service worker now controls all pages");
    })
  );
});

// Add error handling for uncaught errors
self.addEventListener("error", (event) => {
  console.error("Service worker error:", event.error);
});

// Handle unhandled promise rejections
self.addEventListener("unhandledrejection", (event) => {
  console.error("Service worker unhandled promise rejection:", event.reason);
});
