// // Service Worker for handling push notifications
// self.addEventListener("push", (event) => {
//   console.log("Push event received:", event);

//   if (event.data) {
//     const data = event.data.json();

//     const options = {
//       body: data.body,
//       icon: data.icon || "/icon-192x192.png",
//       badge: data.badge || "/badge-72x72.png",
//       data: data.data,
//       requireInteraction: true,
//       actions: [
//         {
//           action: "open",
//           title: "Open Chat",
//         },
//         {
//           action: "close",
//           title: "Close",
//         },
//       ],
//     };

//     event.waitUntil(self.registration.showNotification(data.title, options));
//   }
// });

// // Handle notification click
// self.addEventListener("notificationclick", (event) => {
//   console.log("Notification clicked:", event);

//   event.notification.close();

//   if (event.action === "open" || !event.action) {
//     // Open the chat page
//     event.waitUntil(
//       clients.matchAll({ type: "window" }).then((clientList) => {
//         // Check if app is already open
//         for (let i = 0; i < clientList.length; i++) {
//           const client = clientList[i];
//           if (client.url.includes("/chat") && "focus" in client) {
//             return client.focus();
//           }
//         }

//         // Open new window/tab
//         if (clients.openWindow) {
//           return clients.openWindow(event.notification.data.url || "/");
//         }
//       })
//     );
//   }
// });

// sw.js - Complete version with full debugging
console.log("🚀 Service Worker script loaded and executing");

self.addEventListener("push", (event) => {
  console.log("🔔 Push event received:", event);

  try {
    console.log("📦 Event has data:", !!event.data);

    if (event.data) {
      console.log("📄 About to read data...");

      // Try to read the raw text first
      let rawData;
      try {
        rawData = event.data.text();
        console.log("📄 Raw data text:", rawData);
      } catch (textError) {
        console.error("❌ Failed to read text:", textError);
        return;
      }

      // Try to parse JSON
      let data;
      try {
        data = JSON.parse(rawData);
        console.log("📋 Parsed JSON data:", data);
      } catch (jsonError) {
        console.error("❌ Failed to parse JSON:", jsonError);
        console.log("📄 Trying event.data.json() instead...");
        try {
          data = event.data.json();
          console.log("📋 Parsed with event.data.json():", data);
        } catch (json2Error) {
          console.error("❌ Both JSON methods failed:", json2Error);
          return;
        }
      }

      console.log("📋 Title:", data.title);
      console.log("📋 Body:", data.body);

      const options = {
        body: data.body || "No body provided",
        icon: data.icon || "/icon-192x192.png",
        badge: data.badge || "/badge-72x72.png",
        data: data.data || {},
        requireInteraction: true,
        tag: "test-notification",
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

      console.log("🔔 About to show notification:");
      console.log("   Title:", data.title);
      console.log("   Options:", options);

      const notificationPromise = self.registration
        .showNotification(data.title || "No Title", options)
        .then(() => {
          console.log("✅ Notification shown successfully!");
        })
        .catch((err) => {
          console.error("❌ Failed to show notification:", err);
        });

      event.waitUntil(notificationPromise);
    } else {
      console.log("📭 No data in push event - showing fallback notification");

      const fallbackPromise = self.registration
        .showNotification("Test Push", {
          body: "Push event received with no data",
          icon: "/icon-192x192.png",
        })
        .then(() => {
          console.log("✅ Fallback notification shown");
        })
        .catch((err) => {
          console.error("❌ Fallback notification failed:", err);
        });

      event.waitUntil(fallbackPromise);
    }
  } catch (outerError) {
    console.error("❌ Outer error in push handler:", outerError);

    // Last resort notification
    const errorPromise = self.registration.showNotification("Error", {
      body: "Push handler error: " + outerError.message,
    });

    event.waitUntil(errorPromise);
  }
});

self.addEventListener("notificationclick", (event) => {
  console.log("🖱️ Notification clicked:", event);
  event.notification.close();

  if (event.action === "open" || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes("/chat") && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data?.url || "/");
        }
      })
    );
  }
});

console.log("🎯 Service Worker event listeners registered");
