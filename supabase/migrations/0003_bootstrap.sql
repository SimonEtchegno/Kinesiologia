-- ============================================================
-- 0003_bootstrap.sql - Primer centro y primer administrador
--
-- ANTES de correr esto:
--   1. Ejecutá 0001_esquema.sql y 0002_rls.sql.
--   2. En el panel de Supabase, Authentication -> Users -> Add user,
--      creá tu usuario con email y contraseña (marcá "Auto Confirm User").
--   3. Reemplazá los tres valores de abajo y ejecutá este archivo.
-- ============================================================

do $$
declare
  -- >>> CAMBIAR ESTOS TRES VALORES <<<
  v_email  text := 'cambiar@ejemplo.com';
  v_nombre text := 'Nombre Apellido';
  v_centro text := 'Centro de Kinesiología';

  v_uid       uuid;
  v_centro_id uuid;
begin
  select u.id into v_uid from auth.users u where lower(u.email) = lower(v_email);

  if v_uid is null then
    raise exception
      'No hay ningún usuario en Auth con el email %. Crealo primero en Authentication -> Users.',
      v_email;
  end if;

  if exists (select 1 from perfiles p where p.id = v_uid) then
    raise notice 'Ese usuario ya tiene perfil. No se hizo nada.';
    return;
  end if;

  insert into centros (nombre) values (v_centro) returning id into v_centro_id;

  insert into sedes (centro_id, nombre) values (v_centro_id, 'Sede principal');

  insert into perfiles (id, centro_id, nombre, email, rol, especialidad)
  values (v_uid, v_centro_id, v_nombre, lower(v_email), 'admin', 'Kinesiología');

  -- Semana tipo por defecto: lunes a viernes, 9 a 13 y 15 a 19.
  insert into horarios_atencion (centro_id, profesional_id, dia_semana, hora_inicio, hora_fin)
  select v_centro_id, v_uid, d, h.desde, h.hasta
    from generate_series(1, 5) as d,
         (values ('09:00'::time, '13:00'::time), ('15:00'::time, '19:00'::time)) as h(desde, hasta);

  raise notice 'Listo. Centro % creado y % es administrador.', v_centro_id, v_email;
end $$;
