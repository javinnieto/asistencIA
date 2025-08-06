import React from 'react';
import './PersonaDetails.css';

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
        <div className="persona-details-header">
          <h2 className="persona-details-title">Detalles de la Persona</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="persona-details-content">
          <div className="persona-info-grid">
            <div className="persona-photo-section">
              {person.foto ? (
                <img 
                  src={person.foto} 
                  alt={`${person.nombre} ${person.apellido}`}
                  className="persona-photo"
                />
              ) : (
                <div className="persona-photo-placeholder">
                  👤
                </div>
              )}
              <h3 className="persona-name">{person.nombre} {person.apellido}</h3>
              <p className="persona-role">{person.cargo}</p>
            </div>
            
            <div className="persona-details-list">
              <div className="detail-item">
                <span className="detail-label">Email</span>
                <div className="detail-value">{person.email}</div>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Teléfono</span>
                <div className="detail-value">{person.telefono}</div>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Departamento</span>
                <div className="detail-value">
                  <span className="detail-badge department-badge">{person.departamento}</span>
                </div>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Cargo</span>
                <div className="detail-value">{person.cargo}</div>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Fecha de Ingreso</span>
                <div className="detail-value">
                  {new Date(person.fechaIngreso).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
              
              <div className="detail-item">
                <span className="detail-label">Estado</span>
                <div className="detail-value">
                  <span className={`detail-badge ${person.estado}`}>
                    {person.estado === 'activo' ? '✅ Activo' : '❌ Inactivo'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="persona-actions">
            <button className="action-btn primary" onClick={handleEdit}>
              ✏️ Editar Persona
            </button>
            <button className="action-btn secondary" onClick={onClose}>
              ✕ Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonaDetails; 