import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, ClipboardCheck, Clock, TrendingUp, ArrowRight, UserCheck,
} from 'lucide-react'
import { getDashboardStats, getRecords } from '../lib/api'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recentRecords, setRecentRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [statsData, recordsData] = await Promise.all([
          getDashboardStats(),
          getRecords({}).then(r => r.slice(0, 10)),
        ])
        setStats(statsData)
        setRecentRecords(recordsData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  const cards = [
    {
      title: 'Empleados',
      value: stats?.empleadosCount || 0,
      icon: Users,
      color: 'bg-blue-500',
      link: '/admin/empleados',
    },
    {
      title: 'Fichajes Hoy',
      value: stats?.fichajesToday || 0,
      icon: ClipboardCheck,
      color: 'bg-green-500',
      link: '/admin/fichajes',
    },
    {
      title: 'Entradas Hoy',
      value: stats?.entradasHoy || 0,
      icon: UserCheck,
      color: 'bg-purple-500',
      link: '/admin/fichajes',
    },
    {
      title: 'En Curso',
      value: (stats?.entradasHoy || 0) - ((stats?.fichajesToday || 0) - (stats?.entradasHoy || 0)),
      icon: TrendingUp,
      color: 'bg-amber-500',
      link: '/admin/fichajes',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Resumen del día de hoy</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon
          return (
            <Link
              key={i}
              to={card.link}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-4">{card.value}</p>
              <p className="text-sm text-gray-500 mt-1">{card.title}</p>
            </Link>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Últimos Fichajes
          </h2>
          <Link
            to="/admin/fichajes"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Ver todos
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Empleado</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Hora</th>
              </tr>
            </thead>
            <tbody>
              {recentRecords.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-gray-400">
                    No hay fichajes hoy
                  </td>
                </tr>
              )}
              {recentRecords.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {r.perfiles?.nombre_completo || 'Desconocido'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.tipo === 'entrada' ? 'bg-green-100 text-green-700' :
                      r.tipo === 'salida' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {r.tipo}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(r.creado_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
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
