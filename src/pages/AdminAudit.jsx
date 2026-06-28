import { useState, useEffect } from 'react'
import { Shield, Loader } from 'lucide-react'
import { getAuditLog } from '../lib/api'

export default function AdminAudit() {
  const [auditLog, setAuditLog] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAuditLog()
      .then(setAuditLog)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Auditoría
        </h1>
        <p className="text-gray-500 mt-1">
          Trazabilidad de modificaciones en los fichajes (Real Decreto-ley 8/2019)
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50 border-b border-gray-200">
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Empleado</th>
                <th className="px-5 py-3 font-medium">Modificado Por</th>
                <th className="px-5 py-3 font-medium">Acción</th>
                <th className="px-5 py-3 font-medium">Hora Anterior</th>
                <th className="px-5 py-3 font-medium">Hora Nueva</th>
                <th className="px-5 py-3 font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    No hay registros de auditoría
                  </td>
                </tr>
              )}
              {auditLog.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                    {new Date(entry.creado_en).toLocaleString('es-ES')}
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {entry.usuario_id_perfil?.nombre_completo || 'Desconocido'}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {entry.modificado_by_perfil?.nombre_completo || 'Desconocido'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      entry.accion === 'UPDATE'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {entry.accion}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                    {entry.fecha_hora_antes
                      ? new Date(entry.fecha_hora_antes).toLocaleString('es-ES')
                      : '-'
                    }
                  </td>
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                    {entry.fecha_hora_despues
                      ? new Date(entry.fecha_hora_despues).toLocaleString('es-ES')
                      : '-'
                    }
                  </td>
                  <td className="px-5 py-3 text-gray-500 max-w-xs truncate">
                    {entry.motivo_cambio}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
