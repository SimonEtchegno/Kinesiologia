import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './lib/supabase/env'

const PUBLICAS = ['/login', '/reservar', '/auth']

/**
 * Corre antes de cada request: refresca el token de Supabase y bloquea el panel
 * si no hay sesión (UC-01).
 */
export async function proxy(request: NextRequest) {
  // Sin configurar, dejamos pasar: la propia página muestra el error de setup.
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return NextResponse.next({ request })

  const ruta = request.nextUrl.pathname
  const esPublica = PUBLICAS.some((p) => ruta === p || ruta.startsWith(p + '/'))

  // getUser() es una llamada de red a Supabase: solo vale la pena pagarla
  // cuando la respuesta puede cambiar (rutas protegidas, y /login para
  // sacar de ahí a quien ya tiene sesión). /reservar y /auth/callback no
  // la necesitan — este último refresca su propia sesión al cambiar el
  // code por cookies.
  if (esPublica && ruta !== '/login') return NextResponse.next({ request })

  let cookiesAGuardar: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(aGuardar) {
        cookiesAGuardar = aGuardar
        for (const { name, value } of aGuardar) {
          request.cookies.set(name, value)
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

  // Si viene con un error en los parámetros, no forzar redirección a la agenda.
  if (user && ruta === '/login' && !request.nextUrl.searchParams.has('error')) {
    const url = request.nextUrl.clone()
    url.pathname = '/agenda'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // getUser() ya validó el JWT contra Supabase: le pasamos el id a los
  // Server Components y Server Actions de más abajo en el pipeline por un
  // header, para que no vuelvan a pagar ese mismo viaje de red. Esto no
  // afloja nada de seguridad — cada consulta la sigue filtrando RLS en
  // base al JWT real de la cookie, no a este header.
  if (user) request.headers.set('x-user-id', user.id)

  const respuesta = NextResponse.next({ request })
  for (const { name, value, options } of cookiesAGuardar) {
    respuesta.cookies.set(name, value, options)
  }
  return respuesta
}

export const config = {
  matcher: [
    // Todo menos assets estáticos e imágenes.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
