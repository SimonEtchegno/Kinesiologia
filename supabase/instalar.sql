-- ============================================================
-- instalar.sql — TODO junto, para pegar una sola vez en el
-- SQL Editor de Supabase (Database -> SQL Editor -> New query).
--
-- Es la union de migrations/0001, 0002 y 0004. Se puede volver
-- a correr sin romper nada.
-- ============================================================

-- ============================================================
-- 0001_esquema.sql - Estructura de datos
-- App de gestion para centros de kinesiologia
-- ============================================================

create extension if not exists "pgcrypto";
-- btree_gist: necesario para combinar "=" con "&&" en la restriccion anti-solape.
create extension if not exists "btree_gist";

-- ------------------------------------------------------------
-- Tipos
-- ------------------------------------------------------------
do $$ begin
  create type rol_usuario as enum ('admin', 'kinesiologo');
exception when duplicate_object then null; end $$;

do $$ begin
  -- confirmado   : turno vigente (UC-03)
  -- reprogramado : vigente, pero cambio de horario al menos una vez (UC-04)
  -- cancelado    : dado de baja (UC-04)
  -- realizado    : el paciente asistio (UC-05) - habilita observacion (UC-06)
  -- ausente      : el paciente no asistio (UC-05) - cuenta para ausentismo (UC-12)
  create type estado_turno as enum ('confirmado', 'reprogramado', 'cancelado', 'realizado', 'ausente');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_cobertura as enum ('particular', 'obra_social');
exception when duplicate_object then null; end $$;

