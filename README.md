# Kinesio

Panel de gestión para centros de kinesiología: agenda, historial clínico de
pacientes y reportes. No es un sistema de reservas para pacientes, ni maneja
pagos ni envía recordatorios — ver "Fuera de alcance" al final.

Stack: **Next.js 16 (App Router) + Supabase (Auth + Postgres + RLS) +
Tailwind CSS v4**, pensado para deploy en Vercel.

## Puesta en marcha

### 1. Crear el proyecto en Supabase

En [supabase.com](https://supabase.com), creá un proyecto nuevo. Anotá, de
**Settings → API**:

- Project URL
- `anon` / `public` key

### 2. Correr las migraciones

En el **SQL Editor** del proyecto, ejecutá en este orden los archivos de
`supabase/migrations/`:

1. `0001_esquema.sql` — tablas, tipos, restricciones (incluye el anti-solape
   de turnos, UC-03).
2. `0002_rls.sql` — Row Level Security: cada centro solo ve sus propios
   datos (UC-01).
3. `0003_bootstrap.sql` — creá primero tu usuario en
   **Authentication → Users → Add user** (con "Auto Confirm User"
   tildado), después editá el `email`, `nombre` y `centro` al principio del
   archivo, y ejecutalo. Te crea el centro y te deja como administrador.

Opcional, para tener algo para mirar: `supabase/seed_demo.sql` carga
pacientes y ~8 semanas de turnos de ejemplo en el primer centro que
encuentre. No usar en producción.

### 3. Variables de entorno

```bash
cp .env.local.example .env.local
```

Completá `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los
valores del paso 1. `SUPABASE_SERVICE_ROLE_KEY` (Settings → API → service_role)
es necesaria para que el administrador pueda dar de alta kinesiólogos nuevos
(UC-10) — nunca se expone al navegador, ni lleva el prefijo `NEXT_PUBLIC_`.

### 4. Correr

```bash
npm install
npm run dev
```

Abrí `http://localhost:3000` y entrá con el usuario que creaste en el paso 2.

## Deploy en Vercel

Importá el repo, cargá las mismas tres variables de entorno en
**Settings → Environment Variables**, y deployá. No hace falta configuración
adicional: las migraciones corren una sola vez, del lado de Supabase.

## Estructura

```
supabase/migrations/     Esquema, RLS y bootstrap (SQL, se corre a mano)
src/lib/
  dominio.ts              Tipos y etiquetas del dominio
  fechas.ts                Utilidades de fecha/hora (sin conversión a UTC)
  datos.ts                 Todas las consultas a Supabase
  agenda.ts                 Layout de la grilla semanal
  sesion.ts                 Sesión del usuario + su centro
  supabase/                 Clientes de Supabase (navegador, servidor, admin)
src/app/
  login/                     UC-01
  (panel)/                   Rutas protegidas (exigen sesión)
    agenda/                    UC-02, UC-05, UC-11
    turnos/                     UC-03, UC-04, UC-06
    pacientes/                   UC-07, UC-08
    reportes/                     UC-12 (+ export CSV)
    configuracion/                 UC-09, UC-10
  cambiar-clave/              Primer ingreso de una cuenta creada por el admin
```

## Decisiones de diseño

- **Aislamiento por centro**: no depende de que el código recuerde filtrar
  por `centro_id` — lo hace Postgres vía RLS. Aunque una consulta se
  olvidara el filtro, la base no devolvería datos de otro centro.
- **Anti-solape de turnos**: una restricción `EXCLUDE` de Postgres impide
  guardar dos turnos vigentes superpuestos para el mismo profesional, a
  nivel de base — no solo en el formulario.
- **Baja lógica**: pacientes y profesionales se dan de baja (`activo =
  false`), nunca se borran. El historial clínico se conserva siempre.
- **Bitácora del turno**: cada cambio de estado queda en `turno_eventos`,
  visible en el detalle del turno (quién, cuándo, qué cambió).

## Fuera de alcance (a propósito)

- Reserva de turnos por parte del paciente.
- Pagos o cobros dentro de la plataforma.
- Recordatorios automáticos por WhatsApp/SMS/email.
