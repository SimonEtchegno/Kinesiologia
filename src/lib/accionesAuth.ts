'use server'

import { redirect } from 'next/navigation'
import { clienteServidor } from './supabase/servidor'

/** Server Action: cierra la sesión de Supabase y vuelve a /login. */
export async function alSalir() {
  const supabase = await clienteServidor()
  await supabase.auth.signOut()
  redirect('/login')
}