-- Postgres no trae un tipo rango sobre "time": lo creamos para el anti-solape.
do $$ begin
  create type rango_horario as range (subtype = time);
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- Centros (unidad de aislamiento: todo cuelga de aca)
-- ------------------------------------------------------------
create table if not exists centros (
  id                               uuid primary key default gen_random_uuid(),
  nombre                           text not null,
  -- UC-03: "Administrador (o Kinesiologo, si el centro lo permite)"
  kinesiologos_pueden_crear_turnos boolean not null default true,
  duracion_turno_min               smallint not null default 45
                                     check (duracion_turno_min between 10 and 240),
  created_at                       timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Sedes (opcional; un centro puede tener una sola)
-- ------------------------------------------------------------
create table if not exists sedes (
  id         uuid primary key default gen_random_uuid(),
  centro_id  uuid not null references centros (id) on delete cascade,
  nombre     text not null,
  direccion  text,
  activa     boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists sedes_centro_idx on sedes (centro_id);

-- ------------------------------------------------------------
-- Perfiles: 1-a-1 con auth.users. Define centro y rol.
-- ------------------------------------------------------------
create table if not exists perfiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  centro_id             uuid not null references centros (id) on delete cascade,
  nombre                text not null,
  email                 text not null,
  rol                   rol_usuario not null default 'kinesiologo',
  especialidad          text,
  telefono              text,
  activo                boolean not null default true,
  debe_cambiar_password boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists perfiles_centro_idx on perfiles (centro_id);
create unique index if not exists perfiles_email_key on perfiles (lower(email));

-- ------------------------------------------------------------
-- Pacientes (UC-08)
-- ------------------------------------------------------------
create table if not exists pacientes (
  id               uuid primary key default gen_random_uuid(),
  centro_id        uuid not null references centros (id) on delete cascade,
  nombre           text not null,
  apellido         text not null,
  dni              text,
  telefono         text,
  email            text,
  fecha_nacimiento date,
  cobertura        tipo_cobertura not null default 'particular',
  obra_social      text,
  nro_afiliado     text,
  notas            text,
  activo           boolean not null default true,
  created_by       uuid references perfiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Si es por obra social, hay que decir cual.
  constraint pacientes_obra_social_coherente check (
    cobertura = 'particular' or (obra_social is not null and length(trim(obra_social)) > 0)
  )
);
create index if not exists pacientes_centro_idx on pacientes (centro_id);
create index if not exists pacientes_busqueda_idx on pacientes (centro_id, lower(apellido), lower(nombre));
create unique index if not exists pacientes_dni_key on pacientes (centro_id, dni) where dni is not null;

-- ------------------------------------------------------------
-- Horarios de atencion (UC-09)
-- dia_semana: 0 = domingo ... 6 = sabado (igual que Date.getDay())
-- ------------------------------------------------------------
create table if not exists horarios_atencion (
  id             uuid primary key default gen_random_uuid(),
  centro_id      uuid not null references centros (id) on delete cascade,
  profesional_id uuid not null references perfiles (id) on delete cascade,
  sede_id        uuid references sedes (id) on delete set null,
  dia_semana     smallint not null check (dia_semana between 0 and 6),
  hora_inicio    time not null,
  hora_fin       time not null,
  created_at     timestamptz not null default now(),
  constraint horarios_rango_valido check (hora_fin > hora_inicio)
);
create index if not exists horarios_profesional_idx on horarios_atencion (profesional_id, dia_semana);

-- Dos franjas del mismo profesional y dia no pueden superponerse.
do $$ begin
  alter table horarios_atencion add constraint horarios_sin_solape
    exclude using gist (
      profesional_id with =,
      dia_semana with =,
      rango_horario (hora_inicio, hora_fin) with &&
    );
exception when duplicate_table then null; when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- Turnos (UC-03, UC-04, UC-05)
-- Guardamos fecha + hora por separado: sin ambiguedad de zona horaria.
-- ------------------------------------------------------------
create table if not exists turnos (
  id             uuid primary key default gen_random_uuid(),
  centro_id      uuid not null references centros (id) on delete cascade,
  profesional_id uuid not null references perfiles (id) on delete restrict,
  paciente_id    uuid not null references pacientes (id) on delete restrict,
  sede_id        uuid references sedes (id) on delete set null,
  fecha          date not null,
  hora_inicio    time not null,
  hora_fin       time not null,
  tipo_sesion    text not null default 'Kinesiologia',
  estado         estado_turno not null default 'confirmado',
  motivo         text,
  created_by     uuid references perfiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint turnos_rango_valido check (hora_fin > hora_inicio)
);
create index if not exists turnos_agenda_idx on turnos (centro_id, fecha, hora_inicio);
create index if not exists turnos_profesional_idx on turnos (profesional_id, fecha);
create index if not exists turnos_paciente_idx on turnos (paciente_id, fecha desc);

-- UC-03 excepcion: un profesional no puede tener dos turnos vigentes solapados.
-- Los cancelados quedan fuera, asi el horario se libera al cancelar.
do $$ begin
  alter table turnos add constraint turnos_sin_solape
    exclude using gist (
      profesional_id with =,
      fecha with =,
      rango_horario (hora_inicio, hora_fin) with &&
    ) where (estado <> 'cancelado');
exception when duplicate_table then null; when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- Eventos del turno (UC-04: "queda registrado el cambio")
-- ------------------------------------------------------------
create table if not exists turno_eventos (
  id         uuid primary key default gen_random_uuid(),
  centro_id  uuid not null references centros (id) on delete cascade,
  turno_id   uuid not null references turnos (id) on delete cascade,
  tipo       text not null,   -- creado | reprogramado | cancelado | realizado | ausente | observacion
  detalle    text,
  usuario_id uuid references perfiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists turno_eventos_turno_idx on turno_eventos (turno_id, created_at desc);

-- ------------------------------------------------------------
-- Observaciones clinicas (UC-06) - una por turno realizado
-- ------------------------------------------------------------
create table if not exists observaciones (
  id                      uuid primary key default gen_random_uuid(),
  centro_id               uuid not null references centros (id) on delete cascade,
  turno_id                uuid not null unique references turnos (id) on delete cascade,
  paciente_id             uuid not null references pacientes (id) on delete cascade,
  profesional_id          uuid not null references perfiles (id) on delete restrict,
  evolucion               text not null,
  dolor_referido          smallint check (dolor_referido between 0 and 10),
  ejercicios_indicados    text,
  proxima_sesion_sugerida text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists observaciones_paciente_idx on observaciones (paciente_id, created_at desc);

-- ------------------------------------------------------------
-- updated_at automatico
-- ------------------------------------------------------------
create or replace function tocar_updated_at() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['perfiles', 'pacientes', 'turnos', 'observaciones'] loop
    execute format('drop trigger if exists %I on %I', t || '_updated_at', t);
    execute format(
      'create trigger %I before update on %I
         for each row execute function tocar_updated_at()', t || '_updated_at', t);
  end loop;
end $$;


-- ============================================================
-- 0002_rls.sql - Row Level Security
-- Regla de oro: un usuario solo ve y toca datos de SU centro (UC-01).
-- ============================================================

-- ------------------------------------------------------------
-- Helpers. Son SECURITY DEFINER a proposito: leen "perfiles"
-- sin pasar por RLS, evitando la recursion infinita de politicas.
-- ------------------------------------------------------------

-- Centro del usuario logueado. NULL si no tiene perfil o esta inactivo,
-- con lo cual todas las politicas de abajo lo dejan afuera.
create or replace function centro_actual() returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.centro_id from perfiles p where p.id = auth.uid() and p.activo;
$$;

create or replace function es_admin() returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select p.rol = 'admin' from perfiles p where p.id = auth.uid() and p.activo),
    false);
$$;

-- UC-03: el centro puede habilitar o no que los kinesiologos carguen turnos.
create or replace function centro_permite_turnos_kine() returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select c.kinesiologos_pueden_crear_turnos
       from centros c where c.id = centro_actual()),
    false);
$$;

revoke all on function centro_actual(), es_admin(), centro_permite_turnos_kine() from public;
grant execute on function centro_actual(), es_admin(), centro_permite_turnos_kine() to authenticated;

-- ------------------------------------------------------------
-- Activar RLS en todo (y sin excepciones para anon)
-- ------------------------------------------------------------
alter table centros           enable row level security;
alter table sedes             enable row level security;
alter table perfiles          enable row level security;
alter table pacientes         enable row level security;
alter table horarios_atencion enable row level security;
alter table turnos            enable row level security;
alter table turno_eventos     enable row level security;
alter table observaciones     enable row level security;

-- ------------------------------------------------------------
-- centros
-- ------------------------------------------------------------
drop policy if exists centros_select on centros;
create policy centros_select on centros for select to authenticated
  using (id = centro_actual());

drop policy if exists centros_update on centros;
create policy centros_update on centros for update to authenticated
  using (id = centro_actual() and es_admin())
  with check (id = centro_actual());

-- ------------------------------------------------------------
-- sedes
-- ------------------------------------------------------------
drop policy if exists sedes_select on sedes;
create policy sedes_select on sedes for select to authenticated
  using (centro_id = centro_actual());

drop policy if exists sedes_admin on sedes;
create policy sedes_admin on sedes for all to authenticated
  using (centro_id = centro_actual() and es_admin())
  with check (centro_id = centro_actual() and es_admin());

-- ------------------------------------------------------------
-- perfiles
-- Todos ven a sus companeros de centro (hace falta para mostrar
-- "quien atiende" y para los filtros del admin, UC-11).
-- ------------------------------------------------------------
drop policy if exists perfiles_select on perfiles;
create policy perfiles_select on perfiles for select to authenticated
  using (centro_id = centro_actual());

-- Cada uno edita sus datos; el admin edita a cualquiera de su centro (UC-10).
drop policy if exists perfiles_update on perfiles;
create policy perfiles_update on perfiles for update to authenticated
  using (id = auth.uid() or (centro_id = centro_actual() and es_admin()))
  with check (centro_id = centro_actual());

-- El alta la hace el servidor con service_role (necesita crear el auth.user),
-- pero dejamos la politica por si se opera desde SQL con sesion de admin.
drop policy if exists perfiles_insert on perfiles;
create policy perfiles_insert on perfiles for insert to authenticated
  with check (centro_id = centro_actual() and es_admin());

-- ------------------------------------------------------------
-- pacientes (UC-07, UC-08) - cualquiera del centro los ve y los carga
-- ------------------------------------------------------------
drop policy if exists pacientes_select on pacientes;
create policy pacientes_select on pacientes for select to authenticated
  using (centro_id = centro_actual());

drop policy if exists pacientes_insert on pacientes;
create policy pacientes_insert on pacientes for insert to authenticated
  with check (centro_id = centro_actual());

drop policy if exists pacientes_update on pacientes;
create policy pacientes_update on pacientes for update to authenticated
  using (centro_id = centro_actual())
  with check (centro_id = centro_actual());

-- Borrado fisico solo admin: normalmente se da de baja con activo = false.
drop policy if exists pacientes_delete on pacientes;
create policy pacientes_delete on pacientes for delete to authenticated
  using (centro_id = centro_actual() and es_admin());

-- ------------------------------------------------------------
-- horarios_atencion (UC-09) - cada profesional maneja los propios
-- ------------------------------------------------------------
drop policy if exists horarios_select on horarios_atencion;
create policy horarios_select on horarios_atencion for select to authenticated
  using (centro_id = centro_actual());

drop policy if exists horarios_write on horarios_atencion;
create policy horarios_write on horarios_atencion for all to authenticated
  using (centro_id = centro_actual() and (profesional_id = auth.uid() or es_admin()))
  with check (
    centro_id = centro_actual()
    and (profesional_id = auth.uid() or es_admin())
    and exists (select 1 from perfiles p
                 where p.id = profesional_id and p.centro_id = centro_actual())
  );

-- ------------------------------------------------------------
-- turnos (UC-02, UC-03, UC-04, UC-05, UC-11)
-- Lectura: todo el centro, porque la ficha del paciente (UC-07) muestra
-- su historial completo, aunque lo haya atendido otro profesional.
-- Escritura: el profesional del turno, o el admin.
-- ------------------------------------------------------------
drop policy if exists turnos_select on turnos;
create policy turnos_select on turnos for select to authenticated
  using (centro_id = centro_actual());

drop policy if exists turnos_insert on turnos;
create policy turnos_insert on turnos for insert to authenticated
  with check (
    centro_id = centro_actual()
    -- UC-03: admin siempre; kinesiologo solo para si mismo y si el centro lo permite.
    and (
      es_admin()
      or (profesional_id = auth.uid() and centro_permite_turnos_kine())
    )
    and exists (select 1 from perfiles p
                 where p.id = profesional_id and p.centro_id = centro_actual() and p.activo)
    and exists (select 1 from pacientes pa
                 where pa.id = paciente_id and pa.centro_id = centro_actual())
  );

drop policy if exists turnos_update on turnos;
create policy turnos_update on turnos for update to authenticated
  using (centro_id = centro_actual() and (profesional_id = auth.uid() or es_admin()))
  with check (centro_id = centro_actual() and (profesional_id = auth.uid() or es_admin()));

-- Sin politica de DELETE: los turnos se cancelan (UC-04), no se borran.

-- ------------------------------------------------------------
-- turno_eventos - bitacora de solo agregar
-- ------------------------------------------------------------
drop policy if exists turno_eventos_select on turno_eventos;
create policy turno_eventos_select on turno_eventos for select to authenticated
  using (centro_id = centro_actual());

drop policy if exists turno_eventos_insert on turno_eventos;
create policy turno_eventos_insert on turno_eventos for insert to authenticated
  with check (centro_id = centro_actual() and usuario_id = auth.uid());

-- Sin UPDATE ni DELETE: la bitacora no se reescribe.

-- ------------------------------------------------------------
-- observaciones (UC-06)
-- Solo el profesional que atendio puede cargar la nota, y solo
-- si el turno esta marcado como realizado.
-- ------------------------------------------------------------
drop policy if exists observaciones_select on observaciones;
create policy observaciones_select on observaciones for select to authenticated
  using (centro_id = centro_actual());

drop policy if exists observaciones_insert on observaciones;
create policy observaciones_insert on observaciones for insert to authenticated
  with check (
    centro_id = centro_actual()
    and profesional_id = auth.uid()
    and exists (
      select 1 from turnos t
       where t.id = turno_id
         and t.centro_id = centro_actual()
         and t.profesional_id = auth.uid()
         and t.paciente_id = paciente_id
         and t.estado = 'realizado'
    )
  );

-- El autor puede corregir su propia nota.
drop policy if exists observaciones_update on observaciones;
create policy observaciones_update on observaciones for update to authenticated
  using (centro_id = centro_actual() and profesional_id = auth.uid())
  with check (centro_id = centro_actual() and profesional_id = auth.uid());


-- ============================================================
-- 0004_signup_y_reservas_publicas.sql
--
-- 1. Columnas nuevas (reservas publicas, whatsapp, telefono, origen).
-- 2. Alta automatica de centro + perfil admin al crearse un auth.users
--    (signup por email/password y primer login con Google).
-- 3. API publica de reservas: tres funciones SECURITY DEFINER para el
--    rol anon. NO se abre ninguna politica RLS para anon: las tablas
--    siguen cerradas y toda la logica vive en estas funciones.
--
-- Correr DESPUES de 0001_esquema.sql y 0002_rls.sql. Es idempotente.
-- ============================================================


-- ============================================================
-- PARTE 1 - Columnas nuevas
-- ============================================================

alter table centros add column if not exists reservas_publicas           boolean not null default false;
alter table centros add column if not exists whatsapp_ingreso_automatico boolean not null default true;
alter table centros add column if not exists telefono                    text;
-- La app guarda fecha y hora "de pared", sin UTC. La base de Supabase
-- corre en UTC, asi que "hoy" y "ya paso" hay que calcularlos en la zona
-- del centro o a las 21:00 de Argentina el turno de manana ya es "hoy".
alter table centros add column if not exists zona_horaria text not null
  default 'America/Argentina/Buenos_Aires';

comment on column centros.reservas_publicas is
  'Si es false, /reservar?c=<id> queda cerrado y las RPC publicas no devuelven nada.';

alter table turnos add column if not exists origen text not null default 'centro';

do $$ begin
  alter table turnos add constraint turnos_origen_valido
    check (origen in ('centro', 'online'));
exception when duplicate_object then null; end $$;

comment on column turnos.origen is
  'centro = lo cargo el equipo desde el panel; online = lo saco el paciente sin login.';

-- El default del esquema decia 'Kinesiologia' (sin tilde) pero TIPOS_SESION
-- en dominio.ts usa 'Kinesiologia' con tilde: un turno insertado sin
-- tipo_sesion quedaba sin color en la agenda. Solo afecta filas nuevas.
alter table turnos alter column tipo_sesion set default 'Kinesiología';

-- Para el freno anti-spam por centro (ver reservar_turno_publico).
create index if not exists turnos_online_idx
  on turnos (centro_id, created_at desc) where origen = 'online';


-- ============================================================
-- PARTE 2 - Utilidades
-- ============================================================

-- Normaliza telefonos y DNI a solo digitos, para poder comparar
-- "11 5555-1234" con "1155551234" y "30.123.456" con "30123456".
create or replace function public.solo_digitos(p_texto text) returns text
language sql immutable strict parallel safe
as $$
  select pg_catalog.regexp_replace(p_texto, '[^0-9]', '', 'g')
$$;

-- Cast a uuid que devuelve null en vez de reventar. Lo usa el trigger de
-- auth.users: un metadato mal formado NUNCA debe abortar un signup.
create or replace function public.a_uuid(p_texto text) returns uuid
language plpgsql immutable strict parallel safe
as $$
begin
  return p_texto::uuid;
exception when others then
  return null;
end $$;

create index if not exists pacientes_telefono_idx
  on pacientes (centro_id, public.solo_digitos(telefono));
create index if not exists pacientes_dni_digitos_idx
  on pacientes (centro_id, public.solo_digitos(dni));

-- Cuantos dias para adelante se puede reservar online (DIAS_RESERVA_ONLINE).
create or replace function public.dias_reserva_online() returns integer
language sql immutable parallel safe
as $$ select 60 $$;

-- "Ahora" en la zona horaria del centro. Si zona_horaria quedara con un
-- valor invalido, cae al default en vez de romper la reserva.
create or replace function public.ahora_en_centro(p_centro_id uuid) returns timestamp
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tz text;
  v_ts timestamp;
begin
  select nullif(btrim(c.zona_horaria), '') into v_tz from centros c where c.id = p_centro_id;
  begin
    v_ts := now() at time zone coalesce(v_tz, 'America/Argentina/Buenos_Aires');
  exception when others then
    v_ts := now() at time zone 'America/Argentina/Buenos_Aires';
  end;
  return v_ts;
end $$;

revoke all on function public.ahora_en_centro(uuid) from public;


-- ============================================================
-- PARTE 3 - Alta automatica al crearse un usuario de Auth
--
-- Dos caminos, y la diferencia entre uno y otro es de donde sale el
-- centro:
--
--   a) DUENIO (signUp con email/password, o primer login con Google):
--      centro nuevo + sede "Consultorio" + perfil admin + horarios
--      lunes a viernes 9-13 y 15-19.
--
--   b) INVITADO (el admin da de alta un profesional de SU centro con
--      la service_role key): perfil dentro del centro indicado, con el
--      rol indicado y debe_cambiar_password = true. Sin centro nuevo.
--
-- CLAVE DE SEGURIDAD: el caso (b) se decide MIRANDO raw_app_meta_data,
-- NUNCA raw_user_meta_data. raw_user_meta_data es lo que el navegador
-- manda en supabase.auth.signUp({ options: { data } }) - o sea, lo
-- controla el atacante. Si el trigger leyera centro_id/rol de ahi,
-- cualquiera podria registrarse con
--   signUp({ ..., options: { data: { centro_id: '<uuid ajeno>', rol: 'admin' } } })
-- y quedar como administrador del centro de otra persona.
-- raw_app_meta_data solo se puede escribir con la service_role key
-- (auth.admin.createUser({ app_metadata: ... })): GoTrue no acepta
-- app_metadata desde el endpoint publico de signup.
-- ============================================================

