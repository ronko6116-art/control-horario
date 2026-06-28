import { useState, useEffect } from 'react'
import {
  ClipboardList, Search, FileText, Trash2, Pencil, X, Check, Loader,
  ChevronDown, ChevronUp, Camera,
} from 'lucide-react'
import {
  getRecords, getEmployees, getDailyReport,
  updateFichaje, deleteFichaje, generateDailyReportPDF,
} from '../lib/api'

export default function AdminRecords() {
  const [records, setRecords] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])
  const [filterEmployee, setFilterEmployee] = useState('')
  const [expandedPhoto, setExpandedPhoto] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({ fecha_hora_declarada: '', motivo: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function fetchRecords(date, empId) {
      try {
        const data = await getRecords({
          fecha: date || undefined,
          empleadoId: empId || undefined,
        })
        if (!cancelled) setRecords(data)
      } catch (err) {
        if (!cancelled) console.error(err)
      }
    }
    fetchRecords(filterDate, filterEmployee)
    return () => { cancelled = true }
  }, [filterDate, filterEmployee])

  useEffect(() => {
    getEmployees().then(data => setEmployees(data.filter(e => e.rol === 'empleado'))).catch(() => {})
  }, [])

  function openEdit(record) {
    setEditModal(record)
    setEditForm({
      fecha_hora_declarada: new Date(record.fecha_hora_declarada).toISOString().slice(0, 16),
      motivo: '',
    })
    setError('')
  }

  async function doFetch() {
    setLoading(true)
    const data = await getRecords({
      fecha: filterDate || undefined,
      empleadoId: filterEmployee || undefined,
    })
    setRecords(data)
    setLoading(false)
  }

  async function handleEditSave(e) {
    e.preventDefault()
    if (!editForm.motivo.trim()) {
      setError('Debes indicar un motivo para la corrección')
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateFichaje(editModal.id, editForm.fecha_hora_declarada)
      setEditModal(null)
      await doFetch()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(record) {
    if (!window.confirm(`¿Eliminar este fichaje de "${record.perfiles?.nombre_completo}"?`)) return
    try {
      await deleteFichaje(record.id)
      await doFetch()
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  async function handleExportPDF() {
    const dateLabel = filterDate || new Date().toISOString().split('T')[0]
    const data = await getDailyReport(dateLabel)
    generateDailyReportPDF(data, dateLabel)
  }

  const tipoClass = (tipo) => {
    switch (tipo) {
      case 'entrada': return 'bg-green-100 text-green-700'
      case 'salida': return 'bg-red-100 text-red-700'
      case 'descanso': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6" />
            Fichajes
          </h1>
          <p className="text-gray-500 mt-1">Registro de jornada laboral</p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <FileText className="w-4 h-4" />
          Exportar PDF
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={filterEmployee}
          onChange={e => setFilterEmployee(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todos los empleados</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.nombre_completo}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 bg-gray-50 border-b border-gray-200">
                  <th className="px-5 py-3 font-medium">Empleado</th>
                  <th className="px-5 py-3 font-medium">DNI/NIE</th>
                  <th className="px-5 py-3 font-medium">Tipo</th>
                  <th className="px-5 py-3 font-medium">Hora Declarada</th>
                  <th className="px-5 py-3 font-medium">Hora Servidor</th>
                  <th className="px-5 py-3 font-medium">Foto</th>
                  <th className="px-5 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                      No hay fichajes para esta fecha
                    </td>
                  </tr>
                )}
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {r.perfiles?.nombre_completo || 'Desconocido'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{r.perfiles?.dni_nie || '-'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${tipoClass(r.tipo)}`}>
                        {r.tipo}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {new Date(r.fecha_hora_declarada).toLocaleString('es-ES')}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(r.creado_en).toLocaleString('es-ES')}
                    </td>
                    <td className="px-5 py-3">
                      {r.foto_url ? (
                        <button
                          onClick={() => setExpandedPhoto(expandedPhoto === r.id ? null : r.id)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        >
                          <Camera className="w-4 h-4" />
                          <span className="text-xs">Ver foto</span>
                          {expandedPhoto === r.id
                            ? <ChevronUp className="w-3 h-3" />
                            : <ChevronDown className="w-3 h-3" />
                          }
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin foto</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(r)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Corregir"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {expandedPhoto && records.filter(r => r.id === expandedPhoto).map(r => (
            <div key={r.id} className="border-t border-gray-200 p-4 bg-gray-50 flex justify-center">
              <img
                src={r.foto_url}
                alt="Foto del fichaje"
                className="max-w-xs max-h-48 rounded-lg shadow-sm object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Corregir Fichaje</h2>
              <button onClick={() => setEditModal(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSave} className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Empleado: <strong>{editModal.perfiles?.nombre_completo}</strong>
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva Fecha y Hora
                </label>
                <input
                  type="datetime-local"
                  value={editForm.fecha_hora_declarada}
                  onChange={e => setEditForm(f => ({ ...f, fecha_hora_declarada: e.target.value }))}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo de la corrección <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={editForm.motivo}
                  onChange={e => setEditForm(f => ({ ...f, motivo: e.target.value }))}
                  required
                  rows={3}
                  placeholder="Indica el motivo del cambio (obligatorio)"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
