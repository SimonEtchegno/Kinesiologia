-- ============================================================
-- 0010_centro_cik.sql
--
-- Dolores y Milagros trabajan juntas en CIK, pero cada una había quedado
-- en su propio centro aislado: handle_new_user() (0004) le crea un centro
-- nuevo a cualquiera que entre con Google sin invitación previa, y la
-- pantalla de invitaciones se había eliminado. Por eso no se veían entre
-- ellas ni podían cargarse turnos.
--
-- Esto crea el centro CIK y las mueve a las dos con todo lo que tenían
-- cargado. La privacidad entre ellas ya la puso 0009: comparten centro
-- pero cada una sigue viendo solo su agenda y sus pacientes.
--
-- NO borra nada: los turnos y pacientes solo cambian de centro, y los
-- dos centros viejos quedan vacíos y renombrados (borrarlos dispararía
-- ON DELETE CASCADE, y además rompería los links de reserva online que
-- alguna haya compartido).
--
-- El centro de Simon no se toca.
--
-- Correr DESPUES de 0009. Es re-ejecutable: si los centros de origen ya
-- se movieron, no hace nada.
-- ============================================================

do $$
declare
  c_dolores_centro constant uuid := '441e225a-39f5-4ebb-8fca-576b9795c758';
  c_milagros_centro constant uuid := '14ba45ff-9cd2-441a-a6de-d3b06996f097';
  c_dolores  constant uuid := '2511d6a0-b05e-473f-92c9-128f1acbbeb3';
  c_milagros constant uuid := '467ab513-ee8c-4cf2-86fa-5a9b247e1c03';
  v_origenes uuid[] := array[c_dolores_centro, c_milagros_centro];
  v_cik      uuid;
  v_n        integer;
begin
  -- ---------- ¿ya está aplicado? ----------
  select p.centro_id into v_cik
    from perfiles p where p.id = c_dolores;

  if exists (select 1 from centros c
              where c.id = v_cik and lower(btrim(c.nombre)) = 'cik') then
    raise notice 'Ya estaban en CIK: nada que hacer.';
    return;
  end if;

  -- Serializa contra cualquier otra sesión que toque estos centros.
  perform 1 from centros where id = any(v_origenes) for update;

  -- ---------- guardas ----------
  -- pacientes_dni_key es unique (centro_id, dni): juntar dos centros con
  -- el mismo DNI abortaría a mitad de camino.
  select count(*) into v_n from (
    select dni from pacientes
     where dni is not null and centro_id = any(v_origenes)
     group by dni having count(*) > 1) x;
  if v_n > 0 then
    raise exception 'Hay % DNI repetidos entre los centros. Resolvelos antes.', v_n;
  end if;

  -- ---------- 1) el centro nuevo ----------
  -- reservas_publicas en false a propósito: Milagros las tenía apagadas y
  -- dejarlas prendidas publicaría su agenda sin que lo haya decidido. Se
  -- prende desde Configuración cuando las dos estén de acuerdo.
  insert into centros (nombre, duracion_turno_min, reservas_publicas,
                       kinesiologos_pueden_crear_turnos, whatsapp_ingreso_automatico)
  values ('CIK', 45, false, true, true)
  returning id into v_cik;

  -- ---------- 2) created_by de pacientes, ANTES de mover ----------
  -- Se resuelve con el centro ORIGINAL de cada ficha: si movemos primero,
  -- se pierde la única pista de a quién pertenecía una ficha sin turnos.
  -- Sin esto, un paciente con created_by NULL queda invisible para TODAS
  -- bajo las políticas de 0009 (hay 5 así).
  update pacientes p
     set created_by = coalesce(
           (select coalesce(t.created_by, t.profesional_id)
              from turnos t
             where t.paciente_id = p.id
             order by t.created_at, t.fecha
             limit 1),
           (select a.id from perfiles a
             where a.centro_id = p.centro_id and a.rol = 'admin'
             order by a.created_at
             limit 1))
   where p.created_by is null
     and p.centro_id = any(v_origenes);

  select count(*) into v_n from pacientes
   where created_by is null and centro_id = any(v_origenes);
  if v_n > 0 then
    raise exception 'Quedaron % pacientes sin created_by: serían invisibles. Abortado.', v_n;
  end if;

  -- ---------- 3) los perfiles, como admin de CIK ----------
  update perfiles set centro_id = v_cik, rol = 'admin'
   where id in (c_dolores, c_milagros);

  -- ---------- 4) todo lo que tenían cargado ----------
  -- OJO: en turnos se toca solo centro_id. El trigger turnos_capacidad es
  -- "before insert or update OF profesional_id, fecha, hora_inicio,
  -- hora_fin, tipo_sesion, estado", así que no se dispara y no re-evalúa
  -- la capacidad de filas históricas (alguna podría no pasarla hoy y
  -- abortaría todo). No ampliar este update a esas columnas.
  update sedes             set centro_id = v_cik where centro_id = any(v_origenes);
  update horarios_atencion set centro_id = v_cik where centro_id = any(v_origenes);
  update pacientes         set centro_id = v_cik where centro_id = any(v_origenes);
  update turnos            set centro_id = v_cik where centro_id = any(v_origenes);
  update turno_eventos     set centro_id = v_cik where centro_id = any(v_origenes);
  update observaciones     set centro_id = v_cik where centro_id = any(v_origenes);

  -- ---------- 5) nada puede quedar en los centros viejos ----------
  select (select count(*) from perfiles          where centro_id = any(v_origenes))
       + (select count(*) from sedes             where centro_id = any(v_origenes))
       + (select count(*) from pacientes         where centro_id = any(v_origenes))
       + (select count(*) from horarios_atencion where centro_id = any(v_origenes))
       + (select count(*) from turnos            where centro_id = any(v_origenes))
       + (select count(*) from turno_eventos     where centro_id = any(v_origenes))
       + (select count(*) from observaciones     where centro_id = any(v_origenes))
    into v_n;
  if v_n <> 0 then
    raise exception 'Quedaron % filas en los centros de origen. Abortado.', v_n;
  end if;

  -- ---------- 6) los centros viejos: vacíos, no borrados ----------
  update centros
     set nombre = left(nombre || ' (se fusionó en CIK)', 120),
         reservas_publicas = false
   where id = any(v_origenes);

  -- ---------- 7) sedes duplicadas ----------
  -- Quedaron dos "Cik" con la misma dirección (el mismo lugar físico) y
  -- dos "Consultorio" sin dirección (las que crea el trigger de signup).
  -- Se unifica por nombre+dirección, repuntando ANTES de borrar: sede_id
  -- es on delete set null, así que al revés se perdería la referencia en
  -- silencio (y la sede es lo que el paciente ve en el WhatsApp).
  create temporary table canon_sedes on commit drop as
  select id,
         first_value(id) over (
           partition by lower(btrim(nombre)), coalesce(lower(btrim(direccion)), '')
           order by created_at) as sobrevive
    from sedes
   where centro_id = v_cik;

  update turnos t set sede_id = k.sobrevive
    from canon_sedes k
   where t.sede_id = k.id and k.sobrevive <> k.id;

  update horarios_atencion h set sede_id = k.sobrevive
    from canon_sedes k
   where h.sede_id = k.id and k.sobrevive <> k.id;

  delete from sedes s
   using canon_sedes k
   where s.id = k.id and k.sobrevive <> k.id;

  raise notice 'Listo: CIK = %', v_cik;
end $$;

notify pgrst, 'reload schema';