create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_meta      jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_app       jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  v_email     text;
  v_nombre    text;
  v_centro_id uuid;
  v_sede_id   uuid;
  v_rol       rol_usuario;
begin
  -- Idempotencia: si ya tiene perfil (p. ej. lo creo 0003_bootstrap.sql
  -- a mano, o se reejecuta el trigger), no tocamos nada.
  if exists (select 1 from perfiles p where p.id = new.id) then
    return new;
  end if;

  -- perfiles.email es NOT NULL. Un alta sin email (telefono) no deberia
  -- pasar en esta app, pero no la dejamos abortar por eso.
  v_email := lower(coalesce(nullif(btrim(new.email), ''), new.id::text || '@sin-email.local'));

  -- Nombre: lo que mande el signUp, lo que mande Google, o el email.
  v_nombre := coalesce(
    nullif(btrim(v_app  ->> 'nombre'),    ''),
    nullif(btrim(v_meta ->> 'nombre'),    ''),
    nullif(btrim(v_meta ->> 'full_name'), ''),
    nullif(btrim(v_meta ->> 'name'),      ''),
    initcap(replace(split_part(v_email, '@', 1), '.', ' '))
  );
  v_nombre := left(v_nombre, 80);

  -- perfiles_email_key es unica sobre lower(email) en TODA la base. Si el
  -- email ya tiene perfil con otro auth.users.id (tipico: cuenta creada
  -- con password y despues login con Google sin que GoTrue vincule las
  -- identidades), abortamos el alta con un mensaje claro en vez de dejar
  -- un usuario de Auth huerfano y sin perfil.
  if exists (select 1 from perfiles p where lower(p.email) = v_email) then
    raise exception 'Ya existe un perfil con el email %', v_email
      using errcode = 'unique_violation';
  end if;

  -- ---------- (b) Invitado por un admin ----------
  v_centro_id := public.a_uuid(nullif(btrim(v_app ->> 'centro_id'), ''));

  if v_centro_id is not null and exists (select 1 from centros c where c.id = v_centro_id) then
    v_rol := case when lower(coalesce(v_app ->> 'rol', '')) = 'admin'
                  then 'admin' else 'kinesiologo' end::rol_usuario;

    insert into perfiles (id, centro_id, nombre, email, rol,
                          especialidad, telefono, activo, debe_cambiar_password)
    values (new.id, v_centro_id, v_nombre, v_email, v_rol,
            nullif(btrim(v_app ->> 'especialidad'), ''),
            nullif(btrim(v_app ->> 'telefono'), ''),
            true,
            -- solo false si el admin lo pide explicitamente
            lower(coalesce(v_app ->> 'debe_cambiar_password', 'true')) not in ('false', 'f', '0'));

    return new;
  end if;

  -- ---------- (a) Duenio de su propio centro ----------
  insert into centros (nombre)
  values ('Centro de ' || split_part(v_nombre, ' ', 1))
  returning id into v_centro_id;

  insert into sedes (centro_id, nombre)
  values (v_centro_id, 'Consultorio')
  returning id into v_sede_id;

  insert into perfiles (id, centro_id, nombre, email, rol,
                        especialidad, telefono, activo, debe_cambiar_password)
  values (new.id, v_centro_id, v_nombre, v_email, 'admin',
          null, null, true, false);

  -- Semana tipo por defecto: lunes a viernes, 9 a 13 y 15 a 19
  -- (mismo patron que 0003_bootstrap.sql y que registrarCuenta()).
  insert into horarios_atencion (centro_id, profesional_id, sede_id, dia_semana, hora_inicio, hora_fin)
  select v_centro_id, new.id, v_sede_id, d, h.desde, h.hasta
    from generate_series(1, 5) as d,
         (values ('09:00'::time, '13:00'::time),
                 ('15:00'::time, '19:00'::time)) as h(desde, hasta);

  return new;
