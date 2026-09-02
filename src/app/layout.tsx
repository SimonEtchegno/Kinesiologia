import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { SesionProvider } from '@/lib/local/sesion'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--fuente-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Kinesio — Gestión de consultorio',
    template: '%s · Kinesio',
  },
  description:
    'Panel interno para centros de kinesiología: agenda, historial de pacientes y observaciones clínicas.',
}

export const viewport: Viewport = {
  themeColor: '#2071ec',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('tema');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <SesionProvider>{children}</SesionProvider>
      </body>
    </html>
  )
}
