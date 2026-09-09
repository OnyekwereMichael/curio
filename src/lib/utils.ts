import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// VAPID keys come base64-encoded; pushManager.subscribe needs a Uint8Array
export function urlBase64ToUint8Array(base64String?: string) {
  if (!base64String) {
    console.error('VITE_VAPID_PUBLIC_KEY is missing — check your .env / deployment env vars.');
    return new Uint8Array();
  }
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
