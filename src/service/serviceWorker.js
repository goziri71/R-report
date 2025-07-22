// // Service Worker for handling push notifications
// self.addEventListener("push", (event) => {
//   console.log("Push event received:", event);

//   // Add error handling for missing data
//   if (!event.data) {
//     console.log("Push event has no data");
//     return;
//   }

//   try {
//     const data = event.data.json();
//     console.log("Push data parsed:", data);

//     // Validate required fields
//     if (!data.title || !data.body) {
//       console.error("Push notification missing required fields:", data);
//       return;
//     }

//     const options = {
//       body: data.body,
//       icon: data.icon || "/icon-192x192.png",
//       badge: data.badge || "/badge-72x72.png",
//       data: data.data || {}, // Ensure data is always an object
//       requireInteraction: true,
//       tag: data.data?.chatId ? `chat-${data.data.chatId}` : "default", // Group notifications by chat
//       renotify: true, // Allow replacing existing notifications with same tag
//       vibrate: [200, 100, 200], // Add vibration pattern
//       actions: [
//         {
//           action: "open",
//           title: "Open Chat",
//           icon: "/icon-open.png", // Optional: add action icons
//         },
//         {
//           action: "close",
//           title: "Close",
//           icon: "/icon-close.png",
//         },
//       ],
//     };

//     console.log("Showing notification with options:", options);

//     event.waitUntil(
//       self.registration
//         .showNotification(data.title, options)
//         .then(() => {
//           console.log("Notification shown successfully");
//         })
//         .catch((error) => {
//           console.error("Error showing notification:", error);
//         })
//     );
//   } catch (error) {
//     console.error("Error parsing push data:", error);
//   }
// });

// // Handle notification click
// self.addEventListener("notificationclick", (event) => {
//   console.log("Notification clicked:", event);
//   console.log("Action:", event.action);
//   console.log("Notification data:", event.notification.data);

//   // Close the notification
//   event.notification.close();

//   // Handle different actions
//   if (event.action === "close") {
//     console.log("Notification dismissed");
//     return;
//   }

//   // For "open" action or default click (no action)
//   if (event.action === "open" || !event.action) {
//     const urlToOpen = event.notification.data?.url || "/";
//     console.log("Opening URL:", urlToOpen);

//     event.waitUntil(
//       clients
//         .matchAll({
//           type: "window",
//           includeUncontrolled: true,
//         })
//         .then((clientList) => {
//           console.log("Found clients:", clientList.length);

//           // First, try to find an existing chat window
//           for (let i = 0; i < clientList.length; i++) {
//             const client = clientList[i];
//             console.log("Checking client URL:", client.url);

//             // Check if the specific chat is already open
//             if (client.url.includes(urlToOpen) && "focus" in client) {
//               console.log("Found existing chat window, focusing");
//               return client.focus();
//             }
//           }

//           // If specific chat not found, check for any app window
//           for (let i = 0; i < clientList.length; i++) {
//             const client = clientList[i];

//             // Check if app is already open (adjust domain as needed)
//             if (
//               client.url.includes(self.location.origin) &&
//               "focus" in client
//             ) {
//               console.log("Found existing app window, navigating to chat");

//               // Navigate to the specific chat
//               if ("navigate" in client) {
//                 return client.navigate(urlToOpen).then(() => client.focus());
//               } else {
//                 // Fallback: focus and let the app handle routing
//                 client.postMessage({
//                   type: "NAVIGATE_TO_CHAT",
//                   url: urlToOpen,
//                   chatId: event.notification.data?.chatId,
//                 });
//                 return client.focus();
//               }
//             }
//           }

//           // No existing window found, open new one
//           console.log("No existing window found, opening new window");
//           if (clients.openWindow) {
//             return clients.openWindow(urlToOpen);
//           }
//         })
//         .catch((error) => {
//           console.error("Error handling notification click:", error);
//         })
//     );
//   }
// });

// // Handle background sync (optional - for offline message sending)
// self.addEventListener("sync", (event) => {
//   console.log("Background sync event:", event.tag);

//   if (event.tag === "chat-sync") {
//     event.waitUntil(
//       // Handle any pending chat operations
//       console.log("Handling chat sync...")
//     );
//   }
// });

// // Handle service worker activation
// self.addEventListener("activate", (event) => {
//   console.log("Service worker activated");

//   // Clean up old caches if needed
//   event.waitUntil(
//     clients.claim().then(() => {
//       console.log("Service worker now controls all pages");
//     })
//   );
// });

// // Add error handling for uncaught errors
// self.addEventListener("error", (event) => {
//   console.error("Service worker error:", event.error);
// });

// // Handle unhandled promise rejections
// self.addEventListener("unhandledrejection", (event) => {
//   console.error("Service worker unhandled promise rejection:", event.reason);
// });

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

    // const options = {
    //   body: data.body,
    //   icon: data.icon || "/icon-192x192.png",
    //   badge: data.badge || "/badge-72x72.png",
    //   data: data.data || {},
    //   requireInteraction: true,
    //   tag: data.data?.chatId ? `chat-${data.data.chatId}` : "default",
    //   renotify: true,
    //   vibrate: [200, 100, 200],
    //   actions: [
    //     {
    //       action: "open",
    //       title: "Open Chat",
    //     },
    //     {
    //       action: "close",
    //       title: "Close",
    //     },
    //   ],
    // };

    const options = {
      body: data.body,
      icon: data.icon || "/icon-192x192.png",
      badge: data.badge || "/badge-72x72.png", // Small monochrome icon (Android)

      // This is about as "colorful" as you can get
      image: data.image, // Large image preview (Android only)

      data: data.data || {},
      requireInteraction: data.urgent || false,
      tag: data.data?.chatId ? `chat-${data.data.chatId}` : "default",
      renotify: true,

      // Vibration is your main "personality" tool
      vibrate: data.urgent
        ? [200, 100, 200, 100, 300] // Urgent pattern
        : [100, 50, 100], // Normal pattern

      actions: [
        {
          action: "open",
          title: "💬 Open Chat", // Emojis are your friend for color!
          icon: "/icons/chat.png", // Small action icons
        },
        {
          action: "reply",
          title: "⚡ Quick Reply",
          icon: "/icons/reply.png",
        },
        {
          action: "dismiss",
          title: "❌ Dismiss",
          icon: "/icons/close.png",
        },
      ],

      timestamp: Date.now(),
      silent: data.silent || false,
    };

    console.log("📝 Notification options prepared:", options);

    // Show the notification
    event.waitUntil(
      self.registration
        .showNotification(data.title, options)
        .then(() => {
          console.log("🎉 Notification displayed successfully!");
        })
        .catch((error) => {
          console.error("❌ Error displaying notification:", error);

          // Try showing a basic notification as fallback
          return self.registration.showNotification("New Message", {
            body: "You have a new message",
            icon: "/icon-192x192.png",
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
        icon: "/icon-192x192.png",
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
