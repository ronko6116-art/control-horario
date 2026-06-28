import { useState, useEffect } from 'react'
import {
  Users, Plus, Pencil, Trash2, Loader, X, Check, Key,
} from 'lucide-react'
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../lib/api'

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = ''
  for (let i = 0; i < 12; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pwd + 'Aa1'
}

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [generatedPassword, setGeneratedPassword] = useState('')

  const [form, setForm] = useState({
    nombre_completo: '',
    dni_nie: '',
    pin_acceso: '',
    email: '',
  })

  useEffect(() => { loadEmployees() }, [])

  async function loadEmployees() {
    try {
      const data = await getEmployees()
      setEmployees(data.filter(e => e.rol === 'empleado'))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    const pwd = generatePassword()
    setGeneratedPassword(pwd)
    setEditing(null)
    setForm({ nombre_completo: '', dni_nie: '', pin_acceso: '', email: '' })
    setError('')
    setShowModal(true)
  }

  function openEdit(emp) {
    setGeneratedPassword('')
    setEditing(emp)
    setForm({
      nombre_completo: emp.nombre_completo,
      dni_nie: emp.dni_nie,
      pin_acceso: emp.pin_acceso,
      email: '',
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await updateEmployee(editing.id, {
          nombreCompleto: form.nombre_completo,
          dniNie: form.dni_nie,
          pinAcceso: form.pin_acceso,
        })
      } else {
        if (!form.email) {
          setError('El email es obligatorio para crear un empleado')
          setSaving(false)
          return
        }
        await createEmployee({
          email: form.email,
          password: generatedPassword,
          nombreCompleto: form.nombre_completo,
          dniNie: form.dni_nie,
          pinAcceso: form.pin_acceso,
        })
      }
      setShowModal(false)
      await loadEmployees()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`¿Eliminar a "${name}"? Esta acción no se puede deshacer.`)) return
    try {
      await deleteEmployee(id)
      await loadEmployees()
    } catch (err) {
      alert('Error al eliminar: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Empleados
          </h1>
          <p className="text-gray-500 mt-1">{employees.length} empleados registrados</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Empleado
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50 border-b border-gray-200">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">DNI/NIE</th>
                <th className="px-5 py-3 font-medium">PIN</th>
                <th className="px-5 py-3 font-medium">Creado</th>
                <th className="px-5 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-400">
                    No hay empleados registrados
                  </td>
                </tr>
              )}
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{emp.nombre_completo}</td>
                  <td className="px-5 py-3 text-gray-600">{emp.dni_nie}</td>
                  <td className="px-5 py-3">
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">{emp.pin_acceso}</code>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(emp.creado_en).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(emp)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(emp.id, emp.nombre_completo)}
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
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto pt-8">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">
                {editing ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={form.nombre_completo}
                  onChange={e => setForm(f => ({ ...f, nombre_completo: e.target.value }))}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DNI/NIE</label>
                <input
                  type="text"
                  value={form.dni_nie}
                  onChange={e => setForm(f => ({ ...f, dni_nie: e.target.value }))}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PIN de Acceso (4 dígitos)</label>
                <input
                  type="text"
                  value={form.pin_acceso}
                  onChange={e => setForm(f => ({ ...f, pin_acceso: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  required
                  maxLength={4}
                  pattern="[0-9]{4}"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {!editing && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email (para la cuenta de acceso)</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña generada automáticamente</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono">
                        {generatedPassword}
                      </code>
                      <button
                        type="button"
                        onClick={() => setGeneratedPassword(generatePassword())}
                        className="p-2.5 text-gray-500 hover:text-blue-600 border border-gray-300 rounded-lg hover:bg-blue-50"
                        title="Generar nueva"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      El empleado no necesita esta contraseña (usa PIN en el terminal)
                    </p>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  {editing ? 'Guardar Cambios' : 'Crear Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
