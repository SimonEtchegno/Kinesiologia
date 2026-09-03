import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './lib/supabase/env'

const PUBLICAS = ['/login', '/reservar', '/auth']

/**
 * Corre antes de cada request: refresca el token de Supabase y bloquea el panel
 * si no hay sesión (UC-01).
 */
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request })

  // Sin configurar, dejamos pasar: la propia página muestra el error de setup.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return respuesta

  const ruta = request.nextUrl.pathname
  const esPublica = PUBLICAS.some((p) => ruta === p || ruta.startsWith(p + '/'))

  // getUser() es una llamada de red a Supabase: solo vale la pena pagarla
  // cuando la respuesta puede cambiar (rutas protegidas, y /login para
  // sacar de ahí a quien ya tiene sesión). /reservar y /auth/callback no
  // la necesitan — este último refresca su propia sesión al cambiar el
  // code por cookies.
  if (esPublica && ruta !== '/login') return respuesta

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(aGuardar) {
        for (const { name, value } of aGuardar) {
          request.cookies.set(name, value)
        }
        respuesta = NextResponse.next({ request })
        for (const { name, value, options } of aGuardar) {
          respuesta.cookies.set(name, value, options)
        }
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !esPublica) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Para volver a donde quería entrar después de loguearse.
    if (ruta !== '/') url.searchParams.set('volver', ruta)
    return NextResponse.redirect(url)
  }

  if (user && ruta === '/login') {
    // Si viene con un error en los parámetros, no forzar redirección a la agenda
    if (request.nextUrl.searchParams.has('error')) {
      return respuesta
    }
    const url = request.nextUrl.clone()
    url.pathname = '/agenda'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return respuesta
}

export const config = {
  matcher: [
    // Todo menos assets estáticos e imágenes.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
