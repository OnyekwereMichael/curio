import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * A random id kept in this browser. It is sent with every request so the server can tell when several accounts
 * play from one device (anti-cheat). The server hashes it with a private salt before storing it; the raw id is never kept.
 */
function deviceId(): string | undefined {
  try {
    let id = localStorage.getItem('curi:device-id')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('curi:device-id', id)
    }
    return id
  } catch {
    return undefined
  }
}

const id = deviceId()

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: id ? { headers: { 'x-device-id': id } } : undefined,
})
