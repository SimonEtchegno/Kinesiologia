-- ============================================================
-- seed_demo.sql - Datos de prueba (OPCIONAL)
--
-- Carga pacientes y unas ocho semanas de turnos en el primer centro
-- que encuentre, para ver la agenda y los reportes con algo adentro.
-- Correr DESPUÉS de 0003_bootstrap.sql. No usar en producción.
-- ============================================================

do $$
declare
  v_centro_id uuid;
  v_sede_id   uuid;
  v_admin_id  uuid;

  v_pacientes uuid[];
  v_paciente  uuid;

  v_prof   record;
  v_franja record;
  v_fecha  date;
  v_hora   time;
  v_dur    interval := interval '45 minutes';

  v_estado estado_turno;
  v_turno  uuid;
  v_tipos  text[] := array[
    'Kinesiología',
    'Rehabilitación traumatológica',
    'Terapia manual',
    'Kinesiología deportiva',
    'Reeducación postural'
  ];
  v_sorteo numeric;
begin
  select c.id into v_centro_id from centros c order by c.created_at limit 1;
  if v_centro_id is null then
    raise exception 'No hay ningún centro. Corré 0003_bootstrap.sql primero.';
  end if;

  select s.id into v_sede_id from sedes s where s.centro_id = v_centro_id limit 1;
  select p.id into v_admin_id from perfiles p where p.centro_id = v_centro_id order by p.created_at limit 1;

  -- ------------------------------------------------------------
  -- Pacientes
  -- ------------------------------------------------------------
  with nuevos as (
    insert into pacientes
      (centro_id, nombre, apellido, dni, telefono, email, fecha_nacimiento,
       cobertura, obra_social, nro_afiliado, notas, created_by)
    values
      (v_centro_id, 'Lucía',    'Ferreyra',  '32456789', '11 4455-1122', 'lucia.ferreyra@mail.com',  '1986-03-14', 'obra_social', 'OSDE',           '62-4455112-01', 'Derivada por hombro doloroso. 10 sesiones autorizadas.', v_admin_id),
      (v_centro_id, 'Martín',   'Quiroga',   '28991234', '11 6677-8899', null,                        '1981-11-02', 'particular',  null,             null,            'Post operatorio de rodilla derecha.',                     v_admin_id),
      (v_centro_id, 'Sofía',    'Beltrán',   '41233445', '11 3344-5566', 'sofi.beltran@mail.com',     '1998-07-21', 'obra_social', 'Swiss Medical',  'SM-9981223',    null,                                                      v_admin_id),
      (v_centro_id, 'Jorge',    'Nieto',     '17554321', '11 2233-4455', null,                        '1962-01-30', 'obra_social', 'PAMI',           'PAMI-1755432',  'Marcha con bastón. Sesiones cortas.',                     v_admin_id),
      (v_centro_id, 'Camila',   'Ordóñez',   '38776655', '11 5566-7788', 'camila.o@mail.com',         '1993-09-08', 'particular',  null,             null,            null,                                                      v_admin_id),
      (v_centro_id, 'Diego',    'Sanabria',  '30112233', '11 7788-9900', null,                        '1984-05-17', 'obra_social', 'IOMA',           'IOMA-3011223',  'Lumbalgia crónica.',                                      v_admin_id),
      (v_centro_id, 'Valentina','Ruiz Díaz', '44556677', '11 8899-0011', 'vale.rd@mail.com',          '2001-12-05', 'particular',  null,             null,            'Vóley federada. Esguince de tobillo grado II.',           v_admin_id),
      (v_centro_id, 'Héctor',   'Almada',    '14332211', '11 9900-1122', null,                        '1957-08-23', 'obra_social', 'OSECAC',         'OSE-1433221',   'EPOC. Kinesiología respiratoria.',                        v_admin_id),
      (v_centro_id, 'Renata',   'Vidal',     '39887766', '11 1122-3344', 'renata.vidal@mail.com',     '1995-02-11', 'obra_social', 'Galeno',         'GAL-3988776',   null,                                                      v_admin_id),
      (v_centro_id, 'Bruno',    'Ferrari',   '35667788', '11 4433-2211', null,                        '1990-06-29', 'particular',  null,             null,            'Cervicalgia por trabajo de escritorio.',                  v_admin_id),
      (v_centro_id, 'Julieta',  'Moretti',   '42998877', '11 6655-4433', 'ju.moretti@mail.com',       '1999-10-19', 'obra_social', 'Medifé',         'MED-4299887',   null,                                                      v_admin_id),
      (v_centro_id, 'Alberto',  'Cabrera',   '12445566', '11 3322-1100', null,                        '1953-04-03', 'obra_social', 'PAMI',           'PAMI-1244556',  'Prótesis de cadera, 4 meses.',                            v_admin_id)
    returning id
  )
  select array_agg(id) into v_pacientes from nuevos;

  raise notice 'Cargados % pacientes.', array_length(v_pacientes, 1);

  -- ------------------------------------------------------------
  -- Turnos: seis semanas para atrás y dos para adelante
  -- ------------------------------------------------------------
  for v_prof in
    select p.id from perfiles p where p.centro_id = v_centro_id and p.activo
  loop
    v_fecha := current_date - interval '6 weeks';

    while v_fecha <= current_date + interval '2 weeks' loop
      for v_franja in
        select h.hora_inicio, h.hora_fin
          from horarios_atencion h
         where h.profesional_id = v_prof.id
           and h.dia_semana = extract(dow from v_fecha)
         order by h.hora_inicio
      loop
        v_hora := v_franja.hora_inicio;

        while v_hora + v_dur <= v_franja.hora_fin loop
          -- No llenamos la agenda al 100%: queda espacio libre.
          if random() < 0.62 then
            v_paciente := v_pacientes[1 + floor(random() * array_length(v_pacientes, 1))::int];

            if v_fecha < current_date then
              v_sorteo := random();
              v_estado := case
                            when v_sorteo < 0.78 then 'realizado'
                            when v_sorteo < 0.90 then 'ausente'
                            else 'cancelado'
                          end::estado_turno;
            elsif v_fecha = current_date and v_hora < localtime then
              v_estado := 'realizado';
            else
              v_estado := 'confirmado';
            end if;

            insert into turnos
              (centro_id, profesional_id, paciente_id, sede_id, fecha, hora_inicio, hora_fin,
               tipo_sesion, estado, created_by, motivo)
            values
              (v_centro_id, v_prof.id, v_paciente, v_sede_id, v_fecha, v_hora, v_hora + v_dur,
               v_tipos[1 + floor(random() * array_length(v_tipos, 1))::int], v_estado, v_admin_id,
               case when v_estado = 'cancelado' then 'Avisó el paciente' end)
            returning id into v_turno;

            insert into turno_eventos (centro_id, turno_id, tipo, detalle, usuario_id)
            values (v_centro_id, v_turno, 'creado', null, v_admin_id);

            if v_estado <> 'confirmado' then
              insert into turno_eventos (centro_id, turno_id, tipo, detalle, usuario_id)
              values (v_centro_id, v_turno, v_estado::text, null, v_prof.id);
            end if;

            -- Observación en la mayoría de las sesiones realizadas.
            if v_estado = 'realizado' and random() < 0.85 then
              insert into observaciones
                (centro_id, turno_id, paciente_id, profesional_id, evolucion, dolor_referido,
                 ejercicios_indicados, proxima_sesion_sugerida)
              values (
                v_centro_id, v_turno, v_paciente, v_prof.id,
                (array[
                  'Buena tolerancia a la carga. Mejora el rango de movimiento respecto de la sesión anterior.',
                  'Trabajamos movilidad y activación. Refiere menos molestia al final de la sesión.',
                  'Se avanzó con ejercicio isométrico. Sin dolor durante la ejecución.',
                  'Sesión de terapia manual más elongación. Buena respuesta.',
                  'Persiste rigidez matinal, pero mejora la funcionalidad en actividades diarias.'
                ])[1 + floor(random() * 5)::int],
                floor(random() * 7)::smallint,
                (array[
                  'Isométricos 3 x 20 segundos, dos veces por día.',
                  'Elongación suave sostenida 30 segundos, tres repeticiones.',
                  'Bicicleta fija 15 minutos, carga liviana.',
                  'Ejercicios de estabilización lumbar, una serie diaria.',
                  null
                ])[1 + floor(random() * 5)::int],
                (array['En 2 días', 'En 3 días', 'Próxima semana', 'En 15 días'])[1 + floor(random() * 4)::int]
              );

              insert into turno_eventos (centro_id, turno_id, tipo, detalle, usuario_id)
              values (v_centro_id, v_turno, 'observacion', null, v_prof.id);
            end if;
          end if;

          v_hora := v_hora + v_dur;
        end loop;
      end loop;

      v_fecha := v_fecha + interval '1 day';
    end loop;
  end loop;

  raise notice 'Turnos cargados: %', (select count(*) from turnos where centro_id = v_centro_id);
end $$;
