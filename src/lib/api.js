import { supabase } from './supabase'
import jsPDF from 'jspdf'
import { applyPlugin } from 'jspdf-autotable'
applyPlugin(jsPDF)

/* ============================================
   TERMINAL (Quiosco)
   ============================================ */

export async function verifyPin(pin) {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('pin_acceso', pin)
    .eq('rol', 'empleado')
    .single()
  if (error) throw error
  return data
}

export async function getLastRecord(usuarioId) {
  const { data, error } = await supabase
    .from('fichajes')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('creado_en', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getTodayRecords(usuarioId) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('fichajes')
    .select('*')
    .eq('usuario_id', usuarioId)
    .gte('creado_en', today.toISOString())
    .order('creado_en', { ascending: false })
  if (error) throw error
  return data
}

export function determineNextTipo(lastRecord, todayRecords) {
  if (!todayRecords || todayRecords.length === 0) return 'entrada'

  const last = todayRecords[0]
  if (last.tipo === 'entrada') return 'salida'
  if (last.tipo === 'descanso') return 'entrada'
  return 'entrada'
}

export async function uploadPhoto(usuarioId, blob) {
  const fileName = `${usuarioId}/${Date.now()}.jpg`
  const { error: uploadError } = await supabase.storage
    .from('fotos-fichajes')
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
    })
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from('fotos-fichajes')
    .getPublicUrl(fileName)

  return publicUrl
}