end $$;

-- El OWNER importa: como postgres es dueño de las tablas de public, el
-- SECURITY DEFINER puede insertar sin que RLS lo frene.
do $$ begin
  alter function public.handle_new_user() owner to postgres;
exception when others then null; end $$;

revoke all on function public.handle_new_user() from public;

-- GoTrue inserta en auth.users con el rol supabase_auth_admin.
do $$ begin
  grant usage on schema public to supabase_auth_admin;
  grant execute on function public.handle_new_user() to supabase_auth_admin;
exception when undefined_object then null; end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- PARTE 4 - API publica de reservas (rol anon)
--
-- Ninguna politica RLS nueva: anon no toca las tablas, solo estas tres
-- funciones. Todas exigen el uuid del centro (128 bits: no se enumera)
-- y todas verifican reservas_publicas.
-- ============================================================

-- Endurecimiento: Supabase, por default privileges, le da GRANT ALL sobre
-- las tablas nuevas de public a anon. Hoy lo unico que lo frena es que no
-- hay ninguna politica "to anon". Le sacamos tambien el grant, asi un
-- "disable row level security" accidental no expone nada.
revoke all on table
  centros, sedes, perfiles, pacientes,
  horarios_atencion, turnos, turno_eventos, observaciones
from anon;


-- ------------------------------------------------------------
-- 4.1 datosParaReservar()
-- Devuelve el minimo: nombre y duracion del centro, profesionales
-- activos CON horarios cargados, y sedes activas. Nunca emails,
-- nunca pacientes, nunca datos de otros centros.
-- ------------------------------------------------------------
create or replace function public.reserva_datos_centro(p_centro_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  c centros%rowtype;
  v_cerrado constant jsonb := jsonb_build_object(
    'centro', null, 'abierto', false,
    'profesionales', '[]'::jsonb, 'sedes', '[]'::jsonb);
begin
  if p_centro_id is null then
    return v_cerrado;
  end if;

  select * into c from centros where id = p_centro_id;
  if not found then
    return v_cerrado;
  end if;

  if not c.reservas_publicas then
    -- Lo minimo para el cartel "el centro cerro las reservas online".
    return jsonb_build_object(
      'centro', jsonb_build_object(
        'id', c.id, 'nombre', c.nombre,
        'duracion_turno_min', c.duracion_turno_min, 'telefono', null),
      'abierto', false,
      'profesionales', '[]'::jsonb,
      'sedes', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'centro', jsonb_build_object(
      'id', c.id, 'nombre', c.nombre,
      'duracion_turno_min', c.duracion_turno_min, 'telefono', c.telefono),
    'abierto', true,
    'profesionales', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'nombre', p.nombre, 'especialidad', p.especialidad)
             order by p.nombre)
        from perfiles p
       where p.centro_id = c.id
         and p.activo
         and exists (select 1 from horarios_atencion h
                      where h.profesional_id = p.id and h.centro_id = c.id)
    ), '[]'::jsonb),
    'sedes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id, 'nombre', s.nombre,
               'direccion', s.direccion, 'activa', s.activa)
             order by s.nombre)
        from sedes s
       where s.centro_id = c.id and s.activa
    ), '[]'::jsonb)
  );
