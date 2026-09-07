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
    <main className="relative min-h-dvh overflow-hidden bg-lienzo">
      {/* Resplandores de fondo: mismo efecto en claro y oscuro, sin lavado parejo. */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-[34rem] rounded-full bg-marca-300/35 blur-3xl dark:bg-marca-600/10" />
      <div className="pointer-events-none absolute -right-40 -bottom-48 size-[38rem] rounded-full bg-acento-300/25 blur-3xl dark:bg-acento-600/10" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-linea)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40 [-webkit-mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)] dark:opacity-[0.15]" />

      <div className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-[1.05fr_minmax(0,26rem)] lg:gap-20">
        {/* Presentación */}
        <section className="hidden lg:block">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl2 bg-marca-600 text-white shadow-[0_4px_14px_-2px_rgba(32,113,236,0.45)]">
              <IconoEscudo className="size-6" />
            </span>
            <span className="text-xl font-semibold tracking-tight text-slate-900">Kinesio</span>
          </div>

          <h1 className="mt-10 max-w-lg text-[2.75rem] leading-[1.1] font-semibold tracking-tight text-slate-900">
            El consultorio ordenado,{' '}
            <span className="bg-gradient-to-r from-marca-600 to-acento-600 bg-clip-text text-transparent">
              sin planillas ni cuadernos.
            </span>
          </h1>

          <p className="mt-5 max-w-md text-base text-slate-600">
            Agenda, historial clínico y reportes para centros de kinesiología. Cada centro ve
            únicamente sus propios datos.
          </p>

          <ul className="mt-10 space-y-5">
            {PUNTOS.map(({ Icono, titulo, texto }) => (
              <li
                key={titulo}
                className="flex gap-4 rounded-xl2 border border-transparent p-3 transition-colors hover:border-linea hover:bg-white/70 dark:hover:bg-white/[0.03]"
              >
                <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-lg bg-white text-marca-600 shadow-sm ring-1 ring-linea">
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
            <span className="grid size-10 place-items-center rounded-xl bg-marca-600 text-white shadow-[0_4px_14px_-2px_rgba(32,113,236,0.45)]">
              <IconoEscudo className="size-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">Kinesio</span>
          </div>

          <div className="tarjeta-sombra overflow-hidden p-7 sm:p-8">
            <div className="mb-6 -mt-7 -mx-7 h-1 bg-gradient-to-r from-marca-500 via-marca-400 to-acento-400 sm:-mt-8 sm:-mx-8" />
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Iniciar sesión</h2>
            <p className="subtitulo mt-1 mb-6">Entrá con la cuenta de tu centro.</p>

            <FormularioLogin volver={volver} errorInicial={errorInicial} />
          </div>

          <p className="mt-5 text-center text-sm text-slate-500">
            ¿No tenés cuenta? Entrá con Google — la primera vez te la crea sola, como
            administrador de tu centro.
          </p>
        </section>
      </div>
    </main>
  )
}
