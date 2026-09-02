// ------------------------------------------------------------
// WhatsApp
//
// No hay envío automático de verdad: eso necesita la API de
// WhatsApp Business (Meta) con plantillas aprobadas y un servidor.
// Lo que hace la app es armar el mensaje y abrir WhatsApp con el
// texto listo — el envío lo confirma la persona con un toque.
// ------------------------------------------------------------

import { formatearFechaLarga } from './fechas'

const PAIS_POR_DEFECTO = '54' // Argentina

function soloDigitos(texto: string): string {
  return texto.replace(/\D/g, '')
}

/**
 * Deja el número como lo quiere wa.me: sin +, sin 0 inicial y sin el 15.
 * Para Argentina agrega el 9 de celular (54 9 11 xxxx-xxxx).
 * Devuelve null si no parece un número usable.
 */
export function normalizarTelefono(telefono: string, pais = PAIS_POR_DEFECTO): string | null {
  let d = soloDigitos(telefono)
  if (!d) return null
  if (d.startsWith('00')) d = d.slice(2)

  let resto = d.startsWith(pais) ? d.slice(pais.length) : d.replace(/^0+/, '')

  if (pais === '54') {
    if (resto.startsWith('9')) resto = resto.slice(1)
    // "11 15 4444-5555" → el 15 se cae; el área puede tener 2, 3 o 4 dígitos.
    if (resto.length === 12) {
      for (const largoArea of [2, 3, 4]) {
        if (resto.slice(largoArea, largoArea + 2) === '15') {
          resto = resto.slice(0, largoArea) + resto.slice(largoArea + 2)
          break
        }
      }
    }
    if (resto.length < 8) return null
    return pais + '9' + resto
  }

  if (resto.length < 8) return null
  return pais + resto
}

/** Link de WhatsApp con el mensaje ya cargado. null si el número no sirve. */
export function linkWhatsApp(telefono: string, mensaje: string): string | null {
  const numero = normalizarTelefono(telefono)
  if (!numero) return null
  return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(mensaje)
}

export interface DatosMensaje {
  centro: string
  /** Nombre de pila del paciente. */
  paciente: string
  profesional?: string | null
  /** YYYY-MM-DD */
  fecha: string
  /** HH:MM */
  hora: string
  sede?: string | null
  tipo?: string
}

function cuando(d: DatosMensaje): string {
  const con = d.profesional ? ' con ' + d.profesional : ''
  const donde = d.sede ? ', en ' + d.sede : ''
  return formatearFechaLarga(d.fecha) + ' a las ' + d.hora + con + donde
}

/** Bienvenida para el primer turno (ingreso). */
export function mensajeIngreso(d: DatosMensaje): string {
  return (
    '¡Hola ' + d.paciente + '! Te escribo de ' + d.centro + '.\n\n' +
    'Te confirmo tu primer turno: ' + cuando(d) + '.\n\n' +
    'Para la primera sesión traé ropa cómoda y, si tenés, estudios o la indicación médica. ' +
    'Llegá unos minutos antes así completamos tus datos.\n\n' +
    'Si no podés venir, avisame y lo reprogramamos. ¡Te esperamos!'
  )
}

/** Confirmación o recordatorio de un turno cualquiera. */
export function mensajeTurno(d: DatosMensaje): string {
  return (
    '¡Hola ' + d.paciente + '! Te escribo de ' + d.centro + ' para recordarte tu turno: ' +
    cuando(d) + '.\n\n' +
    'Si necesitás cambiarlo, avisame y lo vemos. ¡Gracias!'
  )
}

/** El que corresponde según el tipo de sesión. */
export function mensajeSegunTipo(d: DatosMensaje): string {
  return d.tipo === 'Ingreso' ? mensajeIngreso(d) : mensajeTurno(d)
}

/** Para escribirle a un paciente desde su ficha, sin turno de por medio. */
export function mensajeLibre(centro: string, paciente: string): string {
  return '¡Hola ' + paciente + '! Te escribo de ' + centro + '. '
}
