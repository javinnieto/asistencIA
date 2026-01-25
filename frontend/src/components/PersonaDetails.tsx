import React from 'react';
import './PersonaDetails.css';

// Iconos
const FaUser = () => <span>👤</span>;
const FaEnvelope = () => <span>📧</span>;
const FaPhone = () => <span>📞</span>;
const FaBuilding = () => <span>🏢</span>;
const FaCalendar = () => <span>📅</span>;
const FaTimes = () => <span>❌</span>;
const FaEdit = () => <span>✏️</span>;

interface Person {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  departamento: string;
  cargo: string;
  fechaIngreso: string;
  estado: 'activo' | 'inactivo';
  foto?: string;
  roles?: any[];
}

interface PersonaDetailsProps {
  person: Person;
  onClose: () => void;
  onEdit: (person: Person) => void;
}

const PersonaDetails: React.FC<PersonaDetailsProps> = ({ person, onClose, onEdit }) => {
  const handleEdit = () => {
    onEdit(person);
    onClose();
  };

  return (
    <div className="persona-details-overlay" onClick={onClose}>
      <div className="persona-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="persona-details-header" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '16px 16px 0 0',
          position: 'relative'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Detalles de la Persona</h2>
          <button className="close-button" style={{
            position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer', width: '32px', height: '32px'
          }} onClick={onClose}><FaTimes /></button>
        </div>

        <div className="persona-details-content" style={{ padding: '25px' }}>
          <div style={{ display: 'flex', gap: '25px', marginBottom: '25px' }}>
            <div className="persona-photo-section" style={{ flex: '0 0 auto', textAlign: 'center' }}>
              <div className="persona-photo-container" style={{
                width: '120px', height: '120px', borderRadius: '16px', overflow: 'hidden', border: '4px solid #f0f4ff', boxShadow: '0 10px 20px rgba(102,126,234,0.15)', marginBottom: '10px'
              }}>
                {person.foto ? (
                  <img src={person.foto} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontSize: '40px' }}><FaUser /></div>
                )}
              </div>
              <span style={{
                display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase',
                background: person.estado === 'activo' ? '#ecfdf5' : '#fef2f2',
                color: person.estado === 'activo' ? '#059669' : '#dc2626'
              }}>
                {person.estado === 'activo' ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '24px', color: '#1e293b' }}>{person.nombre} {person.apellido}</h3>
              <p style={{ margin: '0 0 15px 0', color: '#64748b', fontSize: '14px' }}>ID: {person.id}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="detail-item">
                  <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}><FaEnvelope /> Email</span>
                  <div style={{ fontSize: '14px', color: '#334155' }}>{person.email}</div>
                </div>
                <div className="detail-item">
                  <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}><FaPhone /> Teléfono</span>
                  <div style={{ fontSize: '14px', color: '#334155' }}>{person.telefono}</div>
                </div>
                <div className="detail-item">
                  <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}><FaCalendar /> Ingreso</span>
                  <div style={{ fontSize: '14px', color: '#334155' }}>{person.fechaIngreso}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#667eea', display: 'flex', alignItems: 'center', gap: '8px' }}><FaBuilding /> Roles e Instituciones</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {person.roles && person.roles.length > 0 ? person.roles.map((role: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', background: 'white', borderRadius: '8px', border: '1px solid #edf2f7' }}>
                  <span style={{ fontWeight: '600', color: '#475569' }}>{role.institucion?.nombre}</span>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>{role.tipo?.nombre}</span>
                    {role.curso && <span style={{ fontSize: '13px', background: '#eef2ff', color: '#667eea', padding: '2px 8px', borderRadius: '6px', fontWeight: '500' }}>{role.curso.nombre}</span>}
                  </div>
                </div>
              )) : (
                <em style={{ color: '#94a3b8', fontSize: '13px' }}>Sin roles asignados</em>
              )}
            </div>
          </div>

          <div className="persona-actions" style={{ marginTop: '25px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="btn-save" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handleEdit}>
              <FaEdit /> Editar Información
            </button>
            <button className="btn-cancel" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonaDetails; 