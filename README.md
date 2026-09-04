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
valores del paso 1.

### 4. Correr

```bash
npm install
npm run dev
```

Abrí `http://localhost:3000` y entrá con el usuario que creaste en el paso 2.

## Deploy en Vercel

Importá el repo, cargá las mismas dos variables de entorno en
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
  reservas.ts                Envoltorio de las RPC públicas de /reservar
  supabase/                 Clientes de Supabase (navegador, servidor)
src/app/
  login/                     UC-01
  (panel)/                   Rutas protegidas (exigen sesión)
    agenda/                    UC-02, UC-05, UC-11
    turnos/                     UC-03, UC-04, UC-06
    pacientes/                   UC-07, UC-08
    reportes/                     UC-12 (+ export CSV)
    configuracion/                 UC-09
  cambiar-clave/              Primer ingreso de una cuenta creada por el admin
```

## Cuentas y permisos

Desde `/login`, **"Continuar con Google" crea una cuenta la primera vez**
que alguien entra con una cuenta de Google que todavía no tiene perfil. No
hay alta por email/contraseña: se sacó porque dependía del mail de
confirmación, poco confiable en un proyecto de Supabase sin SMTP propio
configurado (ver "Decisiones de diseño"). Toda cuenta creada así entra
como **administrador** del centro, o sea que puede:

- ver y cargar turnos en la agenda,
- marcar realizado/ausente y cargar la observación clínica de cualquier turno,
- dar de alta pacientes, sedes y horarios,
- tocar la configuración del centro y ver los reportes.

Al registrarse quedan cargados los horarios de atención de lunes a viernes
(9–13 y 15–19), editables en Configuración → Horarios.

**Cada cuenta que se registra arranca su propio centro**, aislado de los
demás: no comparte pacientes, turnos, horarios ni configuración con otras
cuentas. El aislamiento por `centro_id` lo hace Postgres vía RLS (ver
"Aislamiento por centro" más abajo), no el código de la app.

## Turnos online (reservas sin login)

En Configuración → Turnos online, el administrador elige entre:

- **Los turnos los cargo yo** (por defecto): la agenda solo recibe lo que
  carga el centro.
- **Los pacientes pueden sacar turno online**: se habilita una página
  pública, sin usuario ni contraseña, en `/reservar?c=<id del centro>` (el
  link exacto se muestra ahí mismo, con un botón para copiarlo). El paciente
  elige profesional, sede, día y uno de los horarios que están realmente
  libres; el turno entra directo en la agenda del profesional, marcado como
  **origen "online"** (se ve en el detalle del turno y en la vista día, con
  la etiqueta "Reservado online"). Si es la primera vez del paciente en el
  centro, o tildó "Es mi primera vez", el tipo de sesión queda en `Ingreso`.
  Las reglas de anti-solape y horario de atención son las mismas que al
  cargar un turno desde el panel — un paciente no puede reservar un horario
  ocupado ni fuera de la franja de atención.

La página pública corre sin sesión, así que no puede pasar por RLS: llama
tres funciones SQL `security definer` (`reserva_datos_centro`,
`reserva_slots`, `reservar_turno_publico`, en
`supabase/migrations/0004_signup_y_reservas_publicas.sql`) que exponen lo
mínimo al rol `anon` y validan todo del lado del servidor. `src/lib/reservas.ts`
es el envoltorio en TypeScript que las llama.

## WhatsApp

No hay envío automático real: eso requiere la API de WhatsApp Business
(Meta) con plantillas aprobadas y un servidor propio, fuera del alcance de
esta app. Lo que hace `src/lib/whatsapp.ts` es armar el número y el mensaje
y abrir `wa.me/...` con el texto ya escrito — el envío lo confirma la
persona con un toque, y puede editar el mensaje antes de mandarlo
(`EnviarWhatsApp.tsx`).

- El botón de WhatsApp está disponible **para cualquier turno** (en su
  detalle) y **en la ficha de cada paciente**, sin condición de tipo o rol.
- Si en Configuración → WhatsApp está activo "Al cargar o reprogramar un
  turno, preparar el WhatsApp de aviso" (por defecto sí), al guardar
  cualquier turno nuevo o reprogramarlo se intenta abrir WhatsApp solo con
  el mensaje que corresponda: de bienvenida (fecha, hora, profesional, qué
  llevar) si es un `Ingreso`, de confirmación para cualquier otro tipo
  nuevo, o de aviso del cambio de horario al reprogramar; si el navegador
  bloquea la ventana emergente, queda el botón a mano para abrirla.
- Los mensajes de ingreso, recordatorio y reprogramación son plantillas de texto en
  `mensajeIngreso` / `mensajeTurno` / `mensajeReprogramado` — se editan ahí si hace falta cambiar la
  redacción.

## Tipos de sesión y colores de la agenda

Cada turno tiene un tipo de sesión, y cada tipo tiene su color en la agenda
(`TIPOS_SESION` en `src/lib/dominio.ts`). Están agrupados en:

- **Ingreso y controles** — `Ingreso` (violeta) y `Control / reevaluación`.
- **Traumatología** — general, columna, miembro superior, miembro inferior y
  post-quirúrgico, cada uno con su color.
- **Otras especialidades** — kinesiología general, respiratoria, deportiva,
  neurológica, terapia manual, drenaje linfático y reeducación postural.

En la grilla semanal el **relleno del bloque es el tipo de sesión** y la
**barra de la izquierda (y el puntito) es el estado** del turno; abajo de la
agenda hay una referencia con los colores que están a la vista. Al cargar un
turno, si el paciente no tiene turnos previos el tipo viene marcado como
`Ingreso`; si hace falta corregirlo después, se cambia desde el detalle del
turno y queda registrado en la bitácora.

Agregar o cambiar un color es tocar un solo lugar: la lista `TIPOS_SESION`.
El campo `valor` es lo que se guarda en el turno, así que no conviene
editarlo en tipos ya usados (los tipos viejos que ya no están en la lista
siguen mostrándose, en gris).

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
- **Alta de cuenta solo con Google**: no hay registro por email/contraseña.
  Supabase exige confirmar el email antes de dejar entrar a una cuenta
  nueva, y el mailer compartido que trae por defecto (sin SMTP propio
  configurado) tiene un límite muy bajo de envíos — el registro por email
  quedaba roto la mayor parte del tiempo.

## Fuera de alcance (a propósito)

- Reserva de turnos por parte del paciente.
- Pagos o cobros dentro de la plataforma.
- Recordatorios automáticos por WhatsApp/SMS/email.
