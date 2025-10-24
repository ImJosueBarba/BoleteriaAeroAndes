-- ============================================
-- DATOS DE PRUEBA PARA ECUADOR
-- Sistema de Reserva de Vuelos - Boletería JB
-- Adaptado para aeropuertos y rutas ecuatorianas
-- ============================================

-- ============================================
-- 1. CIUDADES (Principales aeropuertos de Ecuador + destinos internacionales)
-- ============================================

INSERT INTO ciudades (nombre, codigo_iata, pais, zona_horaria) VALUES
-- ECUADOR (Principales aeropuertos)
('Quito', 'UIO', 'Ecuador', 'America/Guayaquil'),
('Guayaquil', 'GYE', 'Ecuador', 'America/Guayaquil'),
('Cuenca', 'CUE', 'Ecuador', 'America/Guayaquil'),
('Manta', 'MEC', 'Ecuador', 'America/Guayaquil'),
('Loja', 'LOH', 'Ecuador', 'America/Guayaquil'),
('Esmeraldas', 'ESM', 'Ecuador', 'America/Guayaquil'),
('Galápagos (Baltra)', 'GPS', 'Ecuador', 'Pacific/Galapagos'),
('San Cristóbal', 'SCY', 'Ecuador', 'Pacific/Galapagos'),
('Coca (Francisco de Orellana)', 'OCC', 'Ecuador', 'America/Guayaquil'),
('Lago Agrio', 'LGQ', 'Ecuador', 'America/Guayaquil'),
('Machala', 'MCH', 'Ecuador', 'America/Guayaquil'),
('Tulcán', 'TUA', 'Ecuador', 'America/Guayaquil'),

-- SUDAMÉRICA (Destinos principales)
('Bogotá', 'BOG', 'Colombia', 'America/Bogota'),
('Cali', 'CLO', 'Colombia', 'America/Bogota'),
('Cartagena', 'CTG', 'Colombia', 'America/Bogota'),
('Lima', 'LIM', 'Perú', 'America/Lima'),
('Cusco', 'CUZ', 'Perú', 'America/Lima'),
('Buenos Aires', 'EZE', 'Argentina', 'America/Argentina/Buenos_Aires'),
('São Paulo', 'GRU', 'Brasil', 'America/Sao_Paulo'),
('Río de Janeiro', 'GIG', 'Brasil', 'America/Sao_Paulo'),
('Santiago', 'SCL', 'Chile', 'America/Santiago'),
('Panamá', 'PTY', 'Panamá', 'America/Panama'),

-- NORTEAMÉRICA
('Ciudad de México', 'MEX', 'México', 'America/Mexico_City'),
('Cancún', 'CUN', 'México', 'America/Cancun'),
('Nueva York', 'JFK', 'Estados Unidos', 'America/New_York'),
('Miami', 'MIA', 'Estados Unidos', 'America/New_York'),
('Houston', 'IAH', 'Estados Unidos', 'America/Chicago'),
('Los Ángeles', 'LAX', 'Estados Unidos', 'America/Los_Angeles'),
('Fort Lauderdale', 'FLL', 'Estados Unidos', 'America/New_York'),

-- EUROPA
('Madrid', 'MAD', 'España', 'Europe/Madrid'),
('Barcelona', 'BCN', 'España', 'Europe/Madrid'),
('Ámsterdam', 'AMS', 'Países Bajos', 'Europe/Amsterdam'),
('París', 'CDG', 'Francia', 'Europe/Paris'),
('Londres', 'LHR', 'Reino Unido', 'Europe/London')
ON CONFLICT (codigo_iata) DO NOTHING;

-- ============================================
-- 2. AEROLÍNEAS (Operan en Ecuador)
-- ============================================

INSERT INTO aerolineas (nombre, codigo_iata, pais, activa) VALUES
-- Ecuatorianas
('TAME EP', 'EQ', 'Ecuador', true),
('Avianca Ecuador', 'AV', 'Ecuador', true),
('LATAM Ecuador', 'XL', 'Ecuador', true),

-- Sudamericanas principales
('Avianca', 'AV', 'Colombia', true),
('LATAM Airlines', 'LA', 'Chile', true),
('Copa Airlines', 'CM', 'Panamá', true),
('Aeroregional', 'R7', 'Colombia', true),
('Peruvian Airlines', 'P9', 'Perú', true),

