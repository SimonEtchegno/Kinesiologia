'use server'

import { revalidatePath } from 'next/cache'
import { esISO } from '@/lib/fechas'
import { exigirSesion } from '@/lib/sesion'
import { clienteServidor } from '@/lib/supabase/servidor'

export interface Resultado {
  error?: string
  ok?: string
  id?: string
}

interface CamposPaciente {
  nombre: string
  apellido: string
  dni: string | null
  telefono: string | null
  email: string | null
  fecha_nacimiento: string | null
  cobertura: 'particular' | 'obra_social'
  obra_social: string | null
  nro_afiliado: string | null
  notas: string | null
}

function leer(datos: FormData): CamposPaciente | string {
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
    cobertura: cobertura as 'particular' | 'obra_social',
    obra_social: cobertura === 'obra_social' ? obraSocial : null,
    nro_afiliado:
      cobertura === 'obra_social' ? String(datos.get('nro_afiliado') ?? '').trim() || null : null,
    notas: String(datos.get('notas') ?? '').trim() || null,
  }
}

// ============================================================
// UC-08 — Dar de alta un paciente
// ============================================================
export async function crearPaciente(_previo: Resultado, datos: FormData): Promise<Resultado> {
  const sesion = await exigirSesion()
  const supabase = await clienteServidor()

  const campos = leer(datos)
  if (typeof campos === 'string') return { error: campos }

  const { data, error } = await supabase
    .from('pacientes')
    .insert({
      centro_id: sesion.centro.id,
      created_by: sesion.perfil.id,
      ...campos,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya existe un paciente con ese DNI en este centro.' }
    }
    return { error: error.message }
  }

  revalidatePath('/pacientes')
  revalidatePath('/agenda')
  return { ok: 'Paciente dado de alta.', id: data.id }
}

// ============================================================
// UC-07 — Editar datos básicos
// ============================================================
export async function actualizarPaciente(_previo: Resultado, datos: FormData): Promise<Resultado> {
  await exigirSesion()
  const supabase = await clienteServidor()

  const id = String(datos.get('id') ?? '')
  if (!id) return { error: 'Falta el paciente.' }

  const campos = leer(datos)
  if (typeof campos === 'string') return { error: campos }

  const { error } = await supabase
    .from('pacientes')
    .update(campos)
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ya existe un paciente con ese DNI en este centro.' }
    }
    return { error: error.message }
  }

  revalidatePath('/pacientes')
  revalidatePath('/pacientes/' + id)
  return { ok: 'Cambios guardados.', id }
}

/** Baja lógica / reactivación: el historial se conserva. */
export async function cambiarActivoPaciente(datos: FormData): Promise<void> {
  await exigirSesion()
  const supabase = await clienteServidor()

  const id = String(datos.get('id') ?? '')
  const activo = datos.get('activo') === 'si'
  if (!id) return

  await supabase.from('pacientes').update({ activo }).eq('id', id)

  revalidatePath('/pacientes')
  revalidatePath('/pacientes/' + id)
}
