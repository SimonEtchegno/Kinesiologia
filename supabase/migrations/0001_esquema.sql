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
