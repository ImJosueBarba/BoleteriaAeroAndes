-- ============================================================================
-- SISTEMA DE RESERVA DE VUELOS - BOLETERÍA JB
-- Schema Completo con todas las migraciones aplicadas
-- Base de Datos PostgreSQL
-- Fecha: 2025-10-20
-- ============================================================================

-- ============================================================================
-- INSTRUCCIONES DE INSTALACIÓN
-- ============================================================================
-- 1. Crear la base de datos (como superusuario):
--    CREATE DATABASE boleteria_vuelos;
--    \c boleteria_vuelos
--
-- 2. Ejecutar este archivo:
--    psql -U tu_usuario -d boleteria_vuelos -f schema_completo.sql
--
-- 3. Cargar datos de prueba:
--    psql -U tu_usuario -d boleteria_vuelos -f seed_data.sql
-- ============================================================================

-- ============================================================================
-- TABLA: USUARIOS
-- Gestión de cuentas de usuario del sistema
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    email_verificado BOOLEAN DEFAULT FALSE,
    token_verificacion VARCHAR(100),
    token_expiracion TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);
CREATE INDEX IF NOT EXISTS idx_usuarios_token_verificacion ON usuarios(token_verificacion);

COMMENT ON TABLE usuarios IS 'Usuarios registrados en el sistema';
COMMENT ON COLUMN usuarios.email_verificado IS 'Indica si el usuario ha verificado su email';
COMMENT ON COLUMN usuarios.token_verificacion IS 'Token para verificación de email';
COMMENT ON COLUMN usuarios.token_expiracion IS 'Fecha de expiración del token de verificación';

