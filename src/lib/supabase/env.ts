/**
 * Variables de entorno de Supabase.
 * Aceptamos los dos nombres de la clave publica: Supabase renombro
 * "anon key" a "publishable key", pero los proyectos viejos siguen usando el anterior.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  ''

export const HAY_CONFIG = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export function exigirConfig() {
  if (!HAY_CONFIG) {
    throw new Error(
      'Faltan las variables de Supabase. Copia .env.local.example a .env.local y completa ' +
        'NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    )
  }
}
