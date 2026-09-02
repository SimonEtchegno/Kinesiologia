'use client'

import { GRUPOS_TIPO_SESION, TIPOS_SESION, tipoSesionDe } from '@/lib/dominio'

/**
 * Selector de tipo de sesión, agrupado (ingresos, traumatología, resto) y
 * con una muestra del color con el que el turno va a aparecer en la agenda.
 */
export default function SelectTipoSesion({
  id = 'tipo_sesion',
  nombre = 'tipo_sesion',
  valor,
  onCambio,
}: {
  id?: string
  nombre?: string
  valor: string
  onCambio: (valor: string) => void
}) {
  const tipo = tipoSesionDe(valor)
  const enCatalogo = TIPOS_SESION.some((t) => t.valor === valor)

  return (
    <>
      <select
        id={id}
        name={nombre}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        className="campo"
      >
        {/* Un valor viejo que ya no está en el catálogo no se pierde. */}
        {!enCatalogo && valor && <option value={valor}>{valor}</option>}
        {GRUPOS_TIPO_SESION.map((grupo) => (
          <optgroup key={grupo} label={grupo}>
            {TIPOS_SESION.filter((t) => t.grupo === grupo && (!t.oculto || t.valor === valor)).map(
              (t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ),
            )}
          </optgroup>
        ))}
      </select>

      <p className="ayuda flex flex-wrap items-center gap-2">
        <span className={'chip ' + tipo.chip}>
          <span className={'size-1.5 rounded-full ' + tipo.punto} />
          {tipo.etiqueta}
        </span>
        Así se va a ver en la agenda.
      </p>
    </>
  )
}
