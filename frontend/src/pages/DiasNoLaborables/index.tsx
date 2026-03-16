import React from 'react';
import DiasNoLaborablesTab from '../CursosHorarios/DiasNoLaborablesTab';
import './DiasNoLaborables.css';

/**
 * Página independiente de Días No Laborables (Feriados).
 * Se separó de "Cursos y Horarios" porque es un concepto de calendario
 * institucional diferente: no gestiona cómo funciona un curso, sino
 * cuándo NO hay actividad, para toda la institución o grupos específicos.
 */
const DiasNoLaborables: React.FC = () => {
    return (
        <div className="dnl-page">
            <div className="dnl-page-header">
                <div className="dnl-page-header-icon">
                    <i className="bi bi-calendar-x-fill"></i>
                </div>
                <div>
                    <h1 className="dnl-page-title">Días No Laborables</h1>
                    <p className="dnl-page-subtitle">Gestioná feriados, excepciones y días sin actividad institucional</p>
                </div>
            </div>

            <div className="dnl-content-box">
                <DiasNoLaborablesTab />
            </div>
        </div>
    );
};

export default DiasNoLaborables;
