'use client'

import Link from 'next/link'
import { IconoDerecha, IconoPacientes, IconoReloj, IconoSede } from '@/componentes/Iconos'
import { Encabezado } from '@/componentes/ui'
import Protegido from '@/lib/local/Protegido'
import { FormCentro, FormClave, FormMisDatos } from './FormulariosConfig'
import VaciarDatos from './VaciarDatos'

export default function PaginaConfiguracion() {
  return (
    <Protegido>
      {(sesion) => (
        <div className="mx-auto max-w-3xl">
          <Encabezado titulo="Configuración" descripcion={sesion.centro.nombre} />

          <div className="space-y-5">
            {/* Accesos */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/configuracion/horarios"
                className="tarjeta flex items-center gap-4 p-5 transition-colors hover:border-marca-300 hover:bg-marca-50/40"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-marca-50 text-marca-600">
                  <IconoReloj />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">Horarios de atención</span>
                  <span className="block text-sm text-slate-500">
                    Los días y franjas en que atendés
                  </span>
                </span>
                <IconoDerecha className="size-5 shrink-0 text-slate-300" />
              </Link>

              {sesion.esAdmin && (
                <Link
                  href="/configuracion/sedes"
                  className="tarjeta flex items-center gap-4 p-5 transition-colors hover:border-marca-300 hover:bg-marca-50/40"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-acento-50 text-acento-700">
                    <IconoSede />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900">Sedes</span>
                    <span className="block text-sm text-slate-500">
                      Los lugares donde atiende el centro
                    </span>
                  </span>
                  <IconoDerecha className="size-5 shrink-0 text-slate-300" />
                </Link>
              )}

              {sesion.esAdmin && (
                <Link
                  href="/configuracion/profesionales"
                  className="tarjeta flex items-center gap-4 p-5 transition-colors hover:border-marca-300 hover:bg-marca-50/40"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-acento-50 text-acento-700">
                    <IconoPacientes />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900">Profesionales</span>
                    <span className="block text-sm text-slate-500">
                      Altas, bajas y agendas del centro
                    </span>
                  </span>
                  <IconoDerecha className="size-5 shrink-0 text-slate-300" />
                </Link>
              )}
            </div>

            <section className="tarjeta p-5">
              <h2 className="mb-1 font-semibold text-slate-900">Mis datos</h2>
              <p className="subtitulo mb-5">Así te ven tus compañeros del centro.</p>
              <FormMisDatos sesion={sesion} perfil={sesion.perfil} />
            </section>

            <section className="tarjeta p-5">
              <h2 className="mb-1 font-semibold text-slate-900">Contraseña</h2>
              <p className="subtitulo mb-5">Cambiala cuando quieras.</p>
              <FormClave sesion={sesion} />
            </section>

            {sesion.esAdmin && (
              <section className="tarjeta p-5">
                <h2 className="mb-1 font-semibold text-slate-900">El centro</h2>
                <p className="subtitulo mb-5">Afecta a todos los profesionales.</p>
                <FormCentro sesion={sesion} centro={sesion.centro} />
              </section>
            )}

            {sesion.esAdmin && (
              <section className="tarjeta p-5">
                <h2 className="mb-1 font-semibold text-slate-900">Vaciar pacientes y turnos</h2>
                <p className="subtitulo mb-5">
                  Borra todos los pacientes, turnos y observaciones del centro para empezar de
                  cero. Las cuentas y los horarios de atención quedan como están.
                </p>
                <VaciarDatos sesion={sesion} />
              </section>
            )}
          </div>
        </div>
      )}
    </Protegido>
  )
}
