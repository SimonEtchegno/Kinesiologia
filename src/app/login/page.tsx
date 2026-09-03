'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { IconoAgenda, IconoEscudo, IconoNota, IconoReportes } from '@/componentes/Iconos'
import FormularioLogin from './FormularioLogin'

const PUNTOS = [
  {
    Icono: IconoAgenda,
    titulo: 'Tu agenda, primero',
    texto: 'Entrás y ves los turnos del día. Vista día o semana, sin vueltas.',
  },
  {
    Icono: IconoNota,
    titulo: 'La sesión cargada en un minuto',
    texto: 'Marcás el turno como realizado y anotás la evolución ahí mismo.',
  },
  {
    Icono: IconoReportes,
    titulo: 'El pulso del consultorio',
    texto: 'Sesiones atendidas, ausentismo y carga por profesional.',
  },
]

export default function PaginaLogin() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  )
}

function Login() {
  const params = useSearchParams()
  const volver = params.get('volver') ?? '/agenda'
  const errorInicial = params.get('error') ?? undefined

  return (
    <main className="min-h-dvh bg-gradient-to-br from-marca-50 via-lienzo to-acento-50/60">
      <div className="mx-auto grid min-h-dvh max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-[1.05fr_minmax(0,26rem)] lg:gap-20">
        {/* Presentación */}
        <section className="hidden lg:block">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl2 bg-marca-600 text-white shadow-sm">
              <IconoEscudo className="size-6" />
            </span>
            <span className="text-xl font-semibold tracking-tight text-slate-900">Kinesio</span>
          </div>

          <h1 className="mt-10 max-w-lg text-[2.6rem] leading-[1.1] font-semibold tracking-tight text-slate-900">
            El consultorio ordenado,{' '}
            <span className="text-marca-600">sin planillas ni cuadernos.</span>
          </h1>

          <p className="mt-5 max-w-md text-base text-slate-600">
            Agenda, historial clínico y reportes para centros de kinesiología. Cada centro ve
            únicamente sus propios datos.
          </p>

          <ul className="mt-10 space-y-6">
            {PUNTOS.map(({ Icono, titulo, texto }) => (
              <li key={titulo} className="flex gap-4">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-white text-marca-600 ring-1 ring-linea">
                  <Icono className="size-[1.15rem]" />
                </span>
                <div>
                  <p className="font-semibold text-slate-800">{titulo}</p>
                  <p className="text-sm text-slate-600">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Formulario */}
        <section className="mx-auto w-full max-w-sm lg:max-w-none">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-marca-600 text-white">
              <IconoEscudo className="size-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">Kinesio</span>
          </div>

          <div className="tarjeta-sombra p-7 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Iniciar sesión</h2>
            <p className="subtitulo mt-1 mb-6">Entrá con la cuenta de tu centro.</p>

            <FormularioLogin volver={volver} errorInicial={errorInicial} />
          </div>

          <p className="mt-4 text-center text-sm text-slate-500">
            ¿No tenés cuenta? Entrá con Google — la primera vez te la crea sola, como
            administrador de tu centro.
          </p>
        </section>
      </div>
    </main>
  )
}
