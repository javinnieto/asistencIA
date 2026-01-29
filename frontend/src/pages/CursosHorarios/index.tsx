import React from 'react';
import CursosTab from './CursosTab';
import './CursosHorarios.css';

const CursosHorarios: React.FC = () => {
    return (
        <div className="ch-main-container">
            {/* Content Area */}
            <div className="ch-content-box" style={{ borderTop: 'none', padding: 0 }}>
                <CursosTab />
            </div>
        </div>
    );
};

export default CursosHorarios;
