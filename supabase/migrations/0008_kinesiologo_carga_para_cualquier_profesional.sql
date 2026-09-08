-- ============================================================
-- 0008_kinesiologo_carga_para_cualquier_profesional.sql
--
-- UC-03: hasta acá, un kinesiólogo (no admin) solo podía cargar turnos en
-- su propia agenda (profesional_id = auth.uid()). Con más de un
-- kinesiólogo en el centro, quieren poder cargarle un turno a un colega
-- (por ejemplo, para cubrirse la agenda entre ellas). Esto solo relaja
-- el INSERT: un kinesiólogo sigue sin poder tocar turnos ajenos ya
-- cargados (eso lo sigue frenando turnos_update, sin cambios).
--
-- Correr DESPUES de 0001..0007. Es idempotente.
-- ============================================================

drop policy if exists turnos_insert on turnos;
create policy turnos_insert on turnos for insert to authenticated
  with check (
    centro_id = centro_actual()
    -- admin siempre; kinesiólogo habilitado, para cualquier profesional
    -- activo del centro (chequeado abajo), no solo para sí mismo.
    and (es_admin() or centro_permite_turnos_kine())
    and exists (select 1 from perfiles p
                 where p.id = profesional_id and p.centro_id = centro_actual() and p.activo)
    and exists (select 1 from pacientes pa
                 where pa.id = paciente_id and pa.centro_id = centro_actual())
  );
