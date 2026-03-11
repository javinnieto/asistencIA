import * as React from 'react';
import { useState } from 'react';
import { ignorarConflicto, aceptarConflicto } from '../config/api';
import { useToast } from './Toast';

interface Conflicto {
  idConflicto: number;
  persona_db: {
    idPersona: number;
    nombre: string;
  };
  nombre_recibido: string;
  fechaHora: string;
  foto_recibida: string | null;
}

interface ConflictoModalProps {
  conflict: Conflicto;
  onClose: () => void;
  onResolved: () => void;
}

const ConflictoModal: React.FC<ConflictoModalProps> = ({ conflict, onClose, onResolved }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleResolver = async (action: 'ignorar' | 'aceptar') => {
    setLoading(true);
    try {
      if (action === 'ignorar') {
        const res = await ignorarConflicto(conflict.idConflicto);
        if (res.ok) {
          showToast('Conflicto ignorado exitosamente', 'success');
          onResolved();
        } else {
          showToast('Error al ignorar conflicto', 'error');
        }
      } else {
        const res = await aceptarConflicto(conflict.idConflicto);
        if (res.ok) {
          showToast('¡Datos del usuario actualizados exitosamente!', 'success');
          onResolved();
        } else {
          showToast('Error aceptando el conflicto', 'error');
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Error de red resolviendo conflicto', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="modal-content-custom" style={{
        background: '#fff', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '500px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px' }}>
          <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="bi bi-exclamation-triangle-fill text-danger"></i>
            Conflicto de Identidad ({conflict.persona_db.idPersona})
          </h4>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>×</button>
        </div>

        <div style={{ marginBottom: '20px', color: '#475569', fontSize: '0.95rem', lineHeight: '1.5' }}>
          <p>
            Alguien intentó procesar una entrada desde el lector pero hemos detectado <strong>un rostro idéntico</strong> a un usuario ya existente.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div><strong style={{color: '#0f172a'}}>Registrado en Base de Datos:</strong> {conflict.persona_db.nombre}</div>
            <div><strong style={{color: '#0f172a'}}>Nombre provisto por el Lector:</strong> {conflict.nombre_recibido}</div>
          </div>
          <p style={{ marginTop: '16px' }}>
            ¿Deseas <strong>Sobreescribir</strong> los datos de nuestra Base de Datos con los que envió el lector, o deseas <strong>Ignorar</strong> esta alerta?
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button 
            onClick={() => handleResolver('ignorar')} 
            disabled={loading}
            className="btn btn-outline-secondary"
            style={{ minWidth: '100px' }}
          >
            Ignorar Alerta
          </button>
          <button 
            onClick={() => handleResolver('aceptar')} 
            disabled={loading}
            className="btn btn-primary"
            style={{ minWidth: '130px', background: '#3b82f6', borderColor: '#3b82f6' }}
          >
            {loading ? 'Procesando...' : 'Sobreescribir'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictoModal;
