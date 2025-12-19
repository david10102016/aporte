-- ========================================
-- ESQUEMA DE BASE DE DATOS
-- Sistema de Pagos Escolares - Supabase
-- ========================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- TABLA: apoderados
-- ========================================
CREATE TABLE apoderados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_completo TEXT NOT NULL,
    telefono VARCHAR(8) UNIQUE NOT NULL,
    email TEXT,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'activo', 'inactivo')),
    total_mensual DECIMAL(10,2) DEFAULT 0,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para apoderados
CREATE INDEX idx_apoderados_telefono ON apoderados(telefono);
CREATE INDEX idx_apoderados_auth_id ON apoderados(auth_id);
CREATE INDEX idx_apoderados_estado ON apoderados(estado);

-- ========================================
-- TABLA: estudiantes
-- ========================================
CREATE TABLE estudiantes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(4) UNIQUE NOT NULL,
    nombre_completo TEXT NOT NULL,
    nivel VARCHAR(20) NOT NULL CHECK (nivel IN ('Primaria', 'Secundaria')),
    grado TEXT NOT NULL,
    estado VARCHAR(20) DEFAULT 'disponible' CHECK (estado IN ('disponible', 'asignado')),
    apoderado_id UUID REFERENCES apoderados(id) ON DELETE SET NULL,
    apoderado_nombre TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para estudiantes
CREATE INDEX idx_estudiantes_codigo ON estudiantes(codigo);
CREATE INDEX idx_estudiantes_apoderado_id ON estudiantes(apoderado_id);
CREATE INDEX idx_estudiantes_estado ON estudiantes(estado);
CREATE INDEX idx_estudiantes_nivel ON estudiantes(nivel);

-- ========================================
-- TABLA: solicitudes
-- ========================================
CREATE TABLE solicitudes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    apoderado_id UUID REFERENCES apoderados(id) ON DELETE CASCADE,
    nombre_completo TEXT NOT NULL,
    telefono VARCHAR(8) NOT NULL,
    codigos_hijos TEXT[] NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_aprobacion TIMESTAMP WITH TIME ZONE,
    fecha_rechazo TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para solicitudes
CREATE INDEX idx_solicitudes_apoderado_id ON solicitudes(apoderado_id);
CREATE INDEX idx_solicitudes_estado ON solicitudes(estado);
CREATE INDEX idx_solicitudes_fecha ON solicitudes(fecha_registro DESC);

-- ========================================
-- TABLA: pagos
-- ========================================
CREATE TABLE pagos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    apoderado_id UUID REFERENCES apoderados(id) ON DELETE CASCADE NOT NULL,
    mes VARCHAR(7) NOT NULL, -- Formato: YYYY-MM
    monto DECIMAL(10,2) NOT NULL,
    comprobante_url TEXT NOT NULL,
    comprobante_public_id TEXT,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    fecha_subida TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_aprobacion TIMESTAMP WITH TIME ZONE,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para pagos
CREATE INDEX idx_pagos_apoderado_id ON pagos(apoderado_id);
CREATE INDEX idx_pagos_mes ON pagos(mes);
CREATE INDEX idx_pagos_estado ON pagos(estado);
CREATE INDEX idx_pagos_fecha_subida ON pagos(fecha_subida DESC);

-- Constraint único: un apoderado solo puede subir un pago por mes
CREATE UNIQUE INDEX idx_pagos_unico_apoderado_mes ON pagos(apoderado_id, mes);

-- ========================================
-- TABLA: tarifas
-- ========================================
CREATE TABLE tarifas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anio INTEGER UNIQUE NOT NULL,
    primaria DECIMAL(10,2) NOT NULL DEFAULT 100,
    secundaria DECIMAL(10,2) NOT NULL DEFAULT 120,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar tarifas iniciales para 2025
INSERT INTO tarifas (anio, primaria, secundaria) 
VALUES (2025, 100, 120);

-- ========================================
-- VISTAS ÚTILES
-- ========================================

