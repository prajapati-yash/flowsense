'use client'

import { useState, useEffect } from 'react'
import styles from './Toast.module.css'

export interface ToastProps {
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  duration?: number
  onClose?: () => void
}

export default function Toast({ message, type = 'info', duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onClose?.(), 300) // Wait for animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  if (!isVisible) return null

  return (
    <div className={`${styles.toast} ${styles[type]} ${isVisible ? styles.show : styles.hide}`}>
      <div className={styles.toastContent}>
        <span className={styles.toastIcon}>
          {type === 'info' && 'ℹ️'}
          {type === 'success' && '✅'}
          {type === 'warning' && '⚠️'}
          {type === 'error' && '❌'}
        </span>
        <span className={styles.toastMessage}>{message}</span>
        <button
          className={styles.toastClose}
          onClick={() => {
            setIsVisible(false)
            setTimeout(() => onClose?.(), 300)
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}