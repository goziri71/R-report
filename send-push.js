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
    "https://fcm.googleapis.com/fcm/send/fKI5TbE2Cu0:APA91bE5YHMPGi-DlMFO1Egn76jjDKoGuC1DN3NcR0Uk-pQEjxglY2eURXvXWSUcQOK6NA9yrUx14W4a1_zKeFCyTLFdw7zlGxfgT4j4IxNlRHNAduZMRPf529ZCDVqPSKSjWxNwsa4O"
  ),
  expirationTime: null,
  keys: {
    p256dh:
      "BCNk49loEeW720BezYxcf3Q+/oEe9GU+e7libVWq0MJBRLMtFOBqP/+g4GBMuuvXmhh7QFrPIQj4Jy3doGgNi5U=",
    auth: "VAHFhhLp/R61o1xPCimFzQ==",
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
