import React, { useState } from 'react';
import InstitucionesTab from './InstitucionesTab';
import CursosTab from './CursosTab';
import HorariosTab from './HorariosTab';

type TabType = 'instituciones' | 'cursos' | 'horarios';

const CursosHorarios: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('instituciones');

    const tabs: { id: TabType; label: string; icon: string, desc: string }[] = [
        { id: 'instituciones', label: 'Instituciones', icon: '🏢', desc: 'Gestionar escuelas' },
        { id: 'cursos', label: 'Cursos', icon: '📚', desc: 'Gestionar aulas' },
        { id: 'horarios', label: 'Horarios', icon: '📅', desc: 'Gestionar tiempos' },
    ];

    return (
        <div className="ch-main-container">
            {/* Navigation Sections */}
            <div className="ch-tabs-nav">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`ch-tab-button ${isActive ? 'active' : ''}`}
                        >
                            <div className="ch-tab-icon-wrapper">
                                {tab.icon}
                            </div>
                            <div>
                                <div className="ch-tab-label">
                                    {tab.label}
                                </div>
                                <div className="ch-tab-desc">
                                    {tab.desc}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="ch-content-box">
                {activeTab === 'instituciones' && <InstitucionesTab />}
                {activeTab === 'cursos' && <CursosTab />}
                {activeTab === 'horarios' && <HorariosTab />}
            </div>
        </div>
    );
};

export default CursosHorarios;
