import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL } from './env'

/**
 * Cliente con service_role: SALTEA RLS.
 * Solo para lo que la clave publica no puede hacer: crear la cuenta de un
 * kinesiologo nuevo (UC-10). Nunca importar esto desde un componente cliente.
 */
export function clienteAdmin() {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !clave) {
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY en .env.local. Es necesaria para dar de alta profesionales.',
    )
  }
  return createClient(SUPABASE_URL, clave, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
