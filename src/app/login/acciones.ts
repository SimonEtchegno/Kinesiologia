import { iniciarSesion } from '@/lib/local/almacen'

export interface EstadoLogin {
  error?: string
}

/** UC-01 — Iniciar sesión (modo local: valida contra localStorage). */
export function ingresar(_previo: EstadoLogin, datos: FormData): EstadoLogin {
  const email = String(datos.get('email') ?? '').trim()
  const password = String(datos.get('password') ?? '')

  if (!email || !password) return { error: 'Ingresá tu email y tu contraseña.' }

  const { error } = iniciarSesion(email, password)
  if (error) return { error }
  return {}
}
