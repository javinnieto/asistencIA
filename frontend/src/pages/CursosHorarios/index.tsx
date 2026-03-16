import React from 'react';
import CursosTab from './CursosTab';
import './CursosHorarios.css';

/**
 * Página de Cursos y Horarios.
 * Días No Laborables se separó a su propia sección (/dias-no-laborables)
 * por ser un concepto de calendario diferente al de gestión de cursos.
 */
const CursosHorarios: React.FC = () => {
    return (
        <div className="ch-main-container">
            <div className="ch-content-box" style={{ borderRadius: '24px' }}>
                <CursosTab />
            </div>
        </div>
    );
};

export default CursosHorarios;
