import { redirect } from 'next/navigation'
import Sidebar from '@/componentes/Sidebar'
import { alSalir } from '@/lib/accionesAuth'
import { exigirSesion } from '@/lib/sesion'

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const sesion = await exigirSesion()

  // Cuenta creada por el admin (UC-10): primero cambia la clave temporal.
  if (sesion.perfil.debe_cambiar_password) redirect('/cambiar-clave')

  return (
    <div className="min-h-dvh">
      <Sidebar
        nombre={sesion.perfil.nombre}
        email={sesion.perfil.email}
        rolEtiqueta={sesion.esAdmin ? 'Administrador' : (sesion.perfil.especialidad ?? 'Kinesiólogo/a')}
        centro={sesion.centro.nombre}
        esAdmin={sesion.esAdmin}
        alSalir={alSalir}
      />
      <div className="lg:pl-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
