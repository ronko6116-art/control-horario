import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  CheckCircle, XCircle, Loader, RefreshCw, Clock, User,
} from 'lucide-react'
import {
  getTodayRecords, determineNextTipo,
  uploadPhoto, createFichaje,
} from '../lib/api'

const TIPO_LABELS = {
  entrada: { label: 'ENTRADA', color: 'text-green-400', bg: 'bg-green-500/20' },
  salida: { label: 'SALIDA', color: 'text-red-400', bg: 'bg-red-500/20' },
  descanso: { label: 'DESCANSO', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
}

export default function TerminalCamera() {
  const location = useLocation()
  const navigate = useNavigate()
  const employee = location.state?.employee
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const mountedRef = useRef(true)

  const [step, setStep] = useState('starting')
  const [tipo, setTipo] = useState('entrada')
  const [capturedBlob, setCapturedBlob] = useState(null)
  const [capturedUrl, setCapturedUrl] = useState(null)
  const [error, setError] = useState('')
  const [successData, setSuccessData] = useState(null)
  const [countdown, setCountdown] = useState(null)

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  async function captureFromStream() {
    const stream = streamRef.current
    const canvas = canvasRef.current
    if (!stream || !canvas || !mountedRef.current) return

    const track = stream.getVideoTracks()[0]
    if (!track) return

    try {
      if ('ImageCapture' in window) {
        const imageCapture = new ImageCapture(track)
        const bitmap = await imageCapture.grabFrame()
        if (!mountedRef.current) return
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        canvas.getContext('2d').drawImage(bitmap, 0, 0)
        bitmap.close()
      } else {
        const video = videoRef.current
        if (!video) return
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        canvas.getContext('2d').drawImage(video, 0, 0)
      }

      canvas.toBlob((blob) => {
        if (!mountedRef.current) return
        setCapturedBlob(blob)
        setCapturedUrl(canvas.toDataURL('image/jpeg', 0.5))
        setStep('captured')
        stopCamera()
      }, 'image/jpeg', 0.5)
    } catch (_) {
      const video = videoRef.current
      if (video && video.videoWidth > 0) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)
        canvas.toBlob((blob) => {
          if (!mountedRef.current) return
          setCapturedBlob(blob)
          setCapturedUrl(canvas.toDataURL('image/jpeg', 0.5))
          setStep('captured')
          stopCamera()
        }, 'image/jpeg', 0.5)
      }
    }
  }

  function startAutoCapture() {
    let count = 3
    setCountdown(count)
    const interval = setInterval(() => {
      count--
      if (!mountedRef.current) { clearInterval(interval); return }
      setCountdown(count)
      if (count <= 0) {
        clearInterval(interval)
        captureFromStream()
      }
    }, 1000)
  }

  useEffect(() => {
    mountedRef.current = true
    if (!employee) {
      navigate('/', { replace: true })
      return
    }

    async function init() {
      try {
        const records = await getTodayRecords(employee.id)
        const lastRecord = records?.[0] || null
        const detectedTipo = determineNextTipo(lastRecord, records)
        if (!mountedRef.current) return
        setTipo(detectedTipo)

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        const videoEl = videoRef.current
        if (videoEl) {
          videoEl.srcObject = stream
          videoEl.play().catch(() => {})
        }
        setStep('preview')
        startAutoCapture()
      } catch (err) {
        if (!mountedRef.current) return
        setError('No se pudo acceder a la cámara: ' + err.message)
        setStep('error')
      }
    }
    init()

    return () => {
      mountedRef.current = false
      stopCamera()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee, navigate])

  async function confirmAndSave() {
    setStep('uploading')
    setError('')
    try {
      const fotoUrl = await uploadPhoto(employee.id, capturedBlob)
      const record = await createFichaje(employee.id, tipo, fotoUrl)
      setSuccessData(record)
      setStep('success')
    } catch (err) {
      setError('Error al guardar: ' + err.message)
      setStep('captured')
    }
  }

  function resetAndGoHome() {
    setCapturedBlob(null)
    setCapturedUrl(null)
    setSuccessData(null)
    setStep('starting')
    setError('')
    setCountdown(null)
    navigate('/', { replace: true })
  }

  if (!employee) return null

  const tipoInfo = TIPO_LABELS[tipo] || TIPO_LABELS.entrada
  const now = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      {step === 'preview' && (
        <>
          <div className="flex-1 relative flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover max-h-[70vh]"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-white/30 rounded-full" />
            </div>
            {countdown > 0 && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
                <span className="text-6xl font-bold text-blue-400 animate-pulse">
                  {countdown}
                </span>
              </div>
            )}
          </div>

          <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <span className="text-lg">{employee.nombre_completo}</span>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${tipoInfo.bg} ${tipoInfo.color}`}>
              {tipoInfo.label}
            </div>
          </div>
        </>
      )}

      {step === 'captured' && (
        <>
          <div className="flex-1 flex items-center justify-center bg-black p-4">
            {capturedUrl && (
              <img
                src={capturedUrl}
                alt="Captura"
                className="max-h-[60vh] rounded-lg border-2 border-gray-700"
              />
            )}
          </div>

          <div className="bg-gray-800 px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <span className="text-lg">{employee.nombre_completo}</span>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${tipoInfo.bg} ${tipoInfo.color}`}>
                {tipoInfo.label}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="w-4 h-4" />
                <span>{now}</span>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={resetAndGoHome}
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Repetir
              </button>
              <button
                onClick={confirmAndSave}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Confirmar
              </button>
            </div>
          </div>
        </>
      )}

      {step === 'uploading' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader className="w-12 h-12 text-blue-400 animate-spin" />
          <p className="text-xl">Guardando registro...</p>
        </div>
      )}

      {step === 'success' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-14 h-14 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-green-400">¡Fichaje Registrado!</h2>
          <div className={`px-6 py-2 rounded-full text-lg font-bold ${tipoInfo.bg} ${tipoInfo.color}`}>
            {tipoInfo.label}
          </div>
          <p className="text-xl text-gray-300">{employee.nombre_completo}</p>
          <p className="text-lg text-gray-400">
            {successData && new Date(successData.creado_en).toLocaleString('es-ES')}
          </p>
          {capturedUrl && (
            <img
              src={capturedUrl}
              alt="Foto"
              className="w-32 h-32 object-cover rounded-full border-4 border-green-500/50"
            />
          )}
          <button
            onClick={resetAndGoHome}
            className="mt-4 px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-lg transition-colors"
          >
            Nuevo Fichaje
          </button>
        </div>
      )}

      {step === 'starting' && (
        <div className="flex-1 flex items-center justify-center">
          <Loader className="w-12 h-12 text-blue-400 animate-spin" />
        </div>
      )}

      {step === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <XCircle className="w-16 h-16 text-red-400" />
          <p className="text-xl text-red-400 text-center">{error}</p>
          <button
            onClick={resetAndGoHome}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
