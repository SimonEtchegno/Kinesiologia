/**
 * Traducción de los errores de Supabase Auth a algo que se pueda leer.
 * Los mensajes vienen en inglés y a veces son crípticos; acá se mapean
 * a la voz del resto de la app.
 */
export function mensajeDeError(error: { message?: string; code?: string } | null): string {
  const crudo = (error?.message ?? '').toLowerCase()

  if (!crudo) return 'No pudimos completar la operación. Probá de nuevo.'

  if (crudo.includes('invalid login credentials')) {
    return 'Email o contraseña incorrectos. Revisá los datos e intentá de nuevo.'
  }
  if (crudo.includes('email not confirmed')) {
    return 'Todavía no confirmaste tu email. Buscá el mail de confirmación en tu casilla (mirá también en spam).'
  }
  if (crudo.includes('user already registered') || crudo.includes('already been registered')) {
    return 'Ya existe una cuenta con ese email. Entrá con tu contraseña.'
  }
  // El trigger de la base corta el alta si el email ya tiene perfil.
  if (crudo.includes('database error saving new user')) {
    return 'Ya existe una cuenta con ese email. Entrá con tu contraseña, o con Google si la creaste así.'
  }
  if (crudo.includes('password should be at least')) {
    return 'La contraseña tiene que tener al menos 6 caracteres.'
  }
  if (crudo.includes('unable to validate email address') || crudo.includes('invalid email')) {
    return 'Ese email no parece válido.'
  }
  if (crudo.includes('email rate limit') || crudo.includes('over_email_send_rate_limit')) {
    return 'Se enviaron demasiados mails en poco tiempo. Esperá unos minutos y probá de nuevo.'
  }
  if (crudo.includes('for security purposes') || crudo.includes('rate limit')) {
    return 'Demasiados intentos seguidos. Esperá unos segundos y probá de nuevo.'
  }
  if (crudo.includes('provider is not enabled')) {
    return 'El ingreso con Google todavía no está habilitado en este centro.'
  }
  if (crudo.includes('failed to fetch') || crudo.includes('network')) {
    return 'No pudimos conectarnos. Revisá tu conexión a internet.'
  }

  return error?.message ?? 'No pudimos completar la operación. Probá de nuevo.'
}
