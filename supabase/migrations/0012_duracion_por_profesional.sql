-- ============================================================
-- 0012_duracion_por_profesional.sql
--
-- La duración de la sesión era un único valor del centro
-- (centros.duracion_turno_min), así que en un centro compartido las dos
-- profesionales quedaban atadas al mismo número aunque trabajen
-- distinto (Milagros usaba 60 minutos y Dolores 45).
--
-- Ahora cada una puede tener la suya: perfiles.duracion_turno_min, que
-- si queda en NULL cae en la del centro. El valor del centro sigue
-- siendo el default para quien no lo cambie.
--
-- Esto importa sobre todo en la reserva online, donde la grilla la
-- calcula la base: en el panel la duración ya se podía ajustar por turno
-- desde el formulario.
--
-- Los cuerpos de abajo son los que estaban vivos en la base con el
-- cambio aplicado (generados desde pg_get_functiondef para no
-- introducir diferencias al recopiarlos a mano).
--
-- Correr DESPUES de 0011. Es idempotente.
-- ============================================================

alter table perfiles
  add column if not exists duracion_turno_min integer;

do $$ begin
  alter table perfiles add constraint perfiles_duracion_razonable
    check (duracion_turno_min is null or duracion_turno_min between 10 and 240);
exception when duplicate_object then null; end $$;


-- ------------------------------------------------------------
-- reserva_datos_centro
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reserva_datos_centro(p_centro_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
               'id', p.id, 'nombre', p.nombre, 'especialidad', p.especialidad,
               'duracion_turno_min', coalesce(p.duracion_turno_min, c.duracion_turno_min))
             order by p.nombre)
        from perfiles p
       where p.centro_id = c.id
         and p.activo
         and p.acepta_reservas_online
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
end $function$
;

-- ------------------------------------------------------------
-- reserva_slots
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reserva_slots(p_centro_id uuid, p_profesional_id uuid, p_fecha date)
 RETURNS TABLE(inicio time without time zone, fin time without time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
                    and p.activo
                    and p.acepta_reservas_online) then
    return;
  end if;

  -- Cada profesional puede tener su propia duración de sesión; si no la
  -- definió, queda la del centro (0012).
  select coalesce(p.duracion_turno_min, v_dur) into v_dur
    from perfiles p where p.id = p_profesional_id;

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
end $function$
;

-- ------------------------------------------------------------
-- reservar_turno_publico
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reservar_turno_publico(p_centro_id uuid, p_profesional_id uuid, p_fecha date, p_hora_inicio time without time zone, p_sede_id uuid DEFAULT NULL::uuid, p_nombre text DEFAULT ''::text, p_apellido text DEFAULT ''::text, p_telefono text DEFAULT ''::text, p_email text DEFAULT NULL::text, p_dni text DEFAULT NULL::text, p_cobertura text DEFAULT 'particular'::text, p_obra_social text DEFAULT NULL::text, p_primera_vez boolean DEFAULT false, p_comentario text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
                    and p.activo
                    and p.acepta_reservas_online) then
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
  -- La duración es la de la profesional, con la del centro como respaldo (0012).
  v_paso  := make_interval(mins => coalesce(
               (select p.duracion_turno_min from perfiles p where p.id = p_profesional_id),
               c.duracion_turno_min));

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
end $function$
;


notify pgrst, 'reload schema';
