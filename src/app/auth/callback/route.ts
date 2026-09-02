import { NextResponse, type NextRequest } from 'next/server'
import { clienteServidor } from '@/lib/supabase/servidor'
import { mensajeDeError } from '@/lib/supabase/mensajes'

/**
 * Vuelta de Google (y de cualquier otro login por OAuth, o de un link de
 * confirmación de email): Supabase manda para acá con un `code` en la URL.
 * Lo cambiamos por una sesión real y redirigimos a donde el usuario
 * quería ir.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let volver = searchParams.get('volver') ?? '/agenda'
  if (!volver.startsWith('/')) volver = '/' + volver

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') ?? (request.url.startsWith('https') ? 'https' : 'http')
  const baseUrl = host ? `${proto}://${host}` : origin

  const errorDescripcion = searchParams.get('error_description') ?? searchParams.get('error')

  if (errorDescripcion) {
    const mensaje = mensajeDeError({ message: errorDescripcion })
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(mensaje)}`)
  }

  if (code) {
    const supabase = await clienteServidor()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const mensaje = mensajeDeError(error)
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(mensaje)}`)
    }
  }

  return NextResponse.redirect(`${baseUrl}${volver}`)
}
