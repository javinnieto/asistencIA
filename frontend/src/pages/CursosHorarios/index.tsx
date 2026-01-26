import React, { useState } from 'react';
import InstitucionesTab from './InstitucionesTab';
import CursosTab from './CursosTab';
import HorariosTab from './HorariosTab';

const CursosHorarios: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'instituciones' | 'cursos' | 'horarios'>('instituciones');

    return (
        <div className="p-8 max-w-7xl mx-auto animate-fade-in">
            <header className="mb-8">
                <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Gestión de Cursos y Horarios</h1>
                <p className="text-gray-400">Administra las instituciones, cursos y la asignación de horarios escolares.</p>
            </header>

            {/* Tabs Navigation */}
            <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-700 pb-1">
                <button
                    className={`px-6 py-3 font-medium text-sm transition-all rounded-t-lg relative ${activeTab === 'instituciones'
                        ? 'text-white bg-slate-800 border-t border-x border-slate-700'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    onClick={() => setActiveTab('instituciones')}
                >
                    🏢 Instituciones
                    {activeTab === 'instituciones' && <span className="absolute bottom-[-5px] left-0 w-full h-1 bg-slate-800 z-10"></span>}
                </button>
                <button
                    className={`px-6 py-3 font-medium text-sm transition-all rounded-t-lg relative ${activeTab === 'cursos'
                        ? 'text-white bg-slate-800 border-t border-x border-slate-700'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    onClick={() => setActiveTab('cursos')}
                >
                    📚 Cursos
                    {activeTab === 'cursos' && <span className="absolute bottom-[-5px] left-0 w-full h-1 bg-slate-800 z-10"></span>}
                </button>
                <button
                    className={`px-6 py-3 font-medium text-sm transition-all rounded-t-lg relative ${activeTab === 'horarios'
                        ? 'text-white bg-slate-800 border-t border-x border-slate-700'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    onClick={() => setActiveTab('horarios')}
                >
                    📅 Horarios y Asignaciones
                    {activeTab === 'horarios' && <span className="absolute bottom-[-5px] left-0 w-full h-1 bg-slate-800 z-10"></span>}
                </button>
            </div>

            {/* Content Area */}
            <div className="min-h-[500px] transition-all duration-300 ease-in-out">
                {activeTab === 'instituciones' && <InstitucionesTab />}
                {activeTab === 'cursos' && <CursosTab />}
                {activeTab === 'horarios' && <HorariosTab />}
            </div>
        </div>
    );
};

export default CursosHorarios;
