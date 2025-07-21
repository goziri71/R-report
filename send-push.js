import dotenv from "dotenv";
import webpush from "web-push";

dotenv.config();

// Set the VAPID details
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Paste your subscription object here and encode the endpoint URL
const subscription = {
  endpoint: encodeURI(
    "https://fcm.googleapis.com/fcm/send/dHZnDc8pGPg:APA91bFBFPG1iW99c6DKXYIwU6yxnfNh4URBwBadxrTLl-hCx76PhAFEbgwXVi0mmL7Ti6E0teYkIr7XX4GDN6mePOwK5ZjBwW80bmX9DM9iInHHKO3-UO6wlqiRvMLV-5A9gn33qXD3"
  ),
  expirationTime: null,
  keys: {
    p256dh:
      "BFoycOZusL9Klz9RmtcaENbWzBatnOY6d2mJMlY8JQGJeHTGuR4tEAh1WHVvENzIUwVqgHkxqog4srJAQdP6/7Q=",
    auth: "ObWWDFRhPWVQ5U/u3i7NwQ==",
  },
};

// Your payload (must be a string)
const payload = JSON.stringify({
  title: "Manual Test",
  body: "This is a manual push notification from backend!",
  icon: "/icon-192x192.png",
  badge: "/badge-72x72.png",
  data: { url: "/chat" },
});

// Send the push notification
const sendPushNotification = async () => {
  try {
    const response = await webpush.sendNotification(subscription, payload);
    console.log("Push sent!", response);
  } catch (error) {
    console.error("Push error:", error);
  }
};

sendPushNotification();
