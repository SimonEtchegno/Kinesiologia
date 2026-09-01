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
