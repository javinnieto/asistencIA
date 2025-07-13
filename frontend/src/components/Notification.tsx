import React, { useEffect } from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
  message: string;
  type?: NotificationType;
  onClose?: () => void;
  duration?: number; // ms
}

const typeToColor = {
  success: 'alert-success',
  error: 'alert-danger',
  info: 'alert-info',
  warning: 'alert-warning',
};

const Notification: React.FC<NotificationProps> = ({ message, type = 'info', onClose, duration = 3500 }) => {
  useEffect(() => {
    if (!onClose) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={`alert ${typeToColor[type]} fade show d-flex align-items-center shadow position-fixed top-0 end-0 m-4`} role="alert" style={{ zIndex: 2000, minWidth: 320, maxWidth: 400 }}>
      <i className={`bi me-2 ${
        type === 'success' ? 'bi-check-circle-fill' :
        type === 'error' ? 'bi-x-circle-fill' :
        type === 'warning' ? 'bi-exclamation-triangle-fill' :
        'bi-info-circle-fill'}`}></i>
      <div className="flex-grow-1">{message}</div>
      {onClose && (
        <button type="button" className="btn-close ms-2" aria-label="Cerrar" onClick={onClose}></button>
      )}
    </div>
  );
};

export default Notification; 