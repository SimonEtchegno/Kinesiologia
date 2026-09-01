'use client'

import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env'

/** Cliente para componentes que corren en el navegador (login, logout). */
export function clienteNavegador() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