-- Norteamericanas
('American Airlines', 'AA', 'Estados Unidos', true),
('United Airlines', 'UA', 'Estados Unidos', true),
('Delta Airlines', 'DL', 'Estados Unidos', true),
('JetBlue', 'B6', 'Estados Unidos', true),
('Spirit Airlines', 'NK', 'Estados Unidos', true),

-- Europeas
('Iberia', 'IB', 'España', true),
('KLM', 'KL', 'Países Bajos', true),
('Air France', 'AF', 'Francia', true),
('British Airways', 'BA', 'Reino Unido', true)
ON CONFLICT (codigo_iata) DO NOTHING;

-- ============================================
-- 3. VUELOS ECUATORIANOS
-- ============================================

DO $$
DECLARE
    -- Ciudades Ecuador
    v_uio_id INT; v_gye_id INT; v_cue_id INT; v_mec_id INT; v_loh_id INT;
    v_gps_id INT; v_scy_id INT; v_occ_id INT; v_mch_id INT;
    
    -- Ciudades Sudamérica
    v_bog_id INT; v_clo_id INT; v_ctg_id INT; v_lim_id INT; v_cuz_id INT;
    v_eze_id INT; v_gru_id INT; v_scl_id INT; v_pty_id INT;
    
    -- Ciudades Norteamérica
    v_mex_id INT; v_mia_id INT; v_jfk_id INT; v_iah_id INT; v_fll_id INT;
    
    -- Ciudades Europa
    v_mad_id INT; v_ams_id INT; v_cdg_id INT;
    
    -- Aerolíneas
    v_eq_id INT; v_av_id INT; v_xl_id INT; v_la_id INT; v_cm_id INT;
    v_aa_id INT; v_ua_id INT; v_dl_id INT; v_ib_id INT; v_kl_id INT;
