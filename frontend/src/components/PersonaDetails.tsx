import React from 'react';
import ReactDOM from 'react-dom';
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

  const modalContent = (
    <div className="persona-details-overlay" onClick={onClose}>
      <div className="persona-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="persona-details-header">
          <h2>Detalles de la Persona</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="persona-details-content">
          <div className="details-main-section">
            <div className="details-photo-section">
              <div className="details-photo-container">
                {person.foto ? (
                  <img src={person.foto} alt={`${person.nombre} ${person.apellido}`} />
                ) : (
                  <div className="details-photo-placeholder">
                    <span style={{ fontSize: '48px' }}>👤</span>
                  </div>
                )}
              </div>
              <span className={`details-status-badge ${person.estado}`}>
                {person.estado === 'activo' ? '✓ Activo' : '✗ Inactivo'}
              </span>
            </div>

            <div className="details-info-section">
              <h3 className="details-name">{person.nombre} {person.apellido}</h3>
              <p className="details-id">ID: {person.id}</p>

              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">📧 Email</span>
                  <div className="detail-value">{person.email}</div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">📞 Teléfono</span>
                  <div className="detail-value">{person.telefono}</div>
                </div>
                <div className="detail-item">
                  <span className="detail-label">📅 Fecha de Ingreso</span>
                  <div className="detail-value">{person.fechaIngreso}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="details-roles-section">
            <h4 className="roles-section-title">🏢 Roles e Instituciones</h4>
            <div className="roles-list">
              {person.roles && person.roles.length > 0 ? (
                person.roles.map((role, idx) => (
                  <div key={idx} className="details-role-item">
                    <div className="role-item-main">
                      <span className="role-institucion">{role.institucion?.nombre}</span>
                      <span className="role-tipo">{role.tipo?.nombre}</span>
                    </div>
                    {role.curso && (
                      <span className="role-curso-badge">{role.curso.nombre}</span>
                    )}
                  </div>
                ))
              ) : (
                <em className="no-roles">Sin roles asignados</em>
              )}
            </div>
          </div>

          <div className="details-actions">
            <button className="btn-edit-details" onClick={handleEdit}>
              ✏️ Editar Información
            </button>
            <button className="btn-close-details" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default PersonaDetails;