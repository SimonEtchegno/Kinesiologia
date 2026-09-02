'use client'

import Link from 'next/link'
import { IconoCheck, IconoEscudo } from '@/componentes/Iconos'
import FormularioRegistro from './FormularioRegistro'

const PUEDE = [
  'Ver y cargar turnos de todos los profesionales del centro.',
  'Dar de alta pacientes, kinesiólogos, sedes y horarios de atención.',
  'Cambiar la configuración del centro y ver los reportes.',
]

export default function PaginaRegistro() {
  return (
    <main className="min-h-dvh bg-gradient-to-br from-marca-50 via-lienzo to-acento-50/60">
      <div className="mx-auto grid min-h-dvh max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-[1fr_minmax(0,28rem)] lg:gap-20">
        {/* Presentación */}
        <section className="hidden lg:block">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl2 bg-marca-600 text-white shadow-sm">
              <IconoEscudo className="size-6" />
            </span>
            <span className="text-xl font-semibold tracking-tight text-slate-900">Kinesio</span>
          </div>

          <h1 className="mt-10 max-w-lg text-[2.6rem] leading-[1.1] font-semibold tracking-tight text-slate-900">
            Creá tu cuenta y{' '}
            <span className="text-marca-600">manejá el centro entero.</span>
          </h1>

          <p className="mt-5 max-w-md text-base text-slate-600">
            Toda cuenta que se crea acá entra como administrador: no hay nada que te quede
            bloqueado.
          </p>

          <ul className="mt-8 space-y-3">
            {PUEDE.map((texto) => (
              <li key={texto} className="flex gap-3 text-sm text-slate-600">
                <IconoCheck className="mt-0.5 size-5 shrink-0 text-acento-600" />
                {texto}
              </li>
            ))}
          </ul>
        </section>

        {/* Formulario */}
        <section className="mx-auto w-full max-w-md lg:max-w-none">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-marca-600 text-white">
              <IconoEscudo className="size-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">Kinesio</span>
          </div>

          <div className="tarjeta-sombra p-7 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Crear cuenta</h2>
            <p className="subtitulo mt-1 mb-6">
              Vas a quedar como administrador del centro, con permiso para todo.
            </p>

            <FormularioRegistro />
          </div>

          <p className="mt-4 text-center text-sm text-slate-500">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="font-medium text-marca-700 hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}
