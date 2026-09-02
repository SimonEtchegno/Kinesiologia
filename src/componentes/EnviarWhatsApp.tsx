'use client'

import { useEffect, useRef, useState } from 'react'
import { IconoAlerta, IconoWhatsApp } from '@/componentes/Iconos'
import { linkWhatsApp } from '@/lib/whatsapp'

/**
 * Botón para escribirle al paciente por WhatsApp: abre un panel con el
 * número y el mensaje ya armados, editables antes de mandar. El envío lo
 * confirma la persona en WhatsApp (ver `src/lib/whatsapp.ts`).
 *
 * Con `autoAbrir` intenta abrir WhatsApp solo (se usa al cargar un ingreso);
 * si el navegador bloquea la ventana, queda el botón a mano.
 */
export default function EnviarWhatsApp({
  telefono,
  mensaje,
  etiqueta = 'WhatsApp',
  variante = 'acento',
  autoAbrir = false,
}: {
  telefono: string | null
  mensaje: string
  etiqueta?: string
  variante?: 'primario' | 'secundario' | 'fantasma' | 'acento'
  autoAbrir?: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const [numero, setNumero] = useState(telefono ?? '')
  const [texto, setTexto] = useState(mensaje)
  const [bloqueado, setBloqueado] = useState(false)
  const yaIntento = useRef(false)

  const link = linkWhatsApp(numero, texto)

  function abrirWhatsApp() {
    if (!link) return
    const ventana = window.open(link, '_blank', 'noopener,noreferrer')
    if (!ventana) setBloqueado(true)
  }

  useEffect(() => {
    if (!autoAbrir || yaIntento.current) return
    yaIntento.current = true
    setAbierto(true)
    const enlace = linkWhatsApp(telefono ?? '', mensaje)
    if (!enlace) return
    // Se abre en un timeout: sacarlo del cuerpo del efecto evita el
    // set-state síncrono si el navegador bloquea la ventana emergente.
    const manija = setTimeout(() => {
      const ventana = window.open(enlace, '_blank', 'noopener,noreferrer')
      if (!ventana) setBloqueado(true)
    }, 0)
    return () => clearTimeout(manija)
  }, [autoAbrir, telefono, mensaje])

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={'boton-' + variante + ' boton-chico'}
      >
        <IconoWhatsApp className="size-4" />
        {etiqueta}
      </button>
    )
  }

  return (
    <div className="w-full rounded-lg border border-acento-200 bg-acento-50/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <IconoWhatsApp className="size-5 text-acento-700" />
        <p className="font-semibold text-slate-800">Mandar un WhatsApp</p>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="boton-fantasma boton-chico ml-auto"
        >
          Cerrar
        </button>
      </div>

      {bloqueado && (
        <div className="aviso-error mb-3" role="alert">
          <IconoAlerta className="size-5 shrink-0" />
          <span>El navegador bloqueó la ventana. Tocá &laquo;Abrir WhatsApp&raquo; para seguir.</span>
        </div>
      )}

      <label htmlFor="wa_numero" className="etiqueta">
        Teléfono
      </label>
      <input
        id="wa_numero"
        value={numero}
        onChange={(e) => setNumero(e.target.value)}
        inputMode="tel"
        placeholder="11 5555-1234"
        className="campo"
      />

      <label htmlFor="wa_texto" className="etiqueta mt-3">
        Mensaje
      </label>
      <textarea
        id="wa_texto"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={6}
        className="campo resize-y"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={abrirWhatsApp}
          disabled={!link}
          className="boton-acento boton-chico"
        >
          <IconoWhatsApp className="size-4" />
          Abrir WhatsApp
        </button>
        {!link && (
          <p className="text-xs text-rose-600">
            Completá un teléfono válido (con característica, sin el 15).
          </p>
        )}
      </div>
    </div>
  )
}
