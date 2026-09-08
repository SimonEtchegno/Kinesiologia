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
  searchParams: Promise<{ fecha?: string; prof?: string; paciente?: string; duracion?: string }>
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

  // UC-03: cualquiera que pueda cargar turnos (admin o kinesiólogo
  // habilitado) puede elegir a qué profesional del centro se lo carga, no
  // solo a sí mismo — así se cubren la agenda entre kinesiólogos.
  const profesionales = profesionalesTodos

  if (profesionales.length === 0) redirect('/agenda')

  const pedido = sp.prof && profesionales.some((p) => p.id === sp.prof) ? sp.prof : undefined
  const profesionalId =
    pedido ??
    (profesionales.some((p) => p.id === sesion.perfil.id) ? sesion.perfil.id : profesionales[0]!.id)

  // Por defecto, lo que dura una sesión de esa profesional; si no definió
  // una propia, la del centro. El parámetro de la URL la pisa (el campo de
  // duración del formulario).
  const duracionPedida = Number(sp.duracion)
  const duracion =
    Number.isFinite(duracionPedida) && duracionPedida >= 10 && duracionPedida <= 240
      ? duracionPedida
      : (profesionales.find((p) => p.id === profesionalId)?.duracion_turno_min ??
         sesion.centro.duracion_turno_min)

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
        puedeElegirProfesional={profesionales.length > 1}
        pacienteInicial={pacienteInicial}
        miId={sesion.perfil.id}
      />
    </div>
  )
}