end $$;


-- ------------------------------------------------------------
-- 4.2 slotsPublicos()
-- Horas libres de un profesional en una fecha. Devuelve horas, no
-- turnos: el anonimo nunca ve una fila de la agenda.
-- Los nombres de salida (inicio, fin) coinciden con el tipo Franja.
-- ------------------------------------------------------------
create or replace function public.reserva_slots(
  p_centro_id      uuid,
  p_profesional_id uuid,
  p_fecha          date
)
returns table (inicio time, fin time)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_dur   integer;
  v_paso  interval;
  v_ahora timestamp;
  v_hoy   date;
  v_dow   smallint;
begin
  select c.duracion_turno_min into v_dur
    from centros c
   where c.id = p_centro_id and c.reservas_publicas;
  if v_dur is null then return; end if;

  if not exists (select 1 from perfiles p
                  where p.id = p_profesional_id
                    and p.centro_id = p_centro_id
                    and p.activo) then
    return;
  end if;

  v_ahora := public.ahora_en_centro(p_centro_id);
  v_hoy   := v_ahora::date;

  if p_fecha is null
     or p_fecha < v_hoy
     or p_fecha > v_hoy + public.dias_reserva_online() then
    return;
  end if;

  v_paso := make_interval(mins => v_dur);
  -- extract(dow) da 0 = domingo, igual que Date.getDay() y que dia_semana.
  v_dow  := extract(dow from p_fecha)::smallint;

  return query
  select g.arranca::time,
         (g.arranca + v_paso)::time
    from horarios_atencion h
    cross join lateral generate_series(
           p_fecha + h.hora_inicio,
           p_fecha + h.hora_fin - v_paso,
           v_paso) as g(arranca)
   where h.profesional_id = p_profesional_id
     and h.centro_id      = p_centro_id
     and h.dia_semana     = v_dow
     -- todavia no paso (equivalente a yaPaso(fecha, hora) === false)
     and g.arranca > v_ahora
     -- un slot que termina a las 24:00 daria un rango invalido
     and (g.arranca + v_paso)::time > g.arranca::time
     -- libre: mismo criterio que ESTADOS_VIGENTES y que turnos_sin_solape
     and not exists (
           select 1 from turnos t
            where t.profesional_id = p_profesional_id
              and t.fecha  = p_fecha
              and t.estado <> 'cancelado'
              and rango_horario(t.hora_inicio, t.hora_fin)
               && rango_horario(g.arranca::time, (g.arranca + v_paso)::time))
   order by 1;
