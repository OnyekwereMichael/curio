import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import fs from 'fs';
import path from 'path';

// Note: You may need to run `npm install web-push dotenv` in the scratch folder for this to work

// Load environment variables from the root .env file
const envPath = path.resolve('../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
// Use service role key to bypass RLS and read user tokens
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const VAPID_PUBLIC_KEY = env.VITE_VAPID_PUBLIC_KEY || env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase URL or Service Role Key in .env");
  process.exit(1);
}

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error("Missing VAPID keys in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

async function testNotification(userId) {
  console.log(`Fetching notification token for user: ${userId}`);
  const { data: user, error } = await supabase
    .from('users')
    .select('id, notification_token, notifications_enabled')
    .eq('id', userId)
    .single();

  if (error || !user) {
    console.error("Error fetching user:", error?.message || "User not found");
    return;
  }

  if (!user.notification_token) {
    console.error("User does not have a notification token registered.");
    return;
  }

  console.log("Token found. Sending push notification...");

  const payload = JSON.stringify({
    title: "Test Notification",
    body: "This is a manual test notification from the terminal."
  });

  try {
    const response = await webpush.sendNotification(user.notification_token, payload);
    console.log("✅ Notification sent successfully!", response.statusCode);
  } catch (err) {
    console.error("❌ Failed to send notification:", err.statusCode, err.body || err.message);
  }
}

// Get user ID from command line arguments
const targetUserId = process.argv[2];
if (!targetUserId) {
  console.error("Usage: node test-user-notification.mjs <user-id>");
  process.exit(1);
}

testNotification(targetUserId);
