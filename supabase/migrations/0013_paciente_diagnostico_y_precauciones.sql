-- ============================================================
-- 0013_paciente_diagnostico_y_precauciones.sql
--
-- Dos datos nuevos en la ficha del paciente, pedidos al cargar turnos:
--
--   - diagnostico : el diagnóstico de derivación. Antes iba mezclado en
--                   "notas administrativas".
--   - precauciones: alertas clínicas que tienen que saltar a la vista
--                   antes de atender (marcapasos, antecedente oncológico,
--                   embarazo, etc.). La app las muestra destacadas en la
--                   ficha, en el detalle del turno y en la agenda.
--
-- Las dos son texto libre y opcionales. La edad no necesita columna: se
-- calcula desde fecha_nacimiento, que ya existía.
--
-- Correr DESPUES de 0012. Es idempotente.
-- ============================================================

alter table pacientes
  add column if not exists diagnostico  text,
  add column if not exists precauciones text;

-- PostgREST cachea el esquema.
notify pgrst, 'reload schema';