-- Vista: Resumen de estudiantes por apoderado
CREATE VIEW vista_estudiantes_apoderado AS
SELECT 
    a.id as apoderado_id,
    a.nombre_completo as apoderado,
    e.id as estudiante_id,
    e.codigo,
    e.nombre_completo as estudiante,
    e.nivel,
    e.grado
FROM apoderados a
INNER JOIN estudiantes e ON e.apoderado_id = a.id
WHERE a.estado = 'activo' AND e.estado = 'asignado';

-- Vista: Resumen de pagos pendientes
CREATE VIEW vista_pagos_pendientes AS
SELECT 
    p.id,
    a.nombre_completo as apoderado,
    a.telefono,
    p.mes,
    p.monto,
    p.fecha_subida,
    p.comprobante_url
FROM pagos p
INNER JOIN apoderados a ON p.apoderado_id = a.id
WHERE p.estado = 'pendiente'
ORDER BY p.fecha_subida DESC;

-- ========================================
-- FUNCIONES Y TRIGGERS
-- ========================================

-- Función: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_apoderados_updated_at 
    BEFORE UPDATE ON apoderados 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estudiantes_updated_at 
    BEFORE UPDATE ON estudiantes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pagos_updated_at 
    BEFORE UPDATE ON pagos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tarifas_updated_at 
    BEFORE UPDATE ON tarifas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función: Calcular total mensual del apoderado
CREATE OR REPLACE FUNCTION calcular_total_mensual(apoderado_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    total DECIMAL := 0;
    primaria_count INTEGER;
    secundaria_count INTEGER;
    tarifa_primaria DECIMAL;
    tarifa_secundaria DECIMAL;
BEGIN
    -- Obtener tarifas del año actual
    SELECT primaria, secundaria INTO tarifa_primaria, tarifa_secundaria
    FROM tarifas
    WHERE anio = EXTRACT(YEAR FROM CURRENT_DATE)
    LIMIT 1;
    
    -- Contar estudiantes por nivel
    SELECT 
        COUNT(*) FILTER (WHERE nivel = 'Primaria'),
        COUNT(*) FILTER (WHERE nivel = 'Secundaria')
    INTO primaria_count, secundaria_count
    FROM estudiantes
    WHERE apoderado_id = apoderado_uuid AND estado = 'asignado';
    
    -- Calcular total
    total := (primaria_count * tarifa_primaria) + (secundaria_count * tarifa_secundaria);
    
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- DATOS DE EJEMPLO (OPCIONAL - PARA TESTING)
-- ========================================

-- Estudiantes de ejemplo
INSERT INTO estudiantes (codigo, nombre_completo, nivel, grado, estado) VALUES
('A3B7', 'Juan Pérez García', 'Primaria', '5to Grado', 'disponible'),
('C4D8', 'María López Ruiz', 'Secundaria', '3ro Secundaria', 'disponible'),
('E5F9', 'Carlos Mamani Quispe', 'Primaria', '3ro Grado', 'disponible'),
('G6H1', 'Ana Flores Vargas', 'Secundaria', '1ro Secundaria', 'disponible'),
('I7J2', 'Pedro Condori Silva', 'Primaria', '6to Grado', 'disponible');

-- ========================================
-- COMENTARIOS EN TABLAS
-- ========================================

COMMENT ON TABLE apoderados IS 'Padres de familia o tutores de los estudiantes';
COMMENT ON TABLE estudiantes IS 'Estudiantes del colegio con códigos únicos';
COMMENT ON TABLE solicitudes IS 'Solicitudes de registro de nuevos apoderados';
COMMENT ON TABLE pagos IS 'Registro de pagos mensuales con comprobantes';
COMMENT ON TABLE tarifas IS 'Tarifas mensuales por nivel educativo y año';

COMMENT ON COLUMN apoderados.auth_id IS 'Referencia al usuario en auth.users de Supabase';
COMMENT ON COLUMN estudiantes.codigo IS 'Código único de 4 caracteres asignado por el colegio';
COMMENT ON COLUMN pagos.mes IS 'Mes del pago en formato YYYY-MM';
COMMENT ON COLUMN pagos.comprobante_url IS 'URL pública del comprobante subido a Supabase Storage';
