import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_ANON_KEY, SUPABASE_URL, exigirConfig } from './env'

/**
 * Cliente para Server Components, Server Actions y Route Handlers.
 * Usa la clave publica, asi que toda consulta pasa por las politicas RLS:
 * el aislamiento por centro no depende de que no nos olvidemos un filtro.
 */
export async function clienteServidor() {
  // cookies() primero: marca la ruta como dinámica antes de que un
  // proyecto sin configurar rompa el build intentando prerenderizarla.
  const cookieStore = await cookies()
  exigirConfig()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(aGuardar) {
        try {
          for (const { name, value, options } of aGuardar) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Los Server Components no pueden escribir cookies; el refresh
          // de sesion lo hace el middleware. Ignorar es lo correcto aca.
        }
      },
    },
  })
}
