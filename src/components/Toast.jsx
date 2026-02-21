import { createContext, useContext } from 'react'
import { Toaster as Sonner } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'
import { useState } from 'react'

// Toast context
const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

// Toast provider using Sonner
export function ToastProvider({ children }) {
  const [confirmDialog, setConfirmDialog] = useState(null)

  // Show confirm dialog using AlertDialog
  const showConfirm = ({ title, message, confirmText, cancelText, onConfirm }) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        title,
        message,
        confirmText,
        cancelText,
        onConfirm: () => {
          setConfirmDialog(null)
          resolve(true)
        },
        onCancel: () => {
          setConfirmDialog(null)
          resolve(false)
        },
      })
    })
  }

  const toast = {
    success: (title, description) => {
      // Use sonner directly via importing in components
      // This is handled by Toaster component
      return { type: 'success', title, description }
    },
    error: (title, description) => {
      return { type: 'error', title, description }
    },
    warning: (title, description) => {
      return { type: 'warning', title, description }
    },
    info: (title, description) => {
      return { type: 'info', title, description }
    },
  }

  return (
    <ToastContext.Provider value={{ toast, showConfirm }}>
      {children}

      {/* Sonner Toaster - top center position with custom theme */}
      <Sonner
        position="top-center"
        theme="light"
        toastOptions={{
          duration: 2000,
          style: {
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            padding: '12px 16px',
            maxWidth: '400px',
          },
          classNames: {
            toast: 'bg-white border-slate-200',
            title: 'text-slate-900 font-semibold text-sm whitespace-nowrap',
            description: 'text-slate-500 text-xs mt-0.5',
            success: 'border-l-4 border-l-green-500',
            error: 'border-l-4 border-l-red-500',
            warning: 'border-l-4 border-l-yellow-500',
            info: 'border-l-4 border-l-blue-500',
            icon: 'mr-3',
          },
        }}
      />

      {/* Confirm Dialog using AlertDialog */}
      {confirmDialog && (
        <AlertDialog open={true} onOpenChange={(open) => !open && confirmDialog.onCancel()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.message}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={confirmDialog.onCancel}>
                {confirmDialog.cancelText || 'Cancel'}
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmDialog.onConfirm}>
                {confirmDialog.confirmText || 'Confirm'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </ToastContext.Provider>
  )
}

// Export a helper to trigger sonner toasts
import { toast as sonnerToast } from 'sonner'

export function triggerToast(type, title, description) {
  switch (type) {
    case 'success':
      sonnerToast.success(title, { description })
      break
    case 'error':
      sonnerToast.error(title, { description })
      break
    case 'warning':
      sonnerToast.warning(title, { description })
      break
    default:
      sonnerToast(title, { description })
  }
}