BEGIN
    -- Obtener IDs de ciudades Ecuador
    SELECT id INTO v_uio_id FROM ciudades WHERE codigo_iata = 'UIO';
    SELECT id INTO v_gye_id FROM ciudades WHERE codigo_iata = 'GYE';
    SELECT id INTO v_cue_id FROM ciudades WHERE codigo_iata = 'CUE';
    SELECT id INTO v_mec_id FROM ciudades WHERE codigo_iata = 'MEC';
    SELECT id INTO v_loh_id FROM ciudades WHERE codigo_iata = 'LOH';
    SELECT id INTO v_gps_id FROM ciudades WHERE codigo_iata = 'GPS';
    SELECT id INTO v_scy_id FROM ciudades WHERE codigo_iata = 'SCY';
    SELECT id INTO v_occ_id FROM ciudades WHERE codigo_iata = 'OCC';
    SELECT id INTO v_mch_id FROM ciudades WHERE codigo_iata = 'MCH';
    
    -- Obtener IDs ciudades Sudamérica
    SELECT id INTO v_bog_id FROM ciudades WHERE codigo_iata = 'BOG';
    SELECT id INTO v_clo_id FROM ciudades WHERE codigo_iata = 'CLO';
    SELECT id INTO v_ctg_id FROM ciudades WHERE codigo_iata = 'CTG';
    SELECT id INTO v_lim_id FROM ciudades WHERE codigo_iata = 'LIM';
    SELECT id INTO v_cuz_id FROM ciudades WHERE codigo_iata = 'CUZ';
    SELECT id INTO v_eze_id FROM ciudades WHERE codigo_iata = 'EZE';
    SELECT id INTO v_gru_id FROM ciudades WHERE codigo_iata = 'GRU';
    SELECT id INTO v_scl_id FROM ciudades WHERE codigo_iata = 'SCL';
    SELECT id INTO v_pty_id FROM ciudades WHERE codigo_iata = 'PTY';
    
    -- Obtener IDs ciudades Norteamérica
    SELECT id INTO v_mex_id FROM ciudades WHERE codigo_iata = 'MEX';
    SELECT id INTO v_mia_id FROM ciudades WHERE codigo_iata = 'MIA';
    SELECT id INTO v_jfk_id FROM ciudades WHERE codigo_iata = 'JFK';
    SELECT id INTO v_iah_id FROM ciudades WHERE codigo_iata = 'IAH';
    SELECT id INTO v_fll_id FROM ciudades WHERE codigo_iata = 'FLL';
    
    -- Obtener IDs ciudades Europa
    SELECT id INTO v_mad_id FROM ciudades WHERE codigo_iata = 'MAD';
    SELECT id INTO v_ams_id FROM ciudades WHERE codigo_iata = 'AMS';
    SELECT id INTO v_cdg_id FROM ciudades WHERE codigo_iata = 'CDG';
    
    -- Obtener IDs aerolíneas
    SELECT id INTO v_eq_id FROM aerolineas WHERE codigo_iata = 'EQ';
    SELECT id INTO v_av_id FROM aerolineas WHERE codigo_iata = 'AV';
    SELECT id INTO v_xl_id FROM aerolineas WHERE codigo_iata = 'XL';
    SELECT id INTO v_la_id FROM aerolineas WHERE codigo_iata = 'LA';
    SELECT id INTO v_cm_id FROM aerolineas WHERE codigo_iata = 'CM';
    SELECT id INTO v_aa_id FROM aerolineas WHERE codigo_iata = 'AA';
    SELECT id INTO v_ua_id FROM aerolineas WHERE codigo_iata = 'UA';
    SELECT id INTO v_dl_id FROM aerolineas WHERE codigo_iata = 'DL';
    SELECT id INTO v_ib_id FROM aerolineas WHERE codigo_iata = 'IB';
    SELECT id INTO v_kl_id FROM aerolineas WHERE codigo_iata = 'KL';

    -- ========== VUELOS DOMÉSTICOS ECUADOR (Frecuentes) ==========
    
    -- QUITO (UIO) ↔ GUAYAQUIL (GYE) - Ruta más transitada de Ecuador
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('EQ101', v_eq_id, v_uio_id, v_gye_id, '06:00', '06:45', 45, '1111111', true),
    ('AV201', v_av_id, v_uio_id, v_gye_id, '08:00', '08:45', 45, '1111111', true),
    ('XL301', v_xl_id, v_uio_id, v_gye_id, '10:00', '10:45', 45, '1111111', true),
    ('EQ103', v_eq_id, v_uio_id, v_gye_id, '12:00', '12:45', 45, '1111111', true),
    ('AV203', v_av_id, v_uio_id, v_gye_id, '14:00', '14:45', 45, '1111111', true),
    ('XL303', v_xl_id, v_uio_id, v_gye_id, '16:00', '16:45', 45, '1111111', true),
    ('EQ105', v_eq_id, v_uio_id, v_gye_id, '18:00', '18:45', 45, '1111111', true),
    ('AV205', v_av_id, v_uio_id, v_gye_id, '20:00', '20:45', 45, '1111111', true),
    ('XL305', v_xl_id, v_uio_id, v_gye_id, '21:30', '22:15', 45, '1111111', true),
    ('EQ107', v_eq_id, v_uio_id, v_gye_id, '23:00', '23:45', 45, '1111111', true);
    
    -- GUAYAQUIL (GYE) → QUITO (UIO) - Retornos
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('EQ102', v_eq_id, v_gye_id, v_uio_id, '07:30', '08:15', 45, '1111111', true),
    ('AV202', v_av_id, v_gye_id, v_uio_id, '09:30', '10:15', 45, '1111111', true),
    ('XL302', v_xl_id, v_gye_id, v_uio_id, '11:30', '12:15', 45, '1111111', true),
    ('EQ104', v_eq_id, v_gye_id, v_uio_id, '13:30', '14:15', 45, '1111111', true),
    ('AV204', v_av_id, v_gye_id, v_uio_id, '15:30', '16:15', 45, '1111111', true),
    ('XL304', v_xl_id, v_gye_id, v_uio_id, '17:30', '18:15', 45, '1111111', true),
    ('EQ106', v_eq_id, v_gye_id, v_uio_id, '19:30', '20:15', 45, '1111111', true),
    ('AV206', v_av_id, v_gye_id, v_uio_id, '21:30', '22:15', 45, '1111111', true),
    ('XL306', v_xl_id, v_gye_id, v_uio_id, '23:15', '00:00', 45, '1111111', true);
    
    -- QUITO (UIO) ↔ CUENCA (CUE)
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('EQ401', v_eq_id, v_uio_id, v_cue_id, '07:00', '07:50', 50, '1111111', true),
    ('LA401', v_la_id, v_uio_id, v_cue_id, '12:00', '12:50', 50, '1111111', true),
    ('EQ403', v_eq_id, v_uio_id, v_cue_id, '17:00', '17:50', 50, '1111111', true);
    
    -- GUAYAQUIL (GYE) ↔ CUENCA (CUE)
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('EQ501', v_eq_id, v_gye_id, v_cue_id, '08:00', '08:40', 40, '1111111', true),
    ('LA501', v_la_id, v_gye_id, v_cue_id, '14:00', '14:40', 40, '1111111', true),
    ('EQ503', v_eq_id, v_gye_id, v_cue_id, '19:00', '19:40', 40, '1111111', true);
    
    -- GUAYAQUIL (GYE) ↔ GALÁPAGOS (GPS) - Ruta turística importante
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('EQ601', v_eq_id, v_gye_id, v_gps_id, '06:30', '08:30', 120, '1111111', true),
    ('LA601', v_la_id, v_gye_id, v_gps_id, '10:00', '12:00', 120, '1111111', true),
    ('AV601', v_av_id, v_gye_id, v_gps_id, '15:00', '17:00', 120, '1111111', true);
    
    -- GALÁPAGOS (GPS) → GUAYAQUIL (GYE) - Retornos
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('EQ602', v_eq_id, v_gps_id, v_gye_id, '09:00', '11:00', 120, '1111111', true),
    ('LA602', v_la_id, v_gps_id, v_gye_id, '13:00', '15:00', 120, '1111111', true),
    ('AV602', v_av_id, v_gps_id, v_gye_id, '18:00', '20:00', 120, '1111111', true);
    
    -- QUITO (UIO) ↔ GALÁPAGOS (GPS)
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('LA701', v_la_id, v_uio_id, v_gps_id, '08:00', '10:30', 150, '1111100', true),
    ('LA702', v_la_id, v_gps_id, v_uio_id, '11:00', '13:30', 150, '1111100', true);
    
    -- GUAYAQUIL (GYE) ↔ MANTA (MEC)
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('EQ801', v_eq_id, v_gye_id, v_mec_id, '09:00', '09:35', 35, '1111100', true),
    ('EQ802', v_eq_id, v_mec_id, v_gye_id, '16:00', '16:35', 35, '1111100', true);
    
    -- QUITO (UIO) ↔ COCA (OCC) - Ruta petrolera/turística Amazonía
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('EQ901', v_eq_id, v_uio_id, v_occ_id, '07:00', '07:40', 40, '1111111', true),
    ('EQ903', v_eq_id, v_uio_id, v_occ_id, '15:00', '15:40', 40, '1111111', true),
    ('EQ902', v_eq_id, v_occ_id, v_uio_id, '08:15', '08:55', 40, '1111111', true),
    ('EQ904', v_eq_id, v_occ_id, v_uio_id, '16:15', '16:55', 40, '1111111', true);

    -- ========== VUELOS INTERNACIONALES REGIONALES (SUDAMÉRICA) ==========
    
    -- QUITO (UIO) ↔ BOGOTÁ (BOG) - Ruta muy frecuente
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('AV2001', v_av_id, v_uio_id, v_bog_id, '06:00', '08:00', 120, '1111111', true),
    ('LA2001', v_la_id, v_uio_id, v_bog_id, '10:00', '12:00', 120, '1111111', true),
    ('AV2003', v_av_id, v_uio_id, v_bog_id, '14:00', '16:00', 120, '1111111', true),
    ('LA2003', v_la_id, v_uio_id, v_bog_id, '18:00', '20:00', 120, '1111111', true),
    ('AV2005', v_av_id, v_uio_id, v_bog_id, '22:00', '00:00', 120, '1111111', true);
    
    -- BOGOTÁ (BOG) → QUITO (UIO) - Retornos
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('AV2002', v_av_id, v_bog_id, v_uio_id, '09:00', '09:00', 120, '1111111', true),
    ('LA2002', v_la_id, v_bog_id, v_uio_id, '13:00', '13:00', 120, '1111111', true),
    ('AV2004', v_av_id, v_bog_id, v_uio_id, '17:00', '17:00', 120, '1111111', true);
    
    -- GUAYAQUIL (GYE) ↔ LIMA (LIM)
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('LA2101', v_la_id, v_gye_id, v_lim_id, '08:00', '10:00', 120, '1111111', true),
    ('AV2101', v_av_id, v_gye_id, v_lim_id, '15:00', '17:00', 120, '1111111', true),
    ('LA2102', v_la_id, v_lim_id, v_gye_id, '11:00', '11:00', 120, '1111111', true),
    ('AV2103', v_av_id, v_gye_id, v_lim_id, '22:30', '00:30', 120, '1111111', true);
    
    -- QUITO (UIO) ↔ LIMA (LIM)
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('LA2201', v_la_id, v_uio_id, v_lim_id, '09:00', '11:30', 150, '1111111', true),
    ('LA2202', v_la_id, v_lim_id, v_uio_id, '12:30', '13:00', 150, '1111111', true);
    
    -- QUITO/GUAYAQUIL ↔ PANAMÁ (PTY) - Hub importante
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('CM2301', v_cm_id, v_uio_id, v_pty_id, '11:00', '14:00', 180, '1111111', true),
    ('CM2302', v_cm_id, v_pty_id, v_uio_id, '15:00', '16:00', 180, '1111111', true),
    ('CM2401', v_cm_id, v_gye_id, v_pty_id, '10:00', '13:00', 180, '1111111', true),
    ('CM2402', v_cm_id, v_pty_id, v_gye_id, '14:00', '15:00', 180, '1111111', true);
    
    -- QUITO (UIO) ↔ SANTIAGO (SCL)
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('LA2501', v_la_id, v_uio_id, v_scl_id, '22:00', '06:00', 360, '0101010', true),
    ('LA2502', v_la_id, v_scl_id, v_uio_id, '23:00', '03:00', 300, '1010101', true);

    -- ========== VUELOS INTERNACIONALES - NORTEAMÉRICA ==========
    
    -- QUITO (UIO) ↔ MIAMI (MIA)
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('AA3001', v_aa_id, v_uio_id, v_mia_id, '09:00', '14:30', 270, '1111111', true),
    ('LA3001', v_la_id, v_uio_id, v_mia_id, '14:00', '19:30', 270, '1111111', true),
    ('AA3002', v_aa_id, v_mia_id, v_uio_id, '23:00', '04:00', 270, '1111111', true);
    
    -- GUAYAQUIL (GYE) ↔ MIAMI (MIA)
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('AA3101', v_aa_id, v_gye_id, v_mia_id, '10:00', '15:30', 270, '1111111', true),
    ('DL3101', v_dl_id, v_gye_id, v_mia_id, '16:00', '21:30', 270, '1111111', true),
    ('AA3102', v_aa_id, v_mia_id, v_gye_id, '22:00', '03:00', 270, '1111111', true);
    
    -- QUITO (UIO) ↔ NUEVA YORK (JFK)
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('UA3201', v_ua_id, v_uio_id, v_jfk_id, '18:00', '01:30', 390, '1111100', true),
    ('UA3202', v_ua_id, v_jfk_id, v_uio_id, '20:00', '03:00', 390, '0000011', true);
    
    -- QUITO (UIO) ↔ HOUSTON (IAH)
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('UA3301', v_ua_id, v_uio_id, v_iah_id, '12:00', '17:00', 300, '1111111', true),
    ('UA3302', v_ua_id, v_iah_id, v_uio_id, '19:00', '00:00', 300, '1111111', true);

    -- ========== VUELOS INTERNACIONALES - EUROPA ==========
    
    -- QUITO (UIO) ↔ MADRID (MAD)
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('IB4001', v_ib_id, v_uio_id, v_mad_id, '17:00', '10:00', 660, '1111100', true),
    ('IB4002', v_ib_id, v_mad_id, v_uio_id, '12:00', '17:00', 660, '0000011', true);
    
    -- GUAYAQUIL (GYE) ↔ ÁMSTERDAM (AMS)
    INSERT INTO vuelos (numero_vuelo, aerolinea_id, ciudad_origen_id, ciudad_destino_id, hora_salida, hora_llegada, duracion_minutos, dias_operacion, activo) VALUES
    ('KL4101', v_kl_id, v_gye_id, v_ams_id, '16:00', '11:00', 720, '0100100', true),
    ('KL4102', v_kl_id, v_ams_id, v_gye_id, '13:00', '19:00', 720, '1001000', true);

