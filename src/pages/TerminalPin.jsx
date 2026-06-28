import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Delete, Smartphone } from 'lucide-react'
import { verifyPin } from '../lib/api'

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'backspace'],
]

export default function TerminalPin() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleKey = useCallback((key) => {
    if (loading) return
    setError('')

    if (key === 'backspace') {
      return setPin(prev => prev.slice(0, -1))
    }

    setPin(prev => {
      if (prev.length >= 4) return prev
      const newPin = prev + key
      if (newPin.length === 4) {
        setTimeout(async () => {
          setLoading(true)
          setError('')
          try {
            const employee = await verifyPin(newPin)
            navigate('/camera', { state: { employee } })
          } catch {
            setError('PIN inválido. Intente de nuevo.')
            setPin('')
          } finally {
            setLoading(false)
          }
        }, 100)
      }
      return newPin
    })
  }, [loading, navigate])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
      <div className="flex items-center gap-3 mb-8">
        <Clock className="w-10 h-10 text-blue-400" />
        <h1 className="text-3xl font-bold">Registro Horario</h1>
      </div>

      <p className="text-xl text-gray-400 mb-6">INGRESE SU PIN</p>

      <div className="flex gap-4 mb-8">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 transition-all ${
              pin.length > i
                ? 'bg-blue-500 border-blue-500'
                : 'border-gray-500'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-lg mb-4 animate-pulse">{error}</p>
      )}

      <div className="w-full max-w-xs">
        {KEYS.map((row, ri) => (
          <div key={ri} className="flex gap-3 mb-3">
            {row.map((key, ki) => {
              if (key === '') {
                return <div key={ki} className="flex-1" />
              }
              return (
                <button
                  key={ki}
                  onClick={() => handleKey(key)}
                  disabled={loading}
                  className={`flex-1 h-16 text-2xl font-bold rounded-xl transition-all active:scale-95 ${
                    key === 'backspace'
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-800 hover:bg-gray-700'
                  } disabled:opacity-50`}
                >
                  {key === 'backspace' ? <Delete className="w-7 h-7 mx-auto" /> : key}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {pin.length > 0 && (
        <button
          onClick={() => { setPin(''); setError('') }}
          className="mt-6 text-gray-400 hover:text-white transition-colors text-lg"
        >
          Limpiar
        </button>
      )}

      <div className="mt-auto pt-8">
        <Smartphone className="w-5 h-5 text-gray-600 mx-auto" />
      </div>
    </div>
  )
}
