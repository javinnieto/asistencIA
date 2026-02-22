import React, { useState } from 'react';
import CursosTab from './CursosTab';
import DiasNoLaborablesTab from './DiasNoLaborablesTab';
import './CursosHorarios.css';

const CursosHorarios: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'cursos' | 'diasNoLaborables'>('cursos');

    return (
        <div className="ch-main-container">
            {/* Tabs Navigation - uses existing ch-tabs-nav pattern */}
            <nav className="ch-tabs-nav">
                <button
                    className={`ch-tab-button ${activeTab === 'cursos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cursos')}
                >
                    <div className="ch-tab-icon-wrapper">
                        <i className="bi bi-book"></i>
                    </div>
                    <div>
                        <div className="ch-tab-label">Cursos y Horarios</div>
                        <div className="ch-tab-desc">Gestionar cursos y sus horarios</div>
                    </div>
                </button>
                <button
                    className={`ch-tab-button ${activeTab === 'diasNoLaborables' ? 'active' : ''}`}
                    onClick={() => setActiveTab('diasNoLaborables')}
                >
                    <div className="ch-tab-icon-wrapper">
                        <i className="bi bi-calendar-x"></i>
                    </div>
                    <div>
                        <div className="ch-tab-label">Días No Laborables</div>
                        <div className="ch-tab-desc">Feriados y excepciones</div>
                    </div>
                </button>
            </nav>

            {/* Content Area */}
            <div className="ch-content-box">
                {activeTab === 'cursos' && <CursosTab />}
                {activeTab === 'diasNoLaborables' && <DiasNoLaborablesTab />}
            </div>
        </div>
    );
};

export default CursosHorarios;
