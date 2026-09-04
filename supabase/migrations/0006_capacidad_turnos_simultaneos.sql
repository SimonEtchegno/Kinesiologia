-- ============================================================
-- 0006_capacidad_turnos_simultaneos.sql
--
-- Hasta acá, un profesional no podía tener dos turnos vigentes que se
-- solaparan ni un segundo (turnos_sin_solape, un EXCLUDE de Postgres).
-- Esto pasa a permitir varios pacientes en el mismo horario con el mismo
-- profesional, como una sala compartida:
--
--   - Hasta 4 turnos vigentes solapados por profesional+horario.
--   - De esos 4, como mucho 3 pueden ser de un tipo distinto de "Ingreso"
--     (los 3 "cupos generales"). El 4to lugar queda reservado: solo lo
--     puede ocupar un turno de tipo Ingreso.
--
-- Un EXCLUDE no puede expresar esta regla (no es "nunca se solapan", es
-- "hasta N, con una reserva por tipo"), así que se reemplaza por un
-- trigger que cuenta antes de cada insert/update, con un advisory lock
-- para que dos requests a la vez no se cuelen las dos.
--
-- Correr DESPUES de 0001..0005. Es idempotente.
-- ============================================================

alter table turnos drop constraint if exists turnos_sin_solape;


-- ------------------------------------------------------------
-- Constantes (mismo patrón que dias_reserva_online() de 0004).
-- ------------------------------------------------------------
create or replace function public.capacidad_turnos_simultaneos() returns integer
language sql immutable parallel safe
as $$ select 4 $$;

create or replace function public.cupos_generales_simultaneos() returns integer
language sql immutable parallel safe
as $$ select 3 $$;


