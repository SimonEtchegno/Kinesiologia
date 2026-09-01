'use client'

import { useRouter } from 'next/navigation'
import Sidebar from '@/componentes/Sidebar'
import { cerrarSesion } from '@/lib/local/almacen'
import Protegido from '@/lib/local/Protegido'
import { useSesion } from '@/lib/local/sesion'

export default function LayoutPanel({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { refrescar } = useSesion()

  async function alSalir() {
    cerrarSesion()
    refrescar()
    router.replace('/login')
  }

  return (
    <Protegido>
      {(sesion) => (
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
      )}
    </Protegido>
  )
}