END $$;

-- ============================================
-- 4. TARIFAS (Precios adaptados a rutas ecuatorianas)
-- ============================================

-- Tarifas DOMÉSTICAS Ecuador (rutas cortas)
INSERT INTO tarifas (vuelo_id, clase, precio, moneda, fecha_inicio, fecha_fin)
SELECT 
    v.id,
    clase,
    CASE 
        WHEN clase = 'ECONOMICA' THEN ROUND((RANDOM() * 50 + 50)::numeric, 2)
        WHEN clase = 'EJECUTIVA' THEN ROUND((RANDOM() * 80 + 120)::numeric, 2)
        WHEN clase = 'PRIMERA_CLASE' THEN ROUND((RANDOM() * 150 + 200)::numeric, 2)
    END as precio,
    'USD',
    '2025-01-01',
    '2025-12-31'
FROM vuelos v
CROSS JOIN (VALUES ('ECONOMICA'), ('EJECUTIVA'), ('PRIMERA_CLASE')) AS clases(clase)
WHERE v.numero_vuelo LIKE 'EQ%' 
   OR v.numero_vuelo LIKE 'AV2%'
   OR v.numero_vuelo LIKE 'XL%'
   OR v.numero_vuelo LIKE 'LA4%'
   OR v.numero_vuelo LIKE 'LA5%'
   OR v.numero_vuelo LIKE 'LA6%'
   OR v.numero_vuelo LIKE 'LA7%'
   OR v.numero_vuelo LIKE 'EQ8%'
   OR v.numero_vuelo LIKE 'EQ9%';