export async function createFichaje(usuarioId, tipo, fotoUrl) {
  const { data, error } = await supabase
    .from('fichajes')
    .insert({
      usuario_id: usuarioId,
      tipo,
      fecha_hora_declarada: new Date().toISOString(),
      foto_url: fotoUrl,
      metodo_verificacion: 'pin_con_foto',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/* ============================================
   ADMIN: Autenticación
   ============================================ */

export async function loginAdmin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function logoutAdmin() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getAdminSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

/* ============================================
   ADMIN: Empleados
   ============================================ */

export async function getEmployees() {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .order('nombre_completo')
  if (error) throw error
  return data
}

export async function createEmployee({ email, password, nombreCompleto, dniNie, pinAcceso }) {
  const { data, error } = await supabase.rpc('crear_empleado', {
    p_email: email,
    p_password: password,
    p_nombre_completo: nombreCompleto,
    p_dni_nie: dniNie,
    p_pin_acceso: pinAcceso,
  })
  if (error) throw error
  return data
}

export async function updateEmployee(id, { nombreCompleto, dniNie, pinAcceso }) {
  const { data, error } = await supabase.rpc('actualizar_empleado', {
    p_user_id: id,
    p_nombre_completo: nombreCompleto,
    p_dni_nie: dniNie,
    p_pin_acceso: pinAcceso,
  })
  if (error) throw error
  return data
}

export async function deleteEmployee(id) {
  const { data, error } = await supabase.rpc('eliminar_empleado', {
    p_user_id: id,
  })
  if (error) throw error
  return data
}

/* ============================================
   ADMIN: Fichajes
   ============================================ */

export async function getRecords({ fechaDesde, fechaHasta, empleadoId } = {}) {
  let query = supabase
    .from('fichajes')
    .select('*, perfiles(nombre_completo, dni_nie)')
    .order('creado_en', { ascending: false })

  if (fechaDesde) {
    const start = new Date(fechaDesde)
    start.setHours(0, 0, 0, 0)
    query = query.gte('creado_en', start.toISOString())
  }

  if (fechaHasta) {
    const end = new Date(fechaHasta)
    end.setHours(23, 59, 59, 999)
    query = query.lte('creado_en', end.toISOString())
  }

  if (empleadoId) {
    query = query.eq('usuario_id', empleadoId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getDailyReport(dateFrom, dateTo) {
  const start = new Date(dateFrom)
  start.setHours(0, 0, 0, 0)
  const end = new Date(dateTo || dateFrom)
  end.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('fichajes')
    .select('*, perfiles(nombre_completo, dni_nie)')
    .gte('creado_en', start.toISOString())
    .lte('creado_en', end.toISOString())
    .order('creado_en', { ascending: true })
  if (error) throw error
  return data
}

export async function updateFichaje(id, fechaHoraDeclarada) {
  const { data, error } = await supabase
    .from('fichajes')
    .update({ fecha_hora_declarada: fechaHoraDeclarada })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteFichaje(id) {
  const { error } = await supabase
    .from('fichajes')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/* ============================================
   ADMIN: Auditoría
   ============================================ */

export async function getAuditLog() {
  const { data, error } = await supabase
    .from('auditoria_fichajes')
    .select('*, modificado_by_perfil:modificado_by(nombre_completo), usuario_id_perfil:usuario_id(nombre_completo)')
    .order('creado_en', { ascending: false })
    .limit(200)
  if (error) throw error
  return data
}

/* ============================================
   ADMIN: Dashboard stats
   ============================================ */

export async function getDashboardStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count: empleadosCount, error: empError } = await supabase
    .from('perfiles')
    .select('*', { count: 'exact', head: true })
    .eq('rol', 'empleado')
  if (empError) throw empError

  const { count: fichajesToday, error: fichError } = await supabase
    .from('fichajes')
    .select('*', { count: 'exact', head: true })
    .gte('creado_en', today.toISOString())
  if (fichError) throw fichError

  const { count: entradasHoy, error: entError } = await supabase
    .from('fichajes')
    .select('*', { count: 'exact', head: true })
    .eq('tipo', 'entrada')
    .gte('creado_en', today.toISOString())
  if (entError) throw entError

  return { empleadosCount, fichajesToday, entradasHoy }
}

/* ============================================
   ADMIN: Exportación PDF (Registro de Jornada)
   ============================================ */

export function generateDailyReportPDF(records, dateLabel) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(16)
  doc.text('Registro de Jornada', pageWidth / 2, 15, { align: 'center' })

  doc.setFontSize(10)
  doc.text(`Período: ${dateLabel}`, 14, 25)
  doc.text(`Generado el: ${new Date().toLocaleString('es-ES')}`, 14, 31)
  doc.text('Empresa: [Nombre de la Empresa]', 14, 37)
  doc.text('CIF: [CIF de la Empresa]', 14, 43)

  // Group by employee, then by day
  const empMap = {}
  for (const r of records) {
    const name = r.perfiles?.nombre_completo || 'Desconocido'
    const dni = r.perfiles?.dni_nie || ''
    if (!empMap[name]) empMap[name] = { dni, nombre: name, dias: {} }
    const dia = new Date(r.creado_en).toLocaleDateString('es-ES')
    if (!empMap[name].dias[dia]) empMap[name].dias[dia] = {}
    empMap[name].dias[dia][r.tipo] = new Date(r.creado_en).toLocaleTimeString('es-ES', {
      hour: '2-digit', minute: '2-digit',
    })
  }

  const body = []
  for (const emp of Object.values(empMap)) {
    const entries = Object.entries(emp.dias)
    entries.forEach(([fecha, tipos], idx) => {
      body.push([
        idx === 0 ? emp.nombre : '',
        idx === 0 ? emp.dni : '',
        fecha,
        tipos.entrada || '-',
        tipos.descanso || '-',
        tipos.salida || '-',
      ])
    })
  }

  doc.autoTable({
    head: [['Empleado', 'DNI/NIE', 'Fecha', 'Entrada', 'Descanso', 'Salida']],
    body,
    startY: 50,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 25 },
      2: { cellWidth: 30 },
    },
  })

  const finalY = doc.lastAutoTable.finalY || 50
  doc.setFontSize(8)
  doc.text(
    'Documento generado automáticamente. Real Decreto-ley 8/2019, de 8 de marzo.',
    14,
    finalY + 10
  )

  doc.save(`registro-jornada-${dateLabel.replace(/[/\s]/g, '-')}.pdf`)
}
