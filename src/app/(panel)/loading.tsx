/**
 * Se muestra al instante en cada navegación del panel mientras la página
 * pedida todavía está trayendo sus datos de Supabase — el layout (menú,
 * cabecera) ya está en pantalla, solo el contenido tarda. Next.js la usa
 * sola: envuelve automáticamente page.tsx de cada ruta acá abajo en un
 * <Suspense>, sin tocar esas páginas.
 */
export default function Cargando() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-marca-200 border-t-marca-600 dark:border-marca-900 dark:border-t-marca-500" />
    </div>
  )
}
