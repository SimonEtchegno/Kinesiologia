import { redirect } from 'next/navigation'

/** La agenda del día es la pantalla principal post-login (UC-01). */
export default function Inicio() {
  redirect('/agenda')
}
