import { redirect } from 'next/navigation'
import { Encabezado } from '@/componentes/ui'
import { esISO, formatearFechaLarga, hoyISO } from '@/lib/fechas'
import {
  buscarPacientes,
  listarProfesionales,
  listarSedes,
  pacientesConTurnoPrevio,
  slotsDisponibles,
} from '@/lib/datos'
import { exigirSesion } from '@/lib/sesion'
import { clienteServidor } from '@/lib/supabase/servidor'
import FormularioTurno from './FormularioTurno'

export default async function PaginaNuevoTurno({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; prof?: string; paciente?: string }>
}) {
  const sesion = await exigirSesion()
  if (!sesion.puedeCargarTurnos) redirect('/agenda')

  const sp = await searchParams
  const fecha = esISO(sp.fecha) ? sp.fecha! : hoyISO()
  const supabase = await clienteServidor()

  const [profesionalesTodos, sedes, pacientes, conHistorial] = await Promise.all([
    listarProfesionales(supabase),
    listarSedes(supabase),
    buscarPacientes(supabase, ''),
    pacientesConTurnoPrevio(supabase),
  ])

  const profesionales = sesion.esAdmin
    ? profesionalesTodos
    : profesionalesTodos.filter((p) => p.id === sesion.perfil.id)

  if (profesionales.length === 0) redirect('/agenda')

  const pedido = sp.prof && profesionales.some((p) => p.id === sp.prof) ? sp.prof : undefined
  const profesionalId =
    pedido ??
    (profesionales.some((p) => p.id === sesion.perfil.id) ? sesion.perfil.id : profesionales[0]!.id)

  const duracion = sesion.centro.duracion_turno_min
  const disponibilidad = await slotsDisponibles(supabase, profesionalId, fecha, duracion)

  const pacienteParam = sp.paciente
  const pacienteInicial =
    pacienteParam && pacientes.some((p) => p.id === pacienteParam) ? pacienteParam : undefined

  return (
    <div className="mx-auto max-w-3xl">
      <Encabezado
        titulo="Nuevo turno"
        descripcion={<span className="first-letter:uppercase">{formatearFechaLarga(fecha)}</span>}
      />

      <FormularioTurno
        centro={sesion.centro}
        fecha={fecha}
        profesionalId={profesionalId}
        profesionales={profesionales}
        sedes={sedes}
        pacientes={pacientes}
        pacientesConTurnoPrevio={[...conHistorial]}
        libres={disponibilidad.libres}
        ocupados={disponibilidad.ocupados}
        atiende={disponibilidad.atiende}
        duracion={duracion}
        puedeElegirProfesional={sesion.esAdmin && profesionales.length > 1}
        pacienteInicial={pacienteInicial}
      />
    </div>
  )
}