-- Tarifas REGIONALES Sudamérica
INSERT INTO tarifas (vuelo_id, clase, precio, moneda, fecha_inicio, fecha_fin)
SELECT 
    v.id,
    clase,
    CASE 
        WHEN clase = 'ECONOMICA' THEN ROUND((RANDOM() * 150 + 200)::numeric, 2)
        WHEN clase = 'EJECUTIVA' THEN ROUND((RANDOM() * 300 + 500)::numeric, 2)
        WHEN clase = 'PRIMERA_CLASE' THEN ROUND((RANDOM() * 600 + 900)::numeric, 2)
    END as precio,
    'USD',
    '2025-01-01',
    '2025-12-31'
FROM vuelos v
CROSS JOIN (VALUES ('ECONOMICA'), ('EJECUTIVA'), ('PRIMERA_CLASE')) AS clases(clase)
WHERE v.numero_vuelo LIKE 'AV20%'
   OR v.numero_vuelo LIKE 'LA20%'
   OR v.numero_vuelo LIKE 'LA21%'
   OR v.numero_vuelo LIKE 'LA22%'
   OR v.numero_vuelo LIKE 'CM2%'
   OR v.numero_vuelo LIKE 'LA25%';

-- Tarifas INTERNACIONALES Norteamérica
INSERT INTO tarifas (vuelo_id, clase, precio, moneda, fecha_inicio, fecha_fin)
SELECT 
    v.id,
    clase,
    CASE 
        WHEN clase = 'ECONOMICA' THEN ROUND((RANDOM() * 250 + 400)::numeric, 2)
        WHEN clase = 'EJECUTIVA' THEN ROUND((RANDOM() * 600 + 1200)::numeric, 2)
        WHEN clase = 'PRIMERA_CLASE' THEN ROUND((RANDOM() * 1200 + 2000)::numeric, 2)
    END as precio,
    'USD',
    '2025-01-01',
    '2025-12-31'
