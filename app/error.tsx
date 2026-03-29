'use client' // Error components must be Client Components

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('App Error:', error)
  }, [error])

  return (
    <div className="flex h-[50vh] flex-col items-center justify-center p-4 text-center">
      <div className="mb-4 rounded-full bg-red-100 p-4">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <h2 className="mb-2 text-xl font-bold text-gray-900">Algo deu errado!</h2>
      <p className="mb-6 text-gray-600">
        Desculpe, ocorreu um erro inesperado na aplicação.
      </p>
      <button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
        className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  )
}
