'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import Toast, { ToastProps } from './Toast'

interface ToastContextType {
  showToast: (message: string, type?: ToastProps['type'], duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

interface ToastItem extends ToastProps {
  id: string
}

export default function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = (message: string, type: ToastProps['type'] = 'info', duration = 5000) => {
    const id = Date.now().toString()
    const newToast: ToastItem = {
      id,
      message,
      type,
      duration,
      onClose: () => removeToast(id)
    }

    setToasts(prev => [...prev, newToast])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 1000 }}>
        {toasts.map((toast, index) => (
          <div key={toast.id} style={{ marginTop: index * 80 }}>
            <Toast
              message={toast.message}
              type={toast.type}
              duration={toast.duration}
              onClose={toast.onClose}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}