-- ============================================================
-- 0005_vaciar_datos.sql
--
-- "Vaciar pacientes y turnos" (Configuracion) necesita borrar filas de
-- turnos/turno_eventos/observaciones, pero 0002_rls.sql a proposito no
-- da politica de DELETE sobre turnos ("se cancelan, no se borran"). Esta
-- funcion es la unica puerta para el borrado masivo que pide esa
-- pantalla: valida admin + su propio centro adentro, no expone nada
-- nuevo a traves de RLS.
-- ============================================================

create or replace function public.vaciar_datos_clinicos(p_centro_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  if p_centro_id is null or p_centro_id <> centro_actual() or not es_admin() then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;

  delete from observaciones  where centro_id = p_centro_id;
  delete from turno_eventos  where centro_id = p_centro_id;
  delete from turnos         where centro_id = p_centro_id;
  delete from pacientes      where centro_id = p_centro_id;
end $$;

revoke all on function public.vaciar_datos_clinicos(uuid) from public;
grant execute on function public.vaciar_datos_clinicos(uuid) to authenticated;

notify pgrst, 'reload schema';