FROM vuelos v
CROSS JOIN (VALUES ('ECONOMICA'), ('EJECUTIVA'), ('PRIMERA_CLASE')) AS clases(clase)
WHERE v.numero_vuelo LIKE 'AA3%'
   OR v.numero_vuelo LIKE 'DL3%'
   OR v.numero_vuelo LIKE 'UA3%'
   OR v.numero_vuelo LIKE 'LA30%';

-- Tarifas INTERNACIONALES Europa
INSERT INTO tarifas (vuelo_id, clase, precio, moneda, fecha_inicio, fecha_fin)
SELECT 
    v.id,
    clase,
    CASE 
        WHEN clase = 'ECONOMICA' THEN ROUND((RANDOM() * 400 + 700)::numeric, 2)
        WHEN clase = 'EJECUTIVA' THEN ROUND((RANDOM() * 1000 + 2000)::numeric, 2)
        WHEN clase = 'PRIMERA_CLASE' THEN ROUND((RANDOM() * 2000 + 4000)::numeric, 2)
    END as precio,
    'USD',
    '2025-01-01',
    '2025-12-31'
FROM vuelos v
CROSS JOIN (VALUES ('ECONOMICA'), ('EJECUTIVA'), ('PRIMERA_CLASE')) AS clases(clase)
WHERE v.numero_vuelo LIKE 'IB4%'
   OR v.numero_vuelo LIKE 'KL4%'
   OR v.numero_vuelo LIKE 'AF4%';