end $$;


-- ------------------------------------------------------------
-- 4.3 reservarTurnoPublico()
-- Todo el alta en una sola transaccion. Devuelve { ok, id } o
-- { error }, con los mismos mensajes que la version local, para que
-- la UI no tenga que traducir codigos de Postgres.
-- ------------------------------------------------------------
create or replace function public.reservar_turno_publico(
  p_centro_id      uuid,
  p_profesional_id uuid,
  p_fecha          date,
  p_hora_inicio    time,
  p_sede_id        uuid    default null,
  p_nombre         text    default '',
  p_apellido       text    default '',
  p_telefono       text    default '',
  p_email          text    default null,
  p_dni            text    default null,
  p_cobertura      text    default 'particular',
  p_obra_social    text    default null,
  p_primera_vez    boolean default false,
  p_comentario     text    default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  -- Mensaje unico y vago para todo lo que podria delatar si una persona
  -- ya es paciente del centro (ficha inactiva, DNI de otra persona...).
  c_generico constant text := 'No pudimos tomar la reserva. Escribinos y lo vemos juntos.';
  -- Freno anti-spam por centro.
  c_max_online   constant integer  := 20;
  c_ventana_spam constant interval := interval '10 minutes';

  c centros%rowtype;

  v_ahora     timestamp;
  v_hoy       date;
  v_dow       smallint;
  v_paso      interval;
  v_hora_fin  time;

  v_nombre      text;
  v_apellido    text;
  v_telefono    text;
  v_tel         text;
  v_email       text;
  v_dni         text;
  v_cobertura   tipo_cobertura;
  v_obra_social text;
  v_comentario  text;

  v_pac_id     uuid;
  v_pac_activo boolean;
  v_pac_ape    text;

  v_mismo_dia integer;
  v_vigentes  integer;
  v_historial integer;
  v_tipo      text;
  v_turno_id  uuid;
begin
  -- ---------- centro ----------
  select * into c from centros where id = p_centro_id;
  if not found or not c.reservas_publicas then
    return jsonb_build_object('error',
      'Las reservas online de este centro están cerradas. Escribinos para coordinar tu turno.');
  end if;

  -- ---------- profesional ----------
  if not exists (select 1 from perfiles p
                  where p.id = p_profesional_id
                    and p.centro_id = p_centro_id
                    and p.activo) then
    return jsonb_build_object('error', 'Ese profesional ya no está tomando turnos.');
  end if;

  -- ---------- sede (tiene que ser del mismo centro y estar activa) ----------
  if p_sede_id is not null
     and not exists (select 1 from sedes s
                      where s.id = p_sede_id
                        and s.centro_id = p_centro_id
                        and s.activa) then
    return jsonb_build_object('error', 'Esa sede ya no está disponible. Elegí otra.');
  end if;

  -- ---------- datos de contacto ----------
  v_nombre   := left(btrim(coalesce(p_nombre,   '')), 80);
  v_apellido := left(btrim(coalesce(p_apellido, '')), 80);
  v_telefono := left(btrim(coalesce(p_telefono, '')), 40);
  v_tel      := public.solo_digitos(v_telefono);
  v_email    := lower(nullif(btrim(coalesce(p_email, '')), ''));
  v_dni      := nullif(public.solo_digitos(coalesce(p_dni, '')), '');
  v_comentario  := nullif(left(btrim(coalesce(p_comentario,  '')), 500), '');
  v_obra_social := nullif(left(btrim(coalesce(p_obra_social, '')),  80), '');

  if v_nombre = '' or v_apellido = '' then
    return jsonb_build_object('error', 'Poné tu nombre y tu apellido.');
  end if;
  if v_tel is null or length(v_tel) < 8 or length(v_tel) > 20 then
    return jsonb_build_object('error', 'Dejanos un teléfono de contacto válido.');
  end if;
  if v_email is not null and v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return jsonb_build_object('error', 'Revisá el email: no parece válido.');
  end if;
  if v_dni is not null and (length(v_dni) < 6 or length(v_dni) > 12) then
    return jsonb_build_object('error', 'Revisá el DNI.');
  end if;

  if lower(coalesce(p_cobertura, 'particular')) = 'obra_social' then
    v_cobertura := 'obra_social';
    if v_obra_social is null then
      return jsonb_build_object('error', 'Decinos cuál es tu obra social.');
    end if;
  else
    v_cobertura   := 'particular';
    v_obra_social := null;   -- respeta pacientes_obra_social_coherente
  end if;

  -- ---------- fecha y hora ----------
  v_ahora := public.ahora_en_centro(p_centro_id);
  v_hoy   := v_ahora::date;
  v_paso  := make_interval(mins => c.duracion_turno_min);

  if p_fecha is null or p_hora_inicio is null then
    return jsonb_build_object('error', 'Elegí una fecha y un horario.');
  end if;
  if p_fecha < v_hoy then
    return jsonb_build_object('error', 'Esa fecha ya pasó.');
  end if;
  if p_fecha > v_hoy + public.dias_reserva_online() then
    return jsonb_build_object('error',
      'Por ahora se puede reservar hasta ' || public.dias_reserva_online() ||
      ' días para adelante.');
  end if;
  if (p_fecha + p_hora_inicio) <= v_ahora then
    return jsonb_build_object('error', 'Ese horario ya pasó. Elegí otro.');
  end if;

  v_hora_fin := (p_fecha + p_hora_inicio + v_paso)::time;
  v_dow      := extract(dow from p_fecha)::smallint;

  -- Dentro de una franja de atencion (equivale a estaEnHorarioDeAtencion).
  if v_hora_fin <= p_hora_inicio    -- cruzaria la medianoche
     or not exists (select 1 from horarios_atencion h
                     where h.profesional_id = p_profesional_id
                       and h.centro_id  = p_centro_id
                       and h.dia_semana = v_dow
                       and p_hora_inicio >= h.hora_inicio
                       and v_hora_fin    <= h.hora_fin) then
    return jsonb_build_object('error',
      'Ese horario no está entre los de atención. Elegí uno de los que aparecen libres.');
  end if;

  -- Tiene que ser exactamente uno de los slots que ofrecemos: eso valida
  -- de una sola vez el alineado a la grilla y que este libre.
  if not exists (select 1 from public.reserva_slots(p_centro_id, p_profesional_id, p_fecha) s
                  where s.inicio = p_hora_inicio) then
    return jsonb_build_object('error',
      'Justo te ganaron de mano ese horario. Elegí otro, por favor.');
  end if;

  -- ---------- freno anti-spam del centro ----------
  if (select count(*) from turnos t
       where t.centro_id = p_centro_id
         and t.origen = 'online'
         and t.created_at > now() - c_ventana_spam) >= c_max_online then
    return jsonb_build_object('error',
      'Estamos recibiendo muchas reservas en este momento. Probá de nuevo en unos minutos.');
  end if;

  -- Serializa las reservas de la misma persona (mismo telefono, mismo
  -- centro): sin esto, dos pedidos simultaneos esquivan los limites de
  -- "un turno por dia" y "3 vigentes". Se libera al terminar la transaccion.
  perform pg_advisory_xact_lock(hashtextextended(p_centro_id::text || '|' || v_tel, 0));

  -- ---------- paciente + turno, todo o nada ----------
  begin
    -- 1) por DNI (comparando solo digitos). Exigimos que el apellido
    --    coincida: si no, alguien con un DNI ajeno podria colgarle turnos
    --    a la ficha de otra persona.
    if v_dni is not null then
      select p.id, p.activo, p.apellido
        into v_pac_id, v_pac_activo, v_pac_ape
        from pacientes p
       where p.centro_id = p_centro_id
         and public.solo_digitos(p.dni) = v_dni
       limit 1;

      if v_pac_id is not null and lower(btrim(v_pac_ape)) <> lower(v_apellido) then
        return jsonb_build_object('error', c_generico);
      end if;
    end if;

    -- 2) por telefono + apellido dentro del mismo centro
    if v_pac_id is null then
      select p.id, p.activo
        into v_pac_id, v_pac_activo
        from pacientes p
       where p.centro_id = p_centro_id
         and public.solo_digitos(p.telefono) = v_tel
         and lower(btrim(p.apellido)) = lower(v_apellido)
       limit 1;
    end if;

    if v_pac_id is not null and not v_pac_activo then
      return jsonb_build_object('error', c_generico);
    end if;

    if v_pac_id is null then
      insert into pacientes (centro_id, nombre, apellido, dni, telefono, email,
                             cobertura, obra_social, activo)
      values (p_centro_id, v_nombre, v_apellido, v_dni, v_telefono, v_email,
              v_cobertura, v_obra_social, true)
      returning id into v_pac_id;
    else
      -- Completamos contacto solo si falta. A diferencia de la version
      -- local, NO pisamos telefono/email de una ficha existente: quien
      -- reserva no esta autenticado y no queremos que un tercero pueda
      -- reescribir los datos de contacto de un paciente real.
      update pacientes p
         set telefono = coalesce(nullif(btrim(p.telefono), ''), v_telefono),
             email    = coalesce(nullif(btrim(p.email),    ''), v_email)
       where p.id = v_pac_id;
    end if;

    -- Frenos por paciente (mismos que la version local).
    select count(*) filter (where t.fecha = p_fecha), count(*)
      into v_mismo_dia, v_vigentes
      from turnos t
     where t.paciente_id = v_pac_id
       and t.fecha >= v_hoy
       and t.estado <> 'cancelado';

    if v_mismo_dia > 0 then
      return jsonb_build_object('error', 'Ya tenés un turno reservado para ese día.');
    end if;
    if v_vigentes >= 3 then
      return jsonb_build_object('error',
        'Ya tenés varios turnos reservados. Escribinos si necesitás otro más.');
    end if;

    select count(*) into v_historial from turnos t where t.paciente_id = v_pac_id;
    v_tipo := case when p_primera_vez or v_historial = 0
                   then 'Ingreso' else 'Kinesiología' end;

    insert into turnos (centro_id, profesional_id, paciente_id, sede_id,
                        fecha, hora_inicio, hora_fin, tipo_sesion,
                        estado, motivo, origen, created_by)
    values (p_centro_id, p_profesional_id, v_pac_id, p_sede_id,
            p_fecha, p_hora_inicio, v_hora_fin, v_tipo,
            'confirmado', v_comentario, 'online', null)
    returning id into v_turno_id;

    insert into turno_eventos (centro_id, turno_id, tipo, detalle, usuario_id)
    values (p_centro_id, v_turno_id, 'reserva',
            'El paciente lo sacó desde la página pública' ||
            coalesce(' — ' || v_comentario, ''),
            null);

  exception
    -- turnos_sin_solape: alguien reservo el mismo horario entre el
    -- chequeo y el insert. La constraint es el arbitro final.
    when exclusion_violation then
      return jsonb_build_object('error',
        'Justo te ganaron de mano ese horario. Elegí otro, por favor.');
    -- pacientes_dni_key en carrera, o cualquier otra colision.
    when unique_violation or check_violation then
      return jsonb_build_object('error', c_generico);
  end;

  return jsonb_build_object(
    'ok',  'Listo, tu turno quedó reservado.',
    'id',  v_turno_id,
    'tipo_sesion', v_tipo);
