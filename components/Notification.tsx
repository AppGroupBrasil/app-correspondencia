// components/Notification.tsx

import { CheckCircle, AlertCircle } from 'lucide-react'

interface NotificationProps {
  type: 'success' | 'error'
  message: string
}

export const Notification = ({ type, message }: NotificationProps) => {
  const isSuccess = type === 'success'

  return (
    <div
      className={`${
        isSuccess
          ? 'bg-green-100 border-green-400 text-green-700'
          : 'bg-red-100 border-red-400 text-red-700'
      } border px-4 py-3 rounded-lg mb-4 flex items-center gap-2 animate-fade-in`}
      role="alert"
    >
      {isSuccess ? (
        <CheckCircle className="w-5 h-5" />
      ) : (
        <AlertCircle className="w-5 h-5" />
      )}
      <span>{message}</span>
    </div>
  )
}