-- ============================================
-- 5. INSTANCIAS DE VUELO (Próximos 30 días)
-- ============================================

INSERT INTO instancias_vuelo (vuelo_id, fecha, estado, asientos_disponibles_economica, asientos_disponibles_ejecutiva, asientos_disponibles_primera)
SELECT 
    v.id,
    d.fecha,
    'PROGRAMADO',
    CASE 
        -- Vuelos regionales pequeños (TAME, LATAM Ecuador rutas cortas)
        WHEN v.numero_vuelo LIKE 'EQ%' OR v.numero_vuelo LIKE 'XL%' 
        THEN 90 + (v.id % 3) * 15  -- Varía entre 90, 105, 120
        -- Avianca rutas nacionales
        WHEN v.numero_vuelo LIKE 'AV%' AND LENGTH(v.numero_vuelo) = 5
        THEN 100 + (v.id % 4) * 20  -- Varía entre 100, 120, 140, 160
        -- Vuelos internacionales grandes
        ELSE 150 + (v.id % 5) * 30  -- Varía entre 150, 180, 210, 240, 270
    END,
    CASE 
        -- Vuelos domésticos pequeños
        WHEN v.numero_vuelo LIKE 'EQ%' OR v.numero_vuelo LIKE 'XL%' 
        THEN 12 + (v.id % 3) * 6   -- Varía entre 12, 18, 24
        -- Vuelos nacionales medianos
        WHEN v.numero_vuelo LIKE 'AV%' AND LENGTH(v.numero_vuelo) = 5
        THEN 20 + (v.id % 3) * 10  -- Varía entre 20, 30, 40
        -- Vuelos internacionales
        ELSE 30 + (v.id % 4) * 10  -- Varía entre 30, 40, 50, 60
    END,
    CASE
        -- Algunos vuelos sin primera clase
        WHEN v.numero_vuelo LIKE 'EQ%' OR (v.id % 3 = 0)
        THEN 0
        -- Vuelos con primera clase limitada
        WHEN v.numero_vuelo LIKE 'XL%' OR v.numero_vuelo LIKE 'AV%'
        THEN 8 + (v.id % 2) * 4  -- Varía entre 8, 12
        -- Vuelos internacionales con más primera
        ELSE 12 + (v.id % 3) * 4  -- Varía entre 12, 16, 20
    END
FROM vuelos v
CROSS JOIN (
    SELECT generate_series(
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days',
        INTERVAL '1 day'
    )::date AS fecha
) d
WHERE v.activo = true
ON CONFLICT (vuelo_id, fecha) DO NOTHING;

-- ============================================
-- RESUMEN DE DATOS INSERTADOS
-- ============================================

SELECT 
    'Ciudades' as tabla,
    COUNT(*) as cantidad
FROM ciudades
UNION ALL
SELECT 'Aerolíneas', COUNT(*) FROM aerolineas
UNION ALL
SELECT 'Vuelos', COUNT(*) FROM vuelos
UNION ALL
SELECT 'Tarifas', COUNT(*) FROM tarifas
UNION ALL
SELECT 'Instancias', COUNT(*) FROM instancias_vuelo
ORDER BY tabla;

-- ============================================
-- INFORMACIÓN ADICIONAL
-- ============================================
-- 🇪🇨 RUTAS MÁS IMPORTANTES DE ECUADOR:
-- 1. Quito ↔ Guayaquil (8 vuelos diarios c/u)
-- 2. Guayaquil ↔ Galápagos (3 vuelos diarios)
-- 3. Quito ↔ Bogotá (4 vuelos diarios)
-- 4. Quito/Guayaquil ↔ Miami (3-4 vuelos)
-- 5. Quito ↔ Coca (2 vuelos diarios - Amazonía)
-- 
-- 💰 PRECIOS APROXIMADOS (USD):
-- - Doméstico: $50-150
-- - Regional (Sudamérica): $200-500
-- - Norteamérica: $400-1200
-- - Europa: $700-2000
-- ============================================
