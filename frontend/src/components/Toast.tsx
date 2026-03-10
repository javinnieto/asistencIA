
import React, { createContext, useContext, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';

/* 
  Custom Toast System 
  - Uses ReactDOM.createPortal to break out of any stacking context.
  - Attached directly to document.body.
  - Inline styles to prevent CSS inheritance issues.
*/

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        // If used outside provider, just alert as fallback
        return {
            showToast: (msg: string) => alert(msg)
        };
    }
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto remove
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // Portal Element
    const toastContainer = (
        <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2147483647, // Max 32-bit integer z-index
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            pointerEvents: 'none', // Allow clicks through container
            width: 'auto',
            minWidth: '300px',
            maxWidth: '90vw'
        }}>
            {toasts.map(toast => {
                let bgColor = '#333';
                if (toast.type === 'success') bgColor = '#10b981'; // Green
                if (toast.type === 'error') bgColor = '#ef4444';   // Red
                if (toast.type === 'warning') bgColor = '#f59e0b'; // Amber
                if (toast.type === 'info') bgColor = '#3b82f6';    // Blue

                return (
                    <div key={toast.id} style={{
                        background: bgColor,
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        pointerEvents: 'auto', // Enable clicks on toasts
                        animation: 'fadeIn 0.3s ease',
                        fontSize: '15px',
                        fontWeight: 500
                    }}>
                        <span>{toast.message}</span>
                        <button
                            onClick={() => removeToast(toast.id)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                fontSize: '18px',
                                cursor: 'pointer',
                                opacity: 0.8
                            }}
                        >
                            ×
                        </button>
                    </div>
                );
            })}
            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {ReactDOM.createPortal(toastContainer, document.body)}
        </ToastContext.Provider>
    );
}