-- ============================================================================
-- TABLA: TARJETAS_CREDITO
-- Información de métodos de pago de usuarios
-- ============================================================================
CREATE TABLE IF NOT EXISTS tarjetas_credito (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    numero_tarjeta VARCHAR(16) NOT NULL,
    nombre_titular VARCHAR(150) NOT NULL,
    fecha_expiracion VARCHAR(7) NOT NULL, -- MM/YYYY
    cvv VARCHAR(4) NOT NULL,
    tipo VARCHAR(20) DEFAULT 'VISA', -- VISA, MASTERCARD, AMEX
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activa BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tarjetas_usuario ON tarjetas_credito(usuario_id);

COMMENT ON TABLE tarjetas_credito IS 'Tarjetas de crédito guardadas de usuarios';
COMMENT ON COLUMN tarjetas_credito.numero_tarjeta IS 'Número de tarjeta (almacenar encriptado en producción)';
COMMENT ON COLUMN tarjetas_credito.tipo IS 'Tipo de tarjeta: VISA, MASTERCARD, AMEX';

-- ============================================================================
-- TABLA: CIUDADES
-- Catálogo de aeropuertos y ciudades
-- ============================================================================
CREATE TABLE IF NOT EXISTS ciudades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo_iata VARCHAR(3) UNIQUE NOT NULL, -- Ej: UIO, GYE, BOG
    pais VARCHAR(100) NOT NULL,
    zona_horaria VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_ciudades_codigo ON ciudades(codigo_iata);
CREATE INDEX IF NOT EXISTS idx_ciudades_pais ON ciudades(pais);

COMMENT ON TABLE ciudades IS 'Catálogo de ciudades y aeropuertos';
COMMENT ON COLUMN ciudades.codigo_iata IS 'Código IATA de 3 letras del aeropuerto';

-- ============================================================================
-- TABLA: AEROLINEAS
-- Catálogo de aerolíneas operadoras
-- ============================================================================
CREATE TABLE IF NOT EXISTS aerolineas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    codigo_iata VARCHAR(2) UNIQUE NOT NULL, -- Ej: EQ, AV, LA
    pais VARCHAR(100),
    activa BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_aerolineas_codigo ON aerolineas(codigo_iata);
CREATE INDEX IF NOT EXISTS idx_aerolineas_activa ON aerolineas(activa);

COMMENT ON TABLE aerolineas IS 'Aerolíneas que operan en el sistema';
COMMENT ON COLUMN aerolineas.codigo_iata IS 'Código IATA de 2 letras de la aerolínea';

-- ============================================================================
-- TABLA: VUELOS
-- Definición de rutas de vuelos (plantilla)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vuelos (
    id SERIAL PRIMARY KEY,
    numero_vuelo VARCHAR(10) UNIQUE NOT NULL,
    aerolinea_id INTEGER NOT NULL,
    ciudad_origen_id INTEGER NOT NULL,
    ciudad_destino_id INTEGER NOT NULL,
    hora_salida TIME NOT NULL,
    hora_llegada TIME NOT NULL,
    duracion_minutos INTEGER NOT NULL,
    dias_operacion VARCHAR(7) DEFAULT '1111111', -- LMMJVSD (1=opera, 0=no opera)
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (aerolinea_id) REFERENCES aerolineas(id),
    FOREIGN KEY (ciudad_origen_id) REFERENCES ciudades(id),
    FOREIGN KEY (ciudad_destino_id) REFERENCES ciudades(id)
);

CREATE INDEX IF NOT EXISTS idx_vuelos_numero ON vuelos(numero_vuelo);
CREATE INDEX IF NOT EXISTS idx_vuelos_origen ON vuelos(ciudad_origen_id);
CREATE INDEX IF NOT EXISTS idx_vuelos_destino ON vuelos(ciudad_destino_id);
CREATE INDEX IF NOT EXISTS idx_vuelos_origen_destino ON vuelos(ciudad_origen_id, ciudad_destino_id);
CREATE INDEX IF NOT EXISTS idx_vuelos_aerolinea ON vuelos(aerolinea_id);
CREATE INDEX IF NOT EXISTS idx_vuelos_activo ON vuelos(activo);

COMMENT ON TABLE vuelos IS 'Definición de vuelos (plantilla de ruta)';
COMMENT ON COLUMN vuelos.dias_operacion IS 'Días de la semana que opera: LMMJVSD (1=sí, 0=no)';
COMMENT ON COLUMN vuelos.duracion_minutos IS 'Duración estimada del vuelo en minutos';

-- ============================================================================
-- TABLA: TARIFAS
-- Precios por clase de servicio para cada vuelo
-- ============================================================================
CREATE TABLE IF NOT EXISTS tarifas (
    id SERIAL PRIMARY KEY,
    vuelo_id INTEGER NOT NULL,
    clase VARCHAR(20) NOT NULL, -- ECONOMICA, EJECUTIVA, PRIMERA_CLASE
    precio NUMERIC(10, 2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'USD',
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    FOREIGN KEY (vuelo_id) REFERENCES vuelos(id) ON DELETE CASCADE,
    CONSTRAINT chk_precio_positivo CHECK (precio > 0)
);

CREATE INDEX IF NOT EXISTS idx_tarifas_vuelo ON tarifas(vuelo_id);
CREATE INDEX IF NOT EXISTS idx_tarifas_clase ON tarifas(clase);
CREATE INDEX IF NOT EXISTS idx_tarifas_fechas ON tarifas(fecha_inicio, fecha_fin);

COMMENT ON TABLE tarifas IS 'Tarifas por clase de servicio para cada vuelo';
COMMENT ON COLUMN tarifas.clase IS 'ECONOMICA, EJECUTIVA o PRIMERA_CLASE';

-- ============================================================================
-- TABLA: INSTANCIAS_VUELO
-- Vuelos específicos por fecha (instancia de la plantilla)
-- ============================================================================
CREATE TABLE IF NOT EXISTS instancias_vuelo (
    id SERIAL PRIMARY KEY,
    vuelo_id INTEGER NOT NULL,
    fecha DATE NOT NULL,
    hora_salida_real TIMESTAMP,
    hora_llegada_real TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'PROGRAMADO', -- PROGRAMADO, EN_HORA, RETRASADO, CANCELADO, COMPLETADO
    asientos_disponibles_economica INTEGER DEFAULT 150,
    asientos_disponibles_ejecutiva INTEGER DEFAULT 30,
    asientos_disponibles_primera INTEGER DEFAULT 10,
    puerta VARCHAR(10),
    FOREIGN KEY (vuelo_id) REFERENCES vuelos(id) ON DELETE CASCADE,
    UNIQUE(vuelo_id, fecha),
    CONSTRAINT chk_asientos_no_negativos CHECK (
        asientos_disponibles_economica >= 0 AND
        asientos_disponibles_ejecutiva >= 0 AND
        asientos_disponibles_primera >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_instancias_vuelo ON instancias_vuelo(vuelo_id);
CREATE INDEX IF NOT EXISTS idx_instancias_fecha ON instancias_vuelo(fecha);
CREATE INDEX IF NOT EXISTS idx_instancias_estado ON instancias_vuelo(estado);
CREATE INDEX IF NOT EXISTS idx_instancias_vuelo_fecha ON instancias_vuelo(vuelo_id, fecha);

COMMENT ON TABLE instancias_vuelo IS 'Instancias específicas de vuelos por fecha';
COMMENT ON COLUMN instancias_vuelo.estado IS 'PROGRAMADO, EN_HORA, RETRASADO, CANCELADO, COMPLETADO';
COMMENT ON COLUMN instancias_vuelo.puerta IS 'Puerta de embarque asignada';

-- ============================================================================
-- TABLA: ASIENTOS
-- Configuración de asientos por vuelo
-- ============================================================================
CREATE TABLE IF NOT EXISTS asientos (
    id SERIAL PRIMARY KEY,
    vuelo_id INTEGER NOT NULL,
    numero_asiento VARCHAR(5) NOT NULL, -- Ej: 12A, 5B, 23F
    clase VARCHAR(20) NOT NULL, -- ECONOMICA, EJECUTIVA, PRIMERA_CLASE
    disponible BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (vuelo_id) REFERENCES vuelos(id) ON DELETE CASCADE,
    UNIQUE(vuelo_id, numero_asiento)
);

CREATE INDEX IF NOT EXISTS idx_asientos_vuelo ON asientos(vuelo_id);
CREATE INDEX IF NOT EXISTS idx_asientos_disponible ON asientos(disponible);
CREATE INDEX IF NOT EXISTS idx_asientos_clase ON asientos(clase);

COMMENT ON TABLE asientos IS 'Configuración de asientos por vuelo';
COMMENT ON COLUMN asientos.numero_asiento IS 'Identificador del asiento (ej: 12A, 5B)';

-- ============================================================================
-- TABLA: RESERVAS
-- Reservas de vuelos realizadas por usuarios
-- ============================================================================
CREATE TABLE IF NOT EXISTS reservas (
    id SERIAL PRIMARY KEY,
    codigo_reserva VARCHAR(10) UNIQUE NOT NULL,
    usuario_id INTEGER NOT NULL,
    fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'PENDIENTE', -- PENDIENTE, CONFIRMADA, PAGADA, CANCELADA
    total NUMERIC(10, 2) NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT chk_total_positivo CHECK (total > 0)
);

CREATE INDEX IF NOT EXISTS idx_reservas_codigo ON reservas(codigo_reserva);
CREATE INDEX IF NOT EXISTS idx_reservas_usuario ON reservas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas(estado);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha ON reservas(fecha_reserva);

COMMENT ON TABLE reservas IS 'Reservas de vuelos realizadas por usuarios';
COMMENT ON COLUMN reservas.codigo_reserva IS 'Código único de reserva (ej: ABC123XYZ)';
COMMENT ON COLUMN reservas.estado IS 'PENDIENTE, CONFIRMADA, PAGADA, CANCELADA';

-- ============================================================================
-- TABLA: DETALLES_RESERVA
-- Itinerario detallado de cada reserva (puede tener múltiples vuelos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS detalles_reserva (
    id SERIAL PRIMARY KEY,
    reserva_id INTEGER NOT NULL,
    instancia_vuelo_id INTEGER NOT NULL,
    pasajero_nombre VARCHAR(100) NOT NULL,
    pasajero_apellido VARCHAR(100) NOT NULL,
    asiento_id INTEGER,
    clase VARCHAR(20) NOT NULL,
    precio NUMERIC(10, 2) NOT NULL,
    FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE CASCADE,
    FOREIGN KEY (instancia_vuelo_id) REFERENCES instancias_vuelo(id),
    FOREIGN KEY (asiento_id) REFERENCES asientos(id),
    CONSTRAINT chk_precio_detalle_positivo CHECK (precio > 0)
);

CREATE INDEX IF NOT EXISTS idx_detalles_reserva ON detalles_reserva(reserva_id);
CREATE INDEX IF NOT EXISTS idx_detalles_instancia ON detalles_reserva(instancia_vuelo_id);
CREATE INDEX IF NOT EXISTS idx_detalles_asiento ON detalles_reserva(asiento_id);

COMMENT ON TABLE detalles_reserva IS 'Detalles de cada segmento de vuelo en una reserva';
COMMENT ON COLUMN detalles_reserva.asiento_id IS 'Asiento asignado (puede ser NULL si no se ha seleccionado)';

-- ============================================================================
-- TABLA: BILLETES
-- Billetes electrónicos emitidos
-- ============================================================================
CREATE TABLE IF NOT EXISTS billetes (
    id SERIAL PRIMARY KEY,
    codigo_billete VARCHAR(15) UNIQUE NOT NULL,
    detalle_reserva_id INTEGER NOT NULL,
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metodo_entrega VARCHAR(20) DEFAULT 'EMAIL', -- EMAIL, AEROPUERTO
    estado VARCHAR(20) DEFAULT 'EMITIDO', -- EMITIDO, USADO, CANCELADO, CHECKED_IN
    FOREIGN KEY (detalle_reserva_id) REFERENCES detalles_reserva(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_billetes_codigo ON billetes(codigo_billete);
CREATE INDEX IF NOT EXISTS idx_billetes_detalle ON billetes(detalle_reserva_id);
CREATE INDEX IF NOT EXISTS idx_billetes_estado ON billetes(estado);
CREATE INDEX IF NOT EXISTS idx_billetes_fecha ON billetes(fecha_emision);

COMMENT ON TABLE billetes IS 'Billetes electrónicos emitidos tras el pago';
COMMENT ON COLUMN billetes.codigo_billete IS 'Código único del billete (ej: TKT123456789012)';
COMMENT ON COLUMN billetes.estado IS 'EMITIDO, USADO, CANCELADO, CHECKED_IN';

-- ============================================================================
-- TABLA: PAGOS
-- Registro de transacciones de pago
-- ============================================================================
CREATE TABLE IF NOT EXISTS pagos (
    id SERIAL PRIMARY KEY,
    reserva_id INTEGER NOT NULL,
    tarjeta_id INTEGER NOT NULL,
    monto NUMERIC(10, 2) NOT NULL,
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'APROBADO', -- APROBADO, RECHAZADO, PENDIENTE, REEMBOLSADO
    numero_autorizacion VARCHAR(50),
    metodo_pago VARCHAR(20) DEFAULT 'TARJETA', -- TARJETA, EFECTIVO, TRANSFERENCIA
    FOREIGN KEY (reserva_id) REFERENCES reservas(id),
    FOREIGN KEY (tarjeta_id) REFERENCES tarjetas_credito(id),
    CONSTRAINT chk_monto_positivo CHECK (monto > 0)
);

CREATE INDEX IF NOT EXISTS idx_pagos_reserva ON pagos(reserva_id);
CREATE INDEX IF NOT EXISTS idx_pagos_tarjeta ON pagos(tarjeta_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos(fecha_pago);

COMMENT ON TABLE pagos IS 'Registro de transacciones de pago';
COMMENT ON COLUMN pagos.estado IS 'APROBADO, RECHAZADO, PENDIENTE, REEMBOLSADO';
COMMENT ON COLUMN pagos.metodo_pago IS 'TARJETA, EFECTIVO, TRANSFERENCIA';
COMMENT ON COLUMN pagos.numero_autorizacion IS 'Número de autorización del procesador de pagos';

-- ============================================================================
-- TABLA: CHECK_INS
-- Sistema de check-in online (Migración: add_checkin.sql)
-- ============================================================================
CREATE TABLE IF NOT EXISTS check_ins (
    id SERIAL PRIMARY KEY,
    billete_id INTEGER NOT NULL UNIQUE,
    fecha_check_in TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    asiento_asignado VARCHAR(5),
    puerta_embarque VARCHAR(10),
    FOREIGN KEY (billete_id) REFERENCES billetes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_check_ins_billete ON check_ins(billete_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_fecha ON check_ins(fecha_check_in);

COMMENT ON TABLE check_ins IS 'Tabla para registrar check-ins de billetes, permite check-in online 24h antes del vuelo';
COMMENT ON COLUMN check_ins.asiento_asignado IS 'Asiento confirmado en check-in (puede diferir del reservado)';
COMMENT ON COLUMN check_ins.puerta_embarque IS 'Puerta de embarque asignada (si está disponible)';

-- ============================================================================
-- TABLA: NOTIFICACIONES
-- Sistema de notificaciones (Migración: add_notificaciones.sql)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('CAMBIO_VUELO', 'RECORDATORIO', 'OFERTA', 'CONFIRMACION', 'ALERTA')),
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    leido BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_leido TIMESTAMP,
    metadata JSONB,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT chk_notificaciones_titulo_no_vacio CHECK (TRIM(titulo) != ''),
    CONSTRAINT chk_notificaciones_mensaje_no_vacio CHECK (TRIM(mensaje) != '')
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leido ON notificaciones(leido);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON notificaciones(fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo ON notificaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_no_leido ON notificaciones(usuario_id, leido) WHERE leido = FALSE;

COMMENT ON TABLE notificaciones IS 'Notificaciones del sistema para usuarios';
COMMENT ON COLUMN notificaciones.tipo IS 'Tipo de notificación: CAMBIO_VUELO (cambios en vuelos reservados), RECORDATORIO (recordatorios de check-in/vuelo), OFERTA (promociones), CONFIRMACION (confirmaciones de reserva/pago), ALERTA (alertas importantes)';
COMMENT ON COLUMN notificaciones.metadata IS 'Datos adicionales en formato JSON (ej: {"vuelo_id": 123, "reserva_codigo": "ABC123"})';

-- ============================================================================
-- FUNCIÓN: Generar código de reserva único
-- ============================================================================
CREATE OR REPLACE FUNCTION generar_codigo_reserva()
RETURNS VARCHAR(10) AS $$
DECLARE
    codigo VARCHAR(10);
    existe BOOLEAN;
BEGIN
    LOOP
        -- Generar código alfanumérico de 10 caracteres
        codigo := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 10));
        
        -- Verificar si ya existe
        SELECT EXISTS(SELECT 1 FROM reservas WHERE codigo_reserva = codigo) INTO existe;
        
        EXIT WHEN NOT existe;
    END LOOP;
    
    RETURN codigo;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: Generar código de billete único
-- ============================================================================
CREATE OR REPLACE FUNCTION generar_codigo_billete()
RETURNS VARCHAR(15) AS $$
DECLARE
    codigo VARCHAR(15);
    existe BOOLEAN;
BEGIN
    LOOP
        -- Generar código con prefijo TKT + 12 dígitos
        codigo := 'TKT' || LPAD(FLOOR(RANDOM() * 1000000000000)::TEXT, 12, '0');
        
        -- Verificar si ya existe
        SELECT EXISTS(SELECT 1 FROM billetes WHERE codigo_billete = codigo) INTO existe;
        
        EXIT WHEN NOT existe;
    END LOOP;
    
    RETURN codigo;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN: Actualizar disponibilidad de asientos
-- ============================================================================
CREATE OR REPLACE FUNCTION actualizar_disponibilidad_asientos()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Reducir asientos disponibles al crear reserva
        UPDATE instancias_vuelo
        SET 
            asientos_disponibles_economica = CASE 
                WHEN NEW.clase = 'ECONOMICA' THEN asientos_disponibles_economica - 1 
                ELSE asientos_disponibles_economica 
            END,
            asientos_disponibles_ejecutiva = CASE 
                WHEN NEW.clase = 'EJECUTIVA' THEN asientos_disponibles_ejecutiva - 1 
                ELSE asientos_disponibles_ejecutiva 
            END,
            asientos_disponibles_primera = CASE 
                WHEN NEW.clase = 'PRIMERA_CLASE' THEN asientos_disponibles_primera - 1 
                ELSE asientos_disponibles_primera 
            END
        WHERE id = NEW.instancia_vuelo_id;
        
        -- Marcar asiento como no disponible si fue asignado
        IF NEW.asiento_id IS NOT NULL THEN
            UPDATE asientos SET disponible = FALSE WHERE id = NEW.asiento_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Actualizar disponibilidad al crear detalle de reserva
-- ============================================================================
CREATE TRIGGER trg_actualizar_disponibilidad
    AFTER INSERT ON detalles_reserva
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_disponibilidad_asientos();

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista: Vuelos disponibles con información completa
CREATE OR REPLACE VIEW vista_vuelos_disponibles AS
SELECT 
    v.id AS vuelo_id,
    v.numero_vuelo,
    a.nombre AS aerolinea,
    a.codigo_iata AS aerolinea_codigo,
    co.nombre AS ciudad_origen,
    co.codigo_iata AS origen_codigo,
    cd.nombre AS ciudad_destino,
    cd.codigo_iata AS destino_codigo,
    v.hora_salida,
    v.hora_llegada,
    v.duracion_minutos,
    iv.fecha,
    iv.estado,
    iv.puerta,
    iv.asientos_disponibles_economica,
    iv.asientos_disponibles_ejecutiva,
    iv.asientos_disponibles_primera,
    te.precio AS precio_economica,
    tej.precio AS precio_ejecutiva,
    tp.precio AS precio_primera
FROM vuelos v
JOIN aerolineas a ON v.aerolinea_id = a.id
JOIN ciudades co ON v.ciudad_origen_id = co.id
JOIN ciudades cd ON v.ciudad_destino_id = cd.id
LEFT JOIN instancias_vuelo iv ON v.id = iv.vuelo_id
LEFT JOIN tarifas te ON v.id = te.vuelo_id AND te.clase = 'ECONOMICA'
LEFT JOIN tarifas tej ON v.id = tej.vuelo_id AND tej.clase = 'EJECUTIVA'
LEFT JOIN tarifas tp ON v.id = tp.vuelo_id AND tp.clase = 'PRIMERA_CLASE'
WHERE v.activo = TRUE;

-- Vista: Reservas con detalles completos
CREATE OR REPLACE VIEW vista_reservas_completas AS
SELECT 
    r.id AS reserva_id,
    r.codigo_reserva,
    u.email AS usuario_email,
    u.nombre || ' ' || u.apellido AS usuario_nombre,
    r.fecha_reserva,
    r.estado AS estado_reserva,
    r.total,
    dr.id AS detalle_id,
    v.numero_vuelo,
    a.nombre AS aerolinea,
    co.nombre AS ciudad_origen,
    cd.nombre AS ciudad_destino,
    iv.fecha AS fecha_vuelo,
    v.hora_salida,
    dr.pasajero_nombre || ' ' || dr.pasajero_apellido AS nombre_pasajero,
    dr.clase,
    dr.precio,
    COALESCE(ast.numero_asiento, 'Sin asignar') AS asiento
FROM reservas r
JOIN usuarios u ON r.usuario_id = u.id
JOIN detalles_reserva dr ON r.id = dr.reserva_id
JOIN instancias_vuelo iv ON dr.instancia_vuelo_id = iv.id
JOIN vuelos v ON iv.vuelo_id = v.id
JOIN aerolineas a ON v.aerolinea_id = a.id
JOIN ciudades co ON v.ciudad_origen_id = co.id
JOIN ciudades cd ON v.ciudad_destino_id = cd.id
LEFT JOIN asientos ast ON dr.asiento_id = ast.id;

-- ============================================================================
-- RESUMEN DEL SCHEMA
-- ============================================================================
-- TABLAS PRINCIPALES:
-- 1. usuarios - Cuentas de usuario
-- 2. tarjetas_credito - Métodos de pago
-- 3. ciudades - Catálogo de aeropuertos
-- 4. aerolineas - Catálogo de aerolíneas
-- 5. vuelos - Plantillas de rutas
-- 6. tarifas - Precios por clase
-- 7. instancias_vuelo - Vuelos específicos por fecha
-- 8. asientos - Configuración de asientos
-- 9. reservas - Reservas de usuarios
-- 10. detalles_reserva - Itinerarios de reservas
-- 11. billetes - Billetes emitidos
-- 12. pagos - Transacciones de pago
-- 13. check_ins - Check-ins realizados (24-3h antes)
-- 14. notificaciones - Sistema de notificaciones
--
-- FUNCIONES:
-- - generar_codigo_reserva() - Genera códigos únicos de reserva
-- - generar_codigo_billete() - Genera códigos únicos de billete
-- - actualizar_disponibilidad_asientos() - Gestiona disponibilidad automática
--
-- TRIGGERS:
-- - trg_actualizar_disponibilidad - Actualiza asientos al reservar
--
-- VISTAS:
-- - vista_vuelos_disponibles - Vuelos con información completa
-- - vista_reservas_completas - Reservas con todos los detalles
-- ============================================================================

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Schema completo creado exitosamente';
    RAISE NOTICE '📊 14 tablas principales';
    RAISE NOTICE '🔧 3 funciones auxiliares';
    RAISE NOTICE '⚡ 1 trigger automático';
    RAISE NOTICE '👁️  2 vistas de consulta';
    RAISE NOTICE '';
    RAISE NOTICE '▶️  Siguiente paso: Cargar datos de prueba con seed_data.sql';
END $$;
