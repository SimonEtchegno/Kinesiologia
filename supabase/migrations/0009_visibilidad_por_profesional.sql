-- ============================================================
-- 0009_visibilidad_por_profesional.sql
--
-- Hasta acá, dentro de un centro no había NINGUNA privacidad entre
-- profesionales: todas las políticas de SELECT eran solo
-- "centro_id = centro_actual()", así que cualquiera del centro veía los
-- turnos, los pacientes y las notas clínicas de todos. (Dato importante:
-- es_admin() no aparecía en ninguna política de SELECT — ser admin nunca
-- dio visibilidad, la visibilidad ya estaba abierta para todos.)
--
-- Con dos kinesiólogas compartiendo un centro, cada una tiene que ver
-- solo su agenda y sus pacientes, pero SÍ poder cargarle un turno a la
-- otra (y corregirlo si lo cargó mal). Entonces:
--
--   - "mío" en turnos = lo atiendo yo (profesional_id) o lo cargué yo
--     (created_by). Lo segundo no es opcional: crearTurno hace
--     .insert().select('id').single(), y Postgres valida la fila del
--     RETURNING contra la política de SELECT — si no le quedara visible
--     a quien lo cargó, el turno se guardaría y DESPUÉS tiraría error.
--   - marcar realizado/ausente y escribir la nota clínica quedan solo
--     para quien atiende: eso es registro clínico, no corrección de carga.
--   - admin sigue siendo autoridad de CONFIGURACIÓN (centro, sedes,
--     horarios, perfiles), nunca de datos ajenos.
--
-- Correr DESPUES de 0001..0008. Es idempotente.
-- ============================================================


-- ------------------------------------------------------------
-- 1) El trigger de capacidad, ANTES de cerrar la fuga
--
-- turno_capacidad() y hay_lugar_turno() (0006) están concedidas a
-- authenticated sin ningún control de centro ni de pertenencia:
-- cualquier usuario logueado podía consultar por API la ocupación de
-- cualquier profesional de cualquier otro centro.
--
-- Hay que cerrarlas, pero el orden importa: chequear_capacidad_turno()
-- es SECURITY INVOKER y las llama con los permisos del usuario, así que
-- revocar primero rompería toda alta de turnos con "permission denied".
-- Es solo lectura + raise: pasarla a definer no amplía nada.
-- ------------------------------------------------------------
alter function public.chequear_capacidad_turno() security definer;

do $$ begin
  alter function public.chequear_capacidad_turno() owner to postgres;
exception when others then null; end $$;

revoke execute on function
  public.turno_capacidad(uuid, date, time, time, uuid) from authenticated;
revoke execute on function
  public.hay_lugar_turno(uuid, date, time, time, text, uuid) from authenticated;
-- service_role las conserva. reserva_slots() y reservar_turno_publico()
-- son security definer de postgres: no se ven afectadas.


-- ------------------------------------------------------------
-- 2) Ocupación de una colega, para poder cargarle un turno
--
-- slotsDisponibles()/capacidadDisponible() leían turnos directo; con las
-- políticas de abajo verían cero turnos de la colega y ofrecerían
-- horarios ya ocupados. Esto devuelve SOLO rangos horarios y si el turno
-- es de tipo Ingreso (lo único que necesita la regla de capacidad de
-- 0006): ni el paciente, ni el tipo de sesión real, que en este dominio
-- es información clínica ("Traumatología — post-quirúrgico").
--
-- A diferencia de turno_capacidad(), sí está acotada al centro de quien
-- llama, y falla cerrada si centro_actual() es NULL.
-- ------------------------------------------------------------
create or replace function public.ocupacion_profesional(
  p_profesional_id uuid,
  p_fecha          date,
  p_excluir        uuid default null
)
returns table (hora_inicio time, hora_fin time, es_ingreso boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select t.hora_inicio, t.hora_fin, (t.tipo_sesion = 'Ingreso')
    from turnos t
   where public.centro_actual() is not null
     and t.centro_id      = public.centro_actual()
     and t.profesional_id = p_profesional_id
     and t.fecha          = p_fecha
     and t.estado <> 'cancelado'
     and (p_excluir is null or t.id <> p_excluir)
   order by t.hora_inicio, t.hora_fin;
$$;

revoke all on function public.ocupacion_profesional(uuid, date, uuid) from public;
grant execute on function public.ocupacion_profesional(uuid, date, uuid) to authenticated;


-- ------------------------------------------------------------
-- Ids de pacientes del centro con al menos un turno. Reemplaza el
-- conteo de pacientesConTurnoPrevio(), que con las políticas nuevas
-- marcaría como "primera sesión" a un paciente que solo atiende la
-- colega — y eso importa: un Ingreso consume el 4to cupo reservado
-- de 0006. Devuelve ids y nada más.
-- ------------------------------------------------------------
create or replace function public.pacientes_con_historial()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select distinct t.paciente_id
    from turnos t
   where public.centro_actual() is not null
     and t.centro_id = public.centro_actual();
$$;

revoke all on function public.pacientes_con_historial() from public;
grant execute on function public.pacientes_con_historial() to authenticated;


-- ------------------------------------------------------------
-- 3) Helpers de pertenencia
--
-- Van como funciones (y no como subconsultas dentro de las políticas)
-- para que pacientes_select no dependa de que su predicado coincida
-- exactamente con el de turnos_select: una subconsulta a turnos dentro
-- de una política se evalúa TAMBIÉN bajo turnos_select, así que hoy
-- funcionaría solo por coincidencia. Con security definer eso deja de
-- ser una trampa para el próximo que las toque.
--
-- Las tres fallan cerradas: si centro_actual() es NULL (sin perfil, o
-- activo = false), "t.centro_id = NULL" nunca es verdadero.
-- ------------------------------------------------------------
create or replace function public.es_mi_turno(p_turno_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from turnos t
     where t.id        = p_turno_id
       and t.centro_id = public.centro_actual()
       and (t.profesional_id = auth.uid() or t.created_by = auth.uid()));
