-- ============================================
-- SQL COMPLEMENTARIO para App de Registro Horario
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- ============================================
-- POLÍTICAS RLS PÚBLICAS (para el terminal)
-- El terminal funciona SIN sesión de Auth,
-- solo con la anon key y estas políticas.
-- ============================================

-- 1. Permitir SELECT público en perfiles (verificación de PIN)
DROP POLICY IF EXISTS "Acceso a perfiles por autenticación" ON perfiles;
DROP POLICY IF EXISTS "Acceso público a perfiles" ON perfiles;
CREATE POLICY "Acceso público a perfiles" ON perfiles
  FOR SELECT USING (true);

-- 2. Permitir SELECT público en fichajes (para que el terminal
--    sepa si toca Entrada o Salida)
DROP POLICY IF EXISTS "Lectura pública de fichajes" ON fichajes;
CREATE POLICY "Lectura pública de fichajes" ON fichajes
  FOR SELECT USING (true);

-- 3. Permitir INSERT público en fichajes (registro desde terminal)
--    El trigger de auditoría protege UPDATE/DELETE
DROP POLICY IF EXISTS "Inserción pública en fichajes" ON fichajes;
CREATE POLICY "Inserción pública en fichajes" ON fichajes
  FOR INSERT WITH CHECK (true);

-- ============================================
-- POLÍTICAS DE STORAGE (para subir fotos)
-- ============================================

-- 4. Permitir subida pública al bucket de fotos
DROP POLICY IF EXISTS "Subida pública de fotos" ON storage.objects;
CREATE POLICY "Subida pública de fotos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'fotos-fichajes');

-- 5. Permitir lectura pública del bucket de fotos
DROP POLICY IF EXISTS "Lectura pública de fotos" ON storage.objects;
CREATE POLICY "Lectura pública de fotos" ON storage.objects
  FOR SELECT USING (bucket_id = 'fotos-fichajes');

-- ============================================
-- FUNCIONES RPC (para gestión de empleados desde el panel admin)
-- ============================================

-- 6. Crear empleado (auth.user + perfil)
-- Limpiar overloads previos con varchar/text
DROP FUNCTION IF EXISTS crear_empleado(TEXT, TEXT, TEXT, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS crear_empleado(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION crear_empleado(
  p_email TEXT,
  p_password TEXT,
  p_nombre_completo TEXT,
  p_dni_nie TEXT,
  p_pin_acceso TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, role,
    confirmation_token, email_change_token_current,
    email_change, email_change_token_new, is_super_admin
  ) VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000',
    p_email, crypt(p_password, gen_salt('bf')),
    NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('nombre_completo', p_nombre_completo),
    NOW(), NOW(), 'authenticated',
    '', '', '', '', false
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email', p_email, NOW(), NOW(), NOW()
  );

  INSERT INTO perfiles (id, nombre_completo, dni_nie, pin_acceso, rol)
  VALUES (v_user_id, p_nombre_completo, p_dni_nie, p_pin_acceso, 'empleado'::rol_usuario);

  RETURN v_user_id;
END;
$$;

-- 7. Eliminar empleado (auth.user + cascada)
CREATE OR REPLACE FUNCTION eliminar_empleado(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
  RETURN TRUE;
END;
$$;

-- 8. Actualizar datos de empleado
CREATE OR REPLACE FUNCTION actualizar_empleado(
  p_user_id UUID,
  p_nombre_completo TEXT,
  p_dni_nie TEXT,
  p_pin_acceso TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE perfiles
  SET nombre_completo = p_nombre_completo,
      dni_nie = p_dni_nie,
      pin_acceso = p_pin_acceso
  WHERE id = p_user_id;
  RETURN TRUE;
END;
$$;

-- ============================================
-- CONFIGURACIÓN DESDE EL DASHBOARD:
-- ============================================
--
-- 1. Storage: Crear bucket "fotos-fichajes" (público)
--    Ir a Storage > Create bucket > Nombre: fotos-fichajes > Public bucket: ON
--
-- 2. Auth: Deshabilitar confirmación de email
--    Ir a Authentication > Settings > Confirm email: OFF
--    (para que los empleados creados via RPC estén activos inmediatamente)
--
-- 3. Crear administrador:
--    Ir a Authentication > Users > Add User
--    Email: admin@empresa.com, Password: (elige una segura)
--    Luego ejecutar:
--    INSERT INTO perfiles (id, nombre_completo, dni_nie, pin_acceso, rol)
--    VALUES ((SELECT id FROM auth.users WHERE email = 'admin@empresa.com'),
--            'Administrador', 'ADMIN-001', '9999', 'administrador');
--
-- NOTA: El terminal (tablet) ya NO necesita usuario kiosk en Auth.
--      Funciona solo con la anon key del proyecto.
-- ============================================
