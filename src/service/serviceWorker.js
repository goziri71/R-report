// Service Worker for handling push notifications
self.addEventListener("push", (event) => {
  console.log("Push event received:", event);

  // Check if push event has data
  if (!event.data) {
    console.error("❌ Push event has no data");
    return;
  }

  try {
    // Parse the push data
    const data = event.data.json();
    console.log("✅ Push data parsed successfully:", data);

    // Validate required fields
    if (!data.title) {
      console.error("❌ Push notification missing title:", data);
      return;
    }

    if (!data.body) {
      console.error("❌ Push notification missing body:", data);
      return;
    }

    const options = {
      body: data.body,
      icon: data.icon || "/images/redbiller.png",
      badge: data.badge || "/images/redbiller.png",
      data: data.data || {},
      requireInteraction: false,
      tag: data.data?.chatId ? `chat-${data.data.chatId}` : "default",
      renotify: true,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: "open",
          title: "Open Chat",
        },
        {
          action: "close",
          title: "Close",
        },
      ],
    };

    console.log("📝 Notification options prepared:", options);

    // Show the notification
    event.waitUntil(
      self.registration
        .showNotification(data.title, options)
        .then(() => {
          console.log("🎉 Notification displayed successfully!");
          setTimeout(() => {
            self.registration
              .getNotifications({
                tag: options.tag,
              })
              .then((notifications) => {
                notifications.forEach((notification) => {
                  console.log("🔄 Auto-closing notification");
                  notification.close();
                });
              });
          }, 5000);
        })
        .catch((error) => {
          console.error("❌ Error displaying notification:", error);

          // Try showing a basic notification as fallback
          return self.registration.showNotification("New Message", {
            body: "You have a new message",
            icon: "/images/redbiller.png",
          });
        })
    );
  } catch (error) {
    console.error("❌ Error parsing push data:", error);
    console.log("Raw event.data:", event.data);

    // Try to get raw text data
    try {
      const textData = event.data.text();
      console.log("Raw text data:", textData);
    } catch (textError) {
      console.error("❌ Could not get text data:", textError);
    }

    // Show a fallback notification
    event.waitUntil(
      self.registration.showNotification("New Message", {
        body: "You have a new message (parsing failed)",
        icon: "/images/redbiller.png",
      })
    );
  }
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("🖱️ Notification clicked:", event);
  console.log("Action:", event.action);
  console.log("Notification data:", event.notification.data);

  // Close the notification
  event.notification.close();

  // Handle different actions
  if (event.action === "close") {
    console.log("❌ Notification dismissed");
    return;
  }

  // For "open" action or default click
  if (event.action === "open" || !event.action) {
    const urlToOpen = event.notification.data?.url || "/";
    console.log("🔗 Opening URL:", urlToOpen);

    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {
          console.log(`👥 Found ${clientList.length} client(s)`);

          // Try to find and focus existing window
          for (let client of clientList) {
            console.log("🔍 Checking client:", client.url);

            if (client.url.includes(urlToOpen) && "focus" in client) {
              console.log("✅ Found matching window, focusing");
              return client.focus();
            }
          }

          // Try to find any app window and navigate it
          for (let client of clientList) {
            if (
              client.url.includes(self.location.origin) &&
              "focus" in client
            ) {
              console.log("✅ Found app window, navigating to chat");

              if ("navigate" in client) {
                return client.navigate(urlToOpen).then(() => client.focus());
              } else {
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
          console.log("🆕 Opening new window");
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
        .catch((error) => {
          console.error("❌ Error handling notification click:", error);
        })
    );
  }
});

// Add error handlers
self.addEventListener("error", (event) => {
  console.error("🚨 Service Worker Error:", event.error);
});

self.addEventListener("unhandledrejection", (event) => {
  console.error("🚨 Unhandled Promise Rejection in SW:", event.reason);
});

// Debug service worker activation
self.addEventListener("activate", (event) => {
  console.log("🔄 Service Worker activated");
  event.waitUntil(clients.claim());
});

// Debug service worker installation
self.addEventListener("install", (event) => {
  console.log("📦 Service Worker installed");
  self.skipWaiting();
});
