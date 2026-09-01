import * as almacen from '@/lib/local/almacen'
import { esISO } from '@/lib/fechas'
import type { Sesion } from '@/lib/local/sesion'

export interface Resultado {
  error?: string
  ok?: string
  id?: string
}

function leer(datos: FormData): almacen.CamposPaciente | string {
  const nombre = String(datos.get('nombre') ?? '').trim()
  const apellido = String(datos.get('apellido') ?? '').trim()
  if (!nombre || !apellido) return 'El nombre y el apellido son obligatorios.'

  const cobertura = String(datos.get('cobertura') ?? 'particular')
  if (cobertura !== 'particular' && cobertura !== 'obra_social') return 'Cobertura inválida.'

  const obraSocial = String(datos.get('obra_social') ?? '').trim() || null
  if (cobertura === 'obra_social' && !obraSocial) {
    return 'Si el paciente viene por obra social, indicá cuál.'
  }

  const nacimiento = String(datos.get('fecha_nacimiento') ?? '').trim()
  if (nacimiento && !esISO(nacimiento)) return 'La fecha de nacimiento no es válida.'

  const email = String(datos.get('email') ?? '').trim() || null
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'El email no parece válido.'

  return {
    nombre,
    apellido,
    dni: String(datos.get('dni') ?? '').replace(/\D/g, '') || null,
    telefono: String(datos.get('telefono') ?? '').trim() || null,
    email,
    fecha_nacimiento: nacimiento || null,
    cobertura,
    obra_social: cobertura === 'obra_social' ? obraSocial : null,
    nro_afiliado:
      cobertura === 'obra_social' ? String(datos.get('nro_afiliado') ?? '').trim() || null : null,
    notas: String(datos.get('notas') ?? '').trim() || null,
  }
}

// ============================================================
// UC-08 — Dar de alta un paciente
// ============================================================
export function crearPaciente(sesion: Sesion, _previo: Resultado, datos: FormData): Resultado {
  const campos = leer(datos)
  if (typeof campos === 'string') return { error: campos }
  return almacen.crearPaciente(sesion.centro.id, campos)
}

// ============================================================
// UC-07 — Editar datos básicos
// ============================================================
export function actualizarPaciente(_sesion: Sesion, _previo: Resultado, datos: FormData): Resultado {
  const id = String(datos.get('id') ?? '')
  if (!id) return { error: 'Falta el paciente.' }

  const campos = leer(datos)
  if (typeof campos === 'string') return { error: campos }

  return almacen.actualizarPaciente(id, campos)
}

/** Baja lógica: el historial se conserva. */
export function cambiarActivoPaciente(datos: FormData): void {
  const id = String(datos.get('id') ?? '')
  const activo = datos.get('activo') === 'si'
  if (id) almacen.cambiarActivoPaciente(id, activo)
}