$$;

/** ¿Atendí yo esta sesión? No alcanza con haberla cargado. */
create or replace function public.atendi_turno(p_turno_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from turnos t
     where t.id        = p_turno_id
       and t.centro_id = public.centro_actual()
       and t.profesional_id = auth.uid());
$$;

create or replace function public.es_mi_paciente(p_paciente_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from turnos t
     where t.paciente_id = p_paciente_id
       and t.centro_id   = public.centro_actual()
       and (t.profesional_id = auth.uid() or t.created_by = auth.uid()));
$$;

revoke all on function public.es_mi_turno(uuid)     from public;
revoke all on function public.atendi_turno(uuid)    from public;
revoke all on function public.es_mi_paciente(uuid)  from public;
grant execute on function public.es_mi_turno(uuid)    to authenticated;
grant execute on function public.atendi_turno(uuid)   to authenticated;
grant execute on function public.es_mi_paciente(uuid) to authenticated;


-- ------------------------------------------------------------
-- 4) turnos
-- ------------------------------------------------------------
drop policy if exists turnos_select on turnos;
create policy turnos_select on turnos for select to authenticated
  using (
    centro_id = centro_actual()
    and (profesional_id = auth.uid() or created_by = auth.uid())
  );

-- Se cae el "or es_admin()": admin ya no es autoridad sobre la agenda de
-- otra. Queda quien atiende y quien lo cargó (para corregir su error).
drop policy if exists turnos_update on turnos;
create policy turnos_update on turnos for update to authenticated
  using (
    centro_id = centro_actual()
    and (profesional_id = auth.uid() or created_by = auth.uid())
  )
  with check (
    centro_id = centro_actual()
    and (profesional_id = auth.uid() or created_by = auth.uid())
  );

-- Igual que 0008, más created_by = auth.uid(): verdad en la bitácora, y
-- garantiza que la fila del RETURNING sea visible para quien la creó.
drop policy if exists turnos_insert on turnos;
create policy turnos_insert on turnos for insert to authenticated
  with check (
    centro_id = centro_actual()
    and created_by = auth.uid()
    and (es_admin() or centro_permite_turnos_kine())
    and exists (select 1 from perfiles p
                 where p.id = profesional_id and p.centro_id = centro_actual() and p.activo)
    and exists (select 1 from pacientes pa
                 where pa.id = paciente_id and pa.centro_id = centro_actual())
  );


-- ------------------------------------------------------------
-- 5) pacientes
--
-- update espeja select a propósito: si no, se podría escribir a ciegas
-- por id una ficha que no se puede leer.
-- ------------------------------------------------------------
drop policy if exists pacientes_select on pacientes;
create policy pacientes_select on pacientes for select to authenticated
  using (
    centro_id = centro_actual()
    and (created_by = auth.uid() or public.es_mi_paciente(id))
  );

drop policy if exists pacientes_insert on pacientes;
create policy pacientes_insert on pacientes for insert to authenticated
  with check (centro_id = centro_actual() and created_by = auth.uid());

drop policy if exists pacientes_update on pacientes;
create policy pacientes_update on pacientes for update to authenticated
  using (
    centro_id = centro_actual()
    and (created_by = auth.uid() or public.es_mi_paciente(id))
  )
  with check (
    centro_id = centro_actual()
    and (created_by = auth.uid() or public.es_mi_paciente(id))
  );

drop policy if exists pacientes_delete on pacientes;
create policy pacientes_delete on pacientes for delete to authenticated
  using (
    centro_id = centro_actual() and es_admin()
    and (created_by = auth.uid() or public.es_mi_paciente(id))
  );


