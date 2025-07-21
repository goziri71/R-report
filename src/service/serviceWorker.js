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

console.log("🚀 MINIMAL SW LOADED");

self.addEventListener("push", function (event) {
  console.log("🔔 PUSH RECEIVED");
  console.log("Event:", event);
  console.log("Has data:", event.data ? "YES" : "NO");

  // Force a notification no matter what
  event.waitUntil(
    self.registration.showNotification("FORCE NOTIFICATION", {
      body: "This should always show",
    })
  );
});

console.log("🎯 LISTENERS REGISTERED");
