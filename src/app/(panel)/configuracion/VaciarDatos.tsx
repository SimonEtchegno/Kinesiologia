'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconoAlerta } from '@/componentes/Iconos'
import { vaciarDatosClinicos } from '@/lib/local/almacen'
import type { Sesion } from '@/lib/local/sesion'

/**
 * Vacía pacientes, turnos y observaciones del centro para poder cargar
 * datos reales. Mantiene las cuentas y los horarios: no hace falta
 * volver a entrar.
 */
export default function VaciarDatos({ sesion }: { sesion: Sesion }) {
  const [confirmando, setConfirmando] = useState(false)
  const router = useRouter()

  function confirmar() {
    vaciarDatosClinicos(sesion.centro.id)
    setConfirmando(false)
    router.push('/pacientes')
  }

  if (confirmando) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4">
        <div className="flex items-start gap-3">
          <IconoAlerta className="size-5 shrink-0 text-rose-600" />
          <div>
            <p className="font-semibold text-rose-900">¿Borrar todos los pacientes y turnos?</p>
            <p className="mt-1 text-sm text-rose-800">
              Se van a borrar todos los pacientes, los turnos y las observaciones de{' '}
              {sesion.centro.nombre}. Tu cuenta, la de los demás profesionales y los horarios de
              atención quedan como están. No se puede deshacer.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={confirmar} className="boton-peligro boton-chico">
            Sí, borrar todo
          </button>
          <button type="button" onClick={() => setConfirmando(false)} className="boton-fantasma boton-chico">
            No, dejarlo así
          </button>
        </div>
      </div>
    )
  }

  return (
    <button type="button" onClick={() => setConfirmando(true)} className="boton-peligro boton-chico">
      Vaciar pacientes y turnos
    </button>
  )
}