-- ------------------------------------------------------------
-- Cuenta los turnos vigentes que se solapan con un rango dado, para un
-- profesional y fecha. security definer: la llaman tanto el trigger
-- (para cualquier insert/update) como las RPC públicas de reservas,
-- que no tienen acceso directo a la tabla turnos.
-- ------------------------------------------------------------
create or replace function public.turno_capacidad(
  p_profesional_id uuid,
  p_fecha          date,
  p_inicio         time,
  p_fin            time,
  p_excluir        uuid default null
)
returns table (total integer, no_ingreso integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    count(*)::int,
    count(*) filter (where t.tipo_sesion <> 'Ingreso')::int
  from turnos t
  where t.profesional_id = p_profesional_id
    and t.fecha = p_fecha
    and t.estado <> 'cancelado'
    and (p_excluir is null or t.id <> p_excluir)
    and rango_horario(t.hora_inicio, t.hora_fin) && rango_horario(p_inicio, p_fin);
$$;

revoke all on function public.turno_capacidad(uuid, date, time, time, uuid) from public;
grant execute on function public.turno_capacidad(uuid, date, time, time, uuid)
  to authenticated, service_role;


-- ------------------------------------------------------------
-- ¿Hay lugar para un turno de este tipo en este rango? Encapsula la
-- regla de capacidad (4 en total, 3 de "cupo general" + 1 reservado
-- para Ingreso) en un solo lugar, para que el trigger y las RPC
-- públicas no puedan desincronizarse.
-- ------------------------------------------------------------
create or replace function public.hay_lugar_turno(
  p_profesional_id uuid,
  p_fecha          date,
  p_inicio         time,
  p_fin            time,
  p_tipo_sesion    text,
  p_excluir        uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_total      integer;
  v_no_ingreso integer;
begin
  select c.total, c.no_ingreso into v_total, v_no_ingreso
    from public.turno_capacidad(p_profesional_id, p_fecha, p_inicio, p_fin, p_excluir) c;

  if v_total >= public.capacidad_turnos_simultaneos() then
    return false;
  end if;

  if p_tipo_sesion <> 'Ingreso' and v_no_ingreso >= public.cupos_generales_simultaneos() then
    return false;
  end if;

  return true;
end $$;

revoke all on function public.hay_lugar_turno(uuid, date, time, time, text, uuid) from public;
grant execute on function public.hay_lugar_turno(uuid, date, time, time, text, uuid)
  to authenticated, service_role;


-- ------------------------------------------------------------
-- Trigger: última palabra sobre la capacidad, para cualquier camino de
-- alta o reprogramación (panel o reserva pública), no solo lo que cada
-- código de aplicación llegue a chequear antes. El advisory lock evita
-- que dos inserts a la vez pasen el conteo juntos y se pasen del cupo.
-- ------------------------------------------------------------
create or replace function public.chequear_capacidad_turno() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.estado = 'cancelado' then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(new.profesional_id::text || '|' || new.fecha::text, 0)
  );

  if not public.hay_lugar_turno(
    new.profesional_id, new.fecha, new.hora_inicio, new.hora_fin, new.tipo_sesion, new.id
  ) then
    raise exception 'Ese horario ya está completo.' using errcode = '23P01';
  end if;

  return new;
end $$;

drop trigger if exists turnos_capacidad on turnos;
create trigger turnos_capacidad
  before insert or update of profesional_id, fecha, hora_inicio, hora_fin, tipo_sesion, estado
  on turnos
  for each row execute function public.chequear_capacidad_turno();


-- ------------------------------------------------------------
-- reserva_slots(): un horario se ofrece como libre si queda lugar para
-- por lo menos un Ingreso (el chequeo exacto por tipo lo hace
-- reservar_turno_publico al confirmar, con hay_lugar_turno).
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
     and g.arranca > v_ahora
     and (g.arranca + v_paso)::time > g.arranca::time
     -- Libre = queda lugar para al menos un Ingreso (capacidad total).
     and (select c.total from public.turno_capacidad(
            p_profesional_id, p_fecha, g.arranca::time, (g.arranca + v_paso)::time
          ) c) < public.capacidad_turnos_simultaneos()
   order by 1;
end $$;


-- ------------------------------------------------------------
-- reservar_turno_publico(): el chequeo final de lugar usa el tipo real
-- del turno (v_tipo), no el "está en la lista de reserva_slots" de
-- antes — eso solo alcanza para el cupo general.
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
  c_generico constant text := 'No pudimos tomar la reserva. Escribinos y lo vemos juntos.';
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
  select * into c from centros where id = p_centro_id;
  if not found or not c.reservas_publicas then
    return jsonb_build_object('error',
      'Las reservas online de este centro están cerradas. Escribinos para coordinar tu turno.');
  end if;

  if not exists (select 1 from perfiles p
                  where p.id = p_profesional_id
                    and p.centro_id = p_centro_id
                    and p.activo) then
    return jsonb_build_object('error', 'Ese profesional ya no está tomando turnos.');
  end if;

  if p_sede_id is not null
     and not exists (select 1 from sedes s
                      where s.id = p_sede_id
                        and s.centro_id = p_centro_id
                        and s.activa) then
    return jsonb_build_object('error', 'Esa sede ya no está disponible. Elegí otra.');
  end if;

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
    v_obra_social := null;
  end if;

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

  if v_hora_fin <= p_hora_inicio
     or not exists (select 1 from horarios_atencion h
                     where h.profesional_id = p_profesional_id
                       and h.centro_id  = p_centro_id
                       and h.dia_semana = v_dow
                       and p_hora_inicio >= h.hora_inicio
                       and v_hora_fin    <= h.hora_fin) then
    return jsonb_build_object('error',
      'Ese horario no está entre los de atención. Elegí uno de los que aparecen libres.');
  end if;

  if (select count(*) from turnos t
       where t.centro_id = p_centro_id
         and t.origen = 'online'
         and t.created_at > now() - c_ventana_spam) >= c_max_online then
    return jsonb_build_object('error',
      'Estamos recibiendo muchas reservas en este momento. Probá de nuevo en unos minutos.');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_centro_id::text || '|' || v_tel, 0));

  begin
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
      update pacientes p
         set telefono = coalesce(nullif(btrim(p.telefono), ''), v_telefono),
             email    = coalesce(nullif(btrim(p.email),    ''), v_email)
       where p.id = v_pac_id;
    end if;

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

    -- Chequeo final de lugar con el tipo real: el trigger es la última
    -- palabra (con su propio advisory lock por profesional+fecha), esto
    -- solo evita un insert que ya sabemos que va a fallar.
    if not public.hay_lugar_turno(p_profesional_id, p_fecha, p_hora_inicio, v_hora_fin, v_tipo) then
      return jsonb_build_object('error',
        'Justo se ocupó ese horario. Elegí otro, por favor.');
    end if;

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
    when exclusion_violation then
      return jsonb_build_object('error',
        'Justo te ganaron de mano ese horario. Elegí otro, por favor.');
    when unique_violation or check_violation then
      return jsonb_build_object('error', c_generico);
  end;

  return jsonb_build_object(
    'ok',  'Listo, tu turno quedó reservado.',
    'id',  v_turno_id,
    'tipo_sesion', v_tipo);
end $$;

-- PostgREST cachea la firma de las funciones.
notify pgrst, 'reload schema';
