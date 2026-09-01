import { turnosEnRango } from '@/lib/datos'
import { ESTADOS, nombreCompleto } from '@/lib/dominio'
import { aISO, esISO, hhmm, hoyISO } from '@/lib/fechas'
import { obtenerSesion } from '@/lib/sesion'
import { clienteServidor } from '@/lib/supabase/servidor'

/** Escapa un campo para CSV (comillas dobles y separador). */
function celda(valor: string | number | null): string {
  const s = String(valor ?? '')
  return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

/**
 * UC-12 — Exportación del período consultado.
 * Separador ";" y BOM UTF-8 para que Excel en español lo abra bien.
 */
export async function GET(request: Request) {
  const sesion = await obtenerSesion()
  if (!sesion) return new Response('No autorizado', { status: 401 })
  if (!sesion.esAdmin) return new Response('Solo el administrador puede exportar', { status: 403 })

  const url = new URL(request.url)
  const desdeCrudo = url.searchParams.get('desde')
  const hastaCrudo = url.searchParams.get('hasta')

  const hoy = hoyISO()
  const desde = esISO(desdeCrudo)
    ? desdeCrudo
    : aISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const hasta = esISO(hastaCrudo) ? hastaCrudo : hoy

  const supabase = await clienteServidor()
  const turnos = await turnosEnRango(supabase, desde, hasta, { incluirCancelados: true })

  const encabezado = [
    'Fecha',
    'Inicio',
    'Fin',
    'Profesional',
    'Paciente',
    'Tipo de sesion',
    'Estado',
    'Cobertura',
    'Sede',
    'Motivo',
    'Observacion cargada',
  ]

  const filas = turnos.map((t) =>
    [
      t.fecha,
      hhmm(t.hora_inicio),
      hhmm(t.hora_fin),
      t.profesional?.nombre ?? '',
      nombreCompleto(t.paciente),
      t.tipo_sesion,
      ESTADOS[t.estado].etiqueta,
      t.paciente?.cobertura === 'obra_social'
        ? (t.paciente.obra_social ?? 'Obra social')
        : 'Particular',
      t.sede?.nombre ?? '',
      t.motivo ?? '',
      t.tiene_observacion ? 'si' : 'no',
    ]
      .map(celda)
      .join(';'),
  )

  const cuerpo = '﻿' + [encabezado.join(';'), ...filas].join('\r\n') + '\r\n'
  const nombre = 'kinesio-turnos-' + desde + '-a-' + hasta + '.csv'

  return new Response(cuerpo, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="' + nombre + '"',
      'Cache-Control': 'no-store',
    },
  })
}
