import * as React from 'react';
import { useState } from 'react';
import { actualizarNombreConflicto, eliminarDuplicado, apiRequest } from '../config/api';
import { useToast } from './Toast';
import { useModalBackButton } from '../hooks/useModalBackButton';

interface Conflicto {
  idConflicto: number;
  persona_db: {
    idPersona: number;
    nombre: string;
    foto?: string;
  };
  nombre_recibido: string;
  fechaHora: string;
  foto_recibida: string | null;
  id_persona_nueva?: number | null;
}

interface ConflictoModalProps {
  conflict: Conflicto;
  onClose: () => void;
  onResolved: () => void;
}

type ActionType = 'edit_original' | 'edit_nueva' | 'delete' | null;

// ─── Sub-componentes ────────────────────────────────────────────────────────

const CardPersona: React.FC<{
  foto?: string | null;
  nombre: string;
  idPersona?: number | null;
  accentColor: string;
  label: string;
  labelIcon: string;
  badge?: string;
  isHighlighted?: boolean;
  isDimmed?: boolean;
}> = ({ foto, nombre, idPersona, accentColor, label, labelIcon, badge, isHighlighted, isDimmed }) => (
  <div style={{
    background: 'rgba(15,23,42,0.7)',
    border: `1px solid rgba(${accentColor}, ${isHighlighted ? '0.8' : '0.2'})`,
    borderRadius: '14px', padding: '16px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
    flex: 1, minWidth: '140px',
    transform: isHighlighted ? 'scale(1.05)' : 'none',
    boxShadow: isHighlighted ? `0 8px 25px rgba(${accentColor},0.35)` : 'none',
    transition: 'all 0.25s ease',
    opacity: isDimmed ? 0.45 : 1,
  }}>
    <div style={{ fontSize: '0.65rem', color: `rgba(${accentColor},1)`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
      <i className={`bi bi-${labelIcon} me-1`}></i>{label}
    </div>
    {foto ? (
      <img src={foto} alt={nombre} style={{
        width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover',
        border: `2px solid rgba(${accentColor},0.4)`,
      }} />
    ) : (
      <div style={{
        width: '60px', height: '60px', borderRadius: '50%',
        background: `rgba(${accentColor},0.1)`, border: `2px solid rgba(${accentColor},0.25)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className="bi bi-person" style={{ fontSize: '1.5rem', color: `rgba(${accentColor},0.8)` }}></i>
      </div>
    )}
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.3 }}>{nombre}</div>
      <div style={{ color: '#475569', fontSize: '0.7rem', marginTop: '3px' }}>
        {idPersona ? `ID #${idPersona}` : 'Sin ID'}
        {badge && <span style={{ marginLeft: '5px', background: `rgba(${accentColor},0.15)`, color: `rgba(${accentColor},0.9)`, borderRadius: '4px', padding: '1px 5px', fontSize: '0.67rem' }}>{badge}</span>}
      </div>
    </div>
  </div>
);

const OptionButton: React.FC<{
  selected: boolean;
  onClick: () => void;
  accentRgb: string;
  icon: string;
  title: string;
  description: string;
  onHoverChange: (isHovering: boolean) => void;
  disabled?: boolean;
  isDimmed?: boolean;
}> = ({ selected, onClick, accentRgb, icon, title, description, onHoverChange, disabled, isDimmed }) => {
  const [hovered, setHovered] = useState(false);
  const active = !disabled && (selected || hovered);
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => { if (!disabled) { setHovered(true); onHoverChange(true); } }}
      onMouseLeave={() => { setHovered(false); onHoverChange(false); }}
      title={disabled ? 'No disponible en conflictos anteriores a esta versión' : undefined}
      style={{
        padding: '12px 10px', borderRadius: '11px', cursor: disabled ? 'not-allowed' : 'pointer',
        border: `1.5px solid ${active ? `rgba(${accentRgb},0.6)` : 'rgba(255,255,255,0.08)'}`,
        background: active ? `rgba(${accentRgb},0.12)` : 'rgba(15,23,42,0.6)',
        textAlign: 'left', transition: 'all 0.18s ease',
        transform: active ? 'translateY(-1px)' : 'none',
        boxShadow: active ? `0 4px 12px rgba(${accentRgb},0.15)` : 'none',
        width: '100%', opacity: isDimmed ? 0.35 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '7px',
          background: active ? `rgba(${accentRgb},0.22)` : `rgba(${accentRgb},0.08)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.18s', flexShrink: 0,
        }}>
          <i className={`bi bi-${icon}`} style={{ fontSize: '0.78rem', color: `rgba(${accentRgb},1)` }}></i>
        </div>
        <strong style={{ color: active ? '#f1f5f9' : '#94a3b8', fontSize: '0.83rem', transition: 'color 0.18s', lineHeight: 1.2 }}>
          {title}
        </strong>
      </div>
      <div style={{ color: '#475569', fontSize: '0.72rem', lineHeight: 1.4, paddingLeft: '36px' }}>{description}</div>
    </button>
  );
};

// ─── Componente principal ────────────────────────────────────────────────────

const ConflictoModal: React.FC<ConflictoModalProps> = ({ conflict, onClose, onResolved }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<ActionType>(null);
  const [hoveredAction, setHoveredAction] = useState<ActionType>(null);
  const [nombreEdit, setNombreEdit] = useState('');

  // Botón atrás del navegador/sistema cierra el modal (siempre mounted = siempre open)
  useModalBackButton(true, onClose);

  const idOriginal = conflict.persona_db.idPersona;
  const idNuevo = conflict.id_persona_nueva ?? null;
  const nombreOriginal = conflict.persona_db.nombre;
  const nombreNuevo = conflict.nombre_recibido;

  const fechaFormato = new Date(conflict.fechaHora).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  const handleSelectAction = (a: ActionType) => {
    if (a === 'edit_original') setNombreEdit(nombreOriginal);
    else if (a === 'edit_nueva') setNombreEdit(nombreNuevo);
    setAction(a);
  };

  // Hover highlighting:
  // - Sin selección/hover → ambas tarjetas neutras (sin highlight ni dim)
  // - edit_original → resalta original, dim nueva
  // - edit_nueva/delete → resalta nueva, dim original
  const activeAction = hoveredAction ?? action;

  const highlightOriginal = activeAction === 'edit_original';
  const highlightNueva = activeAction === 'edit_nueva' || activeAction === 'delete';
  // dim es lo opuesto al highlight cuando hay una acción activa
  const dimOriginal = !!activeAction && !highlightOriginal;
  const dimNueva = !!activeAction && !highlightNueva;

  const canConfirm =
    action === 'delete' ||
    ((action === 'edit_original' || action === 'edit_nueva') && nombreEdit.trim().length > 0);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (action === 'edit_original') {
        // Editar nombre de la persona original (la más antigua)
        const res = await actualizarNombreConflicto(conflict.idConflicto, { nombre: nombreEdit.trim() });
        if (res.ok) {
          showToast('Nombre de la persona original actualizado', 'success');
          onResolved();
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(`Error: ${err.error || err.detail || 'No se pudo actualizar'}`, 'error');
        }

      } else if (action === 'edit_nueva') {
        // Editar nombre de la persona nueva (PATCH directo a /personas/{id})
        if (!idNuevo) {
          showToast('No se encontró el ID de la persona nueva', 'error');
          return;
        }
        const res = await apiRequest(`/personas/${idNuevo}/`, {
          method: 'PATCH',
          body: JSON.stringify({ nombre: nombreEdit.trim() }),
        });
        if (res.ok) {
          // Marcar el conflicto como resuelto también
          await actualizarNombreConflicto(conflict.idConflicto, { nombre: nombreOriginal });
          showToast('Nombre de la persona nueva actualizado', 'success');
          onResolved();
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(`Error: ${err.error || err.detail || 'No se pudo actualizar'}`, 'error');
        }

      } else if (action === 'delete') {
        // Eliminar el duplicado más reciente
        if (!idNuevo) {
          showToast('No se encontró el ID de la persona a eliminar', 'error');
          return;
        }
        const res = await eliminarDuplicado(conflict.idConflicto, idNuevo);
        if (res.ok) {
          showToast('Duplicado eliminado y conflicto resuelto', 'success');
          onResolved();
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(`Error: ${err.error || err.detail || 'No se pudo eliminar'}`, 'error');
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Error de red al resolver el conflicto', 'error');
    } finally {
      setLoading(false);
    }
  };

  const confirmLabel = () => {
    if (loading) return <><i className="bi bi-hourglass-split me-2"></i>Procesando...</>;
    if (action === 'edit_original' || action === 'edit_nueva') return <><i className="bi bi-check-lg me-2"></i>Guardar nombre</>;
    if (action === 'delete') return <><i className="bi bi-trash me-2"></i>Eliminar duplicado</>;
    return 'Elegí una acción';
  };

  const confirmBg = () => {
    if (!canConfirm) return 'rgba(255,255,255,0.04)';
    if (action === 'delete') return 'linear-gradient(135deg, #dc2626, #ef4444)';
    return 'linear-gradient(135deg, #4f46e5, #6366f1)';
  };

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(5px)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '12px',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px', width: '100%', maxWidth: '540px',
          boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden', maxHeight: '95vh',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(90deg, rgba(239,68,68,0.18) 0%, transparent 100%)',
          borderBottom: '1px solid rgba(239,68,68,0.15)',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="bi bi-people-fill" style={{ color: '#f87171', fontSize: '0.9rem' }}></i>
            </div>
            <div>
              <h4 style={{ margin: 0, color: '#f1f5f9', fontSize: '0.95rem', fontWeight: 700 }}>
                Posible Duplicado
              </h4>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{fechaFormato}</span>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '7px', color: '#64748b', cursor: 'pointer',
            width: '28px', height: '28px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '0.95rem',
          }}>
            <i className="bi bi-x"></i>
          </button>
        </div>

        {/* Body (scrollable) */}
        <div style={{ padding: '18px', overflowY: 'auto', flex: 1 }}>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.6, marginBottom: '16px' }}>
            El lector detectó dos personas con características similares. Compará los registros y decidí qué hacer.
          </p>

          {/* Tarjetas lado a lado */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <CardPersona
              foto={conflict.persona_db.foto}
              nombre={nombreOriginal}
              idPersona={idOriginal}
              accentColor="99,102,241"
              label="Original"
              labelIcon="database"
              badge="Registrada primero"
              isHighlighted={highlightOriginal}
              isDimmed={dimOriginal}
            />
            <CardPersona
              foto={conflict.foto_recibida}
              nombre={nombreNuevo}
              idPersona={idNuevo}
              accentColor="251,191,36"
              label="Nueva"
              labelIcon="cpu"
              badge="Ingresó después"
              isHighlighted={highlightNueva}
              isDimmed={dimNueva}
            />
          </div>

          {/* Separador */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginBottom: '14px' }}></div>

          {/* Acciones — 3 opciones */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              ¿Qué hacemos?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <OptionButton
                selected={action === 'edit_original'}
                onClick={() => handleSelectAction('edit_original')}
                onHoverChange={h => setHoveredAction(h ? 'edit_original' : null)}
                accentRgb="99,102,241"
                icon="pencil-fill"
                isDimmed={hoveredAction !== null && hoveredAction !== 'edit_original'}
                title={`Corregir nombre de la original (ID #${idOriginal})`}
                description="Modificá el nombre de la persona más antigua (la registrada primero en BD)."
              />
              <OptionButton
                selected={action === 'edit_nueva'}
                onClick={() => handleSelectAction('edit_nueva')}
                onHoverChange={h => setHoveredAction(h ? 'edit_nueva' : null)}
                accentRgb="56,189,248"
                icon="pencil"
                isDimmed={hoveredAction !== null && hoveredAction !== 'edit_nueva'}
                title={idNuevo ? `Corregir nombre de la nueva (ID #${idNuevo})` : 'Corregir nombre de la nueva'}
                description="Modificá el nombre de la persona más reciente si el error está en ella."
              />
              <OptionButton
                selected={action === 'delete'}
                onClick={() => handleSelectAction('delete')}
                onHoverChange={h => setHoveredAction(h ? 'delete' : null)}
                accentRgb="239,68,68"
                icon="trash"
                isDimmed={hoveredAction !== null && hoveredAction !== 'delete'}
                title={idNuevo ? `Eliminar duplicado más reciente (ID #${idNuevo})` : 'Eliminar duplicado más reciente'}
                description="Borra permanentemente la persona nueva. La original queda intacta."
              />
            </div>
          </div>

          {/* Input de edición (cuando se corrige un nombre) */}
          {(action === 'edit_original' || action === 'edit_nueva') && (
            <div style={{
              padding: '12px 14px', borderRadius: '11px', marginBottom: '12px',
              background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)',
            }}>
              <div style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 600, marginBottom: '7px' }}>
                <i className="bi bi-pencil me-1"></i>
                {action === 'edit_original'
                  ? `Nuevo nombre para ID #${idOriginal} (original)`
                  : `Nuevo nombre para ID #${idNuevo} (nueva)`}
              </div>
              <input
                value={nombreEdit}
                onChange={e => setNombreEdit(e.target.value)}
                placeholder={action === 'edit_original' ? nombreOriginal : nombreNuevo}
                autoFocus
                style={{
                  width: '100%', background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.35)',
                  borderRadius: '7px', padding: '8px 11px',
                  color: '#f1f5f9', fontSize: '0.88rem', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Confirmación de eliminación */}
          {action === 'delete' && (
            <div style={{
              padding: '10px 14px', borderRadius: '10px', marginBottom: '12px',
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)',
              fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5,
            }}>
              <i className="bi bi-exclamation-triangle me-2" style={{ color: '#f87171' }}></i>
              {idNuevo
                ? <>Se eliminará permanentemente <strong style={{ color: '#fca5a5' }}>ID #{idNuevo}</strong> con todas sus asistencias. La persona original (ID #{idOriginal}) queda intacta.</>
                : 'El conflicto quedará resuelto.'}
            </div>
          )}

          {/* Botones finales */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '9px 16px', borderRadius: '9px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)', color: '#64748b',
                fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm || loading}
              style={{
                padding: '9px 20px', borderRadius: '9px', border: 'none',
                background: confirmBg(),
                color: !canConfirm ? '#475569' : '#fff',
                fontWeight: 600, cursor: (!canConfirm || loading) ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem', transition: 'all 0.2s',
                boxShadow: canConfirm && !loading ? '0 4px 14px rgba(99,102,241,0.3)' : 'none',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {confirmLabel()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictoModal;