end $$;


-- ------------------------------------------------------------
-- Permisos: lo unico que el rol anon puede hacer en toda la base.
-- ------------------------------------------------------------
revoke all on function public.reserva_datos_centro(uuid)            from public;
revoke all on function public.reserva_slots(uuid, uuid, date)       from public;
revoke all on function public.reservar_turno_publico(
  uuid, uuid, date, time, uuid, text, text, text, text, text, text, text, boolean, text
) from public;

grant execute on function public.reserva_datos_centro(uuid)      to anon, authenticated, service_role;
grant execute on function public.reserva_slots(uuid, uuid, date) to anon, authenticated, service_role;
grant execute on function public.reservar_turno_publico(
  uuid, uuid, date, time, uuid, text, text, text, text, text, text, text, boolean, text
) to anon, authenticated, service_role;


-- ============================================================
-- PARTE 5 - Ajustes a politicas de 0002
-- El administrador tambien puede cargar/corregir la observacion
-- clinica de un turno de otro profesional de su centro.
-- ============================================================

drop policy if exists observaciones_insert on observaciones;
create policy observaciones_insert on observaciones for insert to authenticated
  with check (
    centro_id = centro_actual()
    and profesional_id = auth.uid()
    and exists (
      select 1 from turnos t
       where t.id = turno_id
         and t.centro_id = centro_actual()
         and t.paciente_id = paciente_id
         and t.estado = 'realizado'
         and (t.profesional_id = auth.uid() or es_admin())
    )
  );

drop policy if exists observaciones_update on observaciones;
create policy observaciones_update on observaciones for update to authenticated
  using (centro_id = centro_actual() and (profesional_id = auth.uid() or es_admin()))
  with check (centro_id = centro_actual() and (profesional_id = auth.uid() or es_admin()));


-- PostgREST cachea la firma de las funciones.
notify pgrst, 'reload schema';
