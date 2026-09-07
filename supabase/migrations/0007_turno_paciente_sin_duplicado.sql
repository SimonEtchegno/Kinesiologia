-- ============================================================
-- 0007_turno_paciente_sin_duplicado.sql
--
-- 0006 sacó turnos_sin_solape (un profesional no podía tener dos turnos
-- vigentes solapados) para permitir hasta 4 pacientes distintos en el
-- mismo horario. Efecto colateral: ya nada impedía que el MISMO paciente
-- quedara cargado dos veces en el mismo horario si el alta se disparaba
-- más de una vez (doble clic, reintento de red) — antes ese duplicado
-- lo frenaba de rebote la vieja restricción.
--
-- Esta es la regla que faltaba: un paciente no puede tener dos turnos
-- vigentes con el mismo profesional que se solapen, sin importar cuántos
-- otros pacientes compartan ese horario. No choca con la capacidad de
-- 0006 porque acá paciente_id también entra en la igualdad.
--
-- Correr DESPUES de 0001..0006. Es idempotente.
-- ============================================================

do $$ begin
  alter table turnos add constraint turnos_paciente_sin_solape
    exclude using gist (
      profesional_id with =,
      paciente_id with =,
      fecha with =,
      rango_horario (hora_inicio, hora_fin) with &&
    ) where (estado <> 'cancelado');
exception when duplicate_table then null; when duplicate_object then null; end $$;