-- ------------------------------------------------------------
-- 6) observaciones
--
-- atendi_turno() va incluido en el select para que el profesional del
-- turno vea la nota aunque la haya cargado otro (pasaba con el
-- "or es_admin()" de 0004): si no, el embed de observaciones en
-- SELECT_TURNO vuelve vacío, la UI ofrece "Cargar nota" y el insert
-- choca contra observaciones_turno_id_key.
-- ------------------------------------------------------------
drop policy if exists observaciones_select on observaciones;
create policy observaciones_select on observaciones for select to authenticated
  using (
    centro_id = centro_actual()
    and (profesional_id = auth.uid() or public.atendi_turno(turno_id))
  );

drop policy if exists observaciones_insert on observaciones;
create policy observaciones_insert on observaciones for insert to authenticated
  with check (
    centro_id = centro_actual()
    and profesional_id = auth.uid()
    and exists (select 1 from turnos t
                 where t.id = turno_id
                   and t.centro_id = centro_actual()
                   and t.paciente_id = paciente_id
                   and t.profesional_id = auth.uid()
                   and t.estado = 'realizado')
  );

drop policy if exists observaciones_update on observaciones;
create policy observaciones_update on observaciones for update to authenticated
  using      (centro_id = centro_actual() and profesional_id = auth.uid())
  with check (centro_id = centro_actual() and profesional_id = auth.uid());


-- ------------------------------------------------------------
-- 7) turno_eventos — la bitácora sigue al turno.
-- El insert queda igual: agregarEvento() no usa .select(), así que no
-- necesita poder ver la fila que acaba de escribir.
-- ------------------------------------------------------------
drop policy if exists turno_eventos_select on turno_eventos;
create policy turno_eventos_select on turno_eventos for select to authenticated
  using (centro_id = centro_actual() and public.es_mi_turno(turno_id));


-- ------------------------------------------------------------
-- Sin cambios y a propósito: perfiles_select, sedes_select,
-- horarios_select y centros_select siguen siendo de todo el centro.
-- Hacen falta para elegir a la colega, validar su franja horaria y
-- mostrar el autor de un evento, y no contienen datos clínicos.
-- centros_update, sedes_admin, horarios_write y perfiles_insert/update
-- siguen con es_admin(): es configuración, y son co-dueñas.
-- ------------------------------------------------------------


-- ------------------------------------------------------------
-- 8) created_by por defecto + índices para los predicados nuevos
--
-- El default es red de seguridad: un campo olvidado en un insert no
-- puede generar una fila invisible para todos. reservar_turno_publico()
-- pasa created_by => null explícito y corre como postgres, así que no
-- se ve afectada.
-- ------------------------------------------------------------
alter table pacientes alter column created_by set default auth.uid();
alter table turnos    alter column created_by set default auth.uid();

create index if not exists turnos_paciente_prof_idx    on turnos (paciente_id, profesional_id);
create index if not exists turnos_paciente_creador_idx on turnos (paciente_id, created_by);
create index if not exists turnos_creador_idx          on turnos (created_by, fecha);
create index if not exists pacientes_creador_idx       on pacientes (centro_id, created_by);


-- ------------------------------------------------------------
-- 9) "Vaciar datos" acotado a lo propio
--
-- vaciar_datos_clinicos(centro_id) (0005) borraba TODOS los turnos,
-- pacientes, eventos y observaciones del centro pidiendo solo es_admin().
-- Con dos co-dueñas admin, cualquiera podía borrar el historial completo
-- de la otra desde Configuración — sin siquiera poder verlo.
-- ------------------------------------------------------------
create or replace function public.vaciar_mis_datos_clinicos()
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_centro uuid := public.centro_actual();
  v_uid    uuid := auth.uid();
begin
  if v_centro is null or v_uid is null then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;

  delete from observaciones o
   where o.centro_id = v_centro and o.profesional_id = v_uid;

  delete from turno_eventos e
   where e.centro_id = v_centro
     and exists (select 1 from turnos t
                  where t.id = e.turno_id and t.profesional_id = v_uid);

  -- Las observaciones que otro haya cargado sobre mis turnos caen por
  -- cascada (observaciones.turno_id es on delete cascade).
  delete from turnos t
   where t.centro_id = v_centro and t.profesional_id = v_uid;

  -- Solo fichas mías que ya no le sirven a nadie: turnos.paciente_id es
  -- on delete restrict, así que una ficha con turnos de otra no se toca.
  delete from pacientes p
   where p.centro_id = v_centro and p.created_by = v_uid
     and not exists (select 1 from turnos t where t.paciente_id = p.id);
end $$;

revoke all on function public.vaciar_mis_datos_clinicos() from public;
grant execute on function public.vaciar_mis_datos_clinicos() to authenticated;

drop function if exists public.vaciar_datos_clinicos(uuid);


-- PostgREST cachea la firma de las funciones.
notify pgrst, 'reload schema';
