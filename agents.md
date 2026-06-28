# Especificación de Desarrollo: App de Registro Horario Inalterable (PIN + Foto)

Este documento contiene las instrucciones, el stack tecnológico, la arquitectura de base de datos y las directrices de interfaz de usuario para construir una aplicación de control de asistencia laboral adaptada a la legislación española (Real Decreto-ley 8/2019).

El sistema se basará en un enfoque de **PIN Personal + Foto de Verificación (Selfie)** a través de una tablet fija en el local para evitar el "fichaje por delegación" (*buddy punching*), desarrollado como una única aplicación web modular (PWA).

---

## 1. Arquitectura del Sistema: Enfoque de Dispositivo Fijo

Para optimizar el desarrollo, se construirá una única **PWA (Progressive Web App)** con dos entornos principales basados en el rol y la ruta de acceso:

1. **Modo Terminal / Quiosco (Tablet del Local):** Pantalla fija en el establecimiento. El empleado introduce su PIN de 4 dígitos, el sistema activa la cámara frontal, toma una captura en baja resolución (thumbnail de ~15KB) y registra el evento (Entrada/Salida).
2. **Modo Administrador (Panel Web):** Gestión de empleados (asignación de PINs), visualización de fichajes diarios con su respectiva foto, corrección de registros (con motivo obligatorio) y exportación de informes PDF legales.

---

## 2. Stack Tecnológico

- **Frontend:** React (TypeScript) + Vite + Tailwind CSS + Lucide React (iconos).
- **Librerías Clave Frontend:**
  - `jspdf` + `jspdf-autotable`: Para la generación instantánea en el cliente del PDF oficial de registro de jornada exigido por Inspección de Trabajo.
- **Backend & Base de Datos:** Supabase (PostgreSQL, Autenticación, Storage y RLS).

---

## 3. Modelo de Datos y Base de Datos (PostgreSQL / Supabase)

Ejecutar las siguientes sentencias SQL en el panel de Supabase para estructurar las tablas, el almacenamiento de fotos, el trigger de auditoría inalterable y las políticas RLS.

```sql
-- 1. ENUMS
CREATE TYPE tipo_fichaje AS ENUM ('entrada', 'descanso', 'salida');
CREATE TYPE rol_usuario AS ENUM ('empleado', 'administrador');

-- 2. TABLA PERFILES
CREATE TABLE perfiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    nombre_completo TEXT NOT NULL,
    dni_nie VARCHAR(20) UNIQUE NOT NULL,
    pin_acceso VARCHAR(4) NOT NULL, -- PIN único de 4 dígitos para fichar en la tablet
    rol rol_usuario DEFAULT 'empleado' NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. TABLA FICHAJES
CREATE TABLE fichajes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES perfiles(id) ON DELETE CASCADE NOT NULL,
    tipo tipo_fichaje NOT NULL,
    fecha_hora_declarada TIMESTAMP WITH TIME ZONE NOT NULL, -- Hora local del dispositivo
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL, -- Hora inalterable del servidor (Anti-trampas)
    foto_url TEXT NOT NULL, -- Enlace al archivo .webp/.jpg comprimido en Supabase Storage
    metodo_verificacion VARCHAR(30) DEFAULT 'pin_con_foto' NOT NULL,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. TABLA DE AUDITORÍA (Trazabilidad exigida por la Ley Española)
CREATE TABLE auditoria_fichajes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fichaje_id UUID NOT NULL,
    usuario_id UUID REFERENCES perfiles(id) NOT NULL,
    modificado_by UUID REFERENCES perfiles(id) NOT NULL,
    accion VARCHAR(20) NOT NULL, -- 'UPDATE' o 'DELETE'
    fecha_hora_antes TIMESTAMP WITH TIME ZONE,
    fecha_hora_despues TIMESTAMP WITH TIME ZONE,
    motivo_cambio TEXT NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. TRIGGER DE AUDITORÍA AUTOMÁTICA
CREATE OR REPLACE FUNCTION auditar_cambios_fichaje()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.fecha_hora_declarada IS DISTINCT FROM NEW.fecha_hora_declarada) THEN
            INSERT INTO auditoria_fichajes (
                fichaje_id, usuario_id, modificado_by, accion, 
                fecha_hora_antes, fecha_hora_despues, motivo_cambio
            ) VALUES (
                OLD.id, OLD.usuario_id, auth.uid(), 'UPDATE', 
                OLD.fecha_hora_declarada, NEW.fecha_hora_declarada,
                'Modificación manual autorizada por el administrador'
            );
        END IF;
        NEW.actualizado_en := NOW();
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO auditoria_fichajes (
            fichaje_id, usuario_id, modificado_by, accion, 
            fecha_hora_antes, fecha_hora_despues, motivo_cambio
        ) VALUES (
            OLD.id, OLD.usuario_id, auth.uid(), 'DELETE', 
            OLD.fecha_hora_declarada, NULL, 'Eliminación del registro de fichaje'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auditoria_fichajes
BEFORE UPDATE OR DELETE ON fichajes
FOR EACH ROW EXECUTE FUNCTION auditar_cambios_fichaje();

-- 6. SEGURIDAD A NIVEL DE FILA (RLS)
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_fichajes ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Acceso a perfiles por autenticación" ON perfiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins control total perfiles" ON perfiles FOR ALL USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'administrador'));
CREATE POLICY "Admins control total fichajes" ON fichajes FOR ALL USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'administrador'));
CREATE POLICY "Solo admins ven auditoria" ON auditoria_fichajes FOR SELECT USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'administrador'));

*** Por favor, empieza implementando el Paso 1 y Paso 2 del SQL y la inicialización de Supabase"*, e ir avanzando pantalla por pantalla. Al estar la base de datos ya blindada por el trigger, tu lógica de backend estará prácticamente hecha desde el principio.  ***