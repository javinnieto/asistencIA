import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface ExportButtonProps {
  data?: any[];
  onFetchData?: () => Promise<any[] | { records: any[], summary: any[] }>;
  summaryData?: any[]; // optional summary array of objects to show on top
  filename?: string;
  onExport?: (type: string) => void;
  iconOnly?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ data, onFetchData, summaryData, filename = 'asistencias', onExport, iconOnly = false }) => {
  const [loading, setLoading] = useState(false);

  // Normaliza las propiedades del item, ya que a veces vienen diferentes.
  const formatItem = (item: any) => {
    if (item._isAggregated) {
      const { _isAggregated, ...rest } = item;
      return rest;
    }
    return {
      'Persona': item.persona?.nombre || item.persona || '-',
      'Tipo': item.persona?.curso ? 'Alumno' : item.persona?.nombre?.includes('Prof') ? 'Profesor' : 'Personal',
      'Curso': item.persona?.curso?.nombre || item.horario?.curso?.nombre || '-',
      'Fecha y Hora': item.estado?.nombre === 'Ausente' ? '-' : new Date(item.fechaHora || item.fecha_hora).toLocaleString('es-ES', { hour12: false }),
      'Temperatura': item.estado?.nombre === 'Ausente' ? '-' : `${item.temperatura}°C`,
      'Estado': item.estado?.nombre || '-'
    };
  };

  const exportToExcel = (exportData: any[], exportSummary?: any[]) => {
    try {
      const ws = XLSX.utils.json_to_sheet([]);
      
      const finalSummary = exportSummary || summaryData;

      if (finalSummary && finalSummary.length > 0) {
        // Add summary table at A1
        XLSX.utils.sheet_add_json(ws, finalSummary, { origin: 'A1' });
        // Add one blank row before the records
        const recordsOrigin = finalSummary.length + 2;
        XLSX.utils.sheet_add_json(ws, exportData.map(formatItem), { origin: `A${recordsOrigin}` });
      } else {
        XLSX.utils.sheet_add_json(ws, exportData.map(formatItem), { origin: 'A1' });
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Asistencias');
      
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `${filename}.xlsx`);
      
      onExport?.('excel');
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      onExport?.('error');
    }
  };

  const handleExportClick = async () => {
    setLoading(true);
    try {
      let exportRecords = data || [];
      let exportSummary: any[] | undefined = undefined;

      if (onFetchData) {
        const fetched = await onFetchData();
        if (Array.isArray(fetched)) {
          exportRecords = fetched;
        } else {
          exportRecords = fetched.records || [];
          exportSummary = fetched.summary;
        }
      }

      if (exportRecords.length === 0) {
        alert('No hay datos para exportar.');
        onExport?.('error');
        setLoading(false);
        return;
      }

      exportToExcel(exportRecords, exportSummary);
    } catch (e) {
      console.error(e);
      onExport?.('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={iconOnly ? "btn-icon" : "btn btn-sm d-flex align-items-center gap-2 ExportButton"}
      style={iconOnly ? { 
        color: '#10b981', 
        opacity: loading ? 0.7 : 1, 
        padding:'0',
        minWidth: '24px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      } : {
        borderRadius: '6px',
        fontWeight: 500,
        backgroundColor: '#10b981',
        border: '1px solid rgba(16, 185, 129, 0.5)',
        color: '#fff',
        boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
        padding: '6px 14px',
        transition: 'all 0.2s',
      }}
      type="button"
      title={iconOnly ? "Descargar Excel" : undefined}
      onClick={(e) => { e.stopPropagation(); handleExportClick(); }}
      disabled={loading}
      onMouseOver={(e) => {
        if (!loading && !iconOnly) {
          e.currentTarget.style.backgroundColor = '#059669';
          e.currentTarget.style.transform = 'translateY(-1px)';
        } else if (!loading && iconOnly) {
          e.currentTarget.style.transform = 'scale(1.1)';
        }
      }}
      onMouseOut={(e) => {
        if (!loading && !iconOnly) {
          e.currentTarget.style.backgroundColor = '#10b981';
          e.currentTarget.style.transform = 'translateY(0px)';
        } else if (!loading && iconOnly) {
          e.currentTarget.style.transform = 'scale(1)';
        }
      }}
    >
      {loading ? (
         <i className="bi bi-arrow-repeat" style={{ animation: 'spin 1s linear infinite' }}></i>
      ) : (
         <i className="bi bi-file-earmark-excel-fill"></i>
      )}
      {!iconOnly && !loading && " Descargar Excel"}
      {!iconOnly && loading && " Preparando..."}
    </button>
  );
};

export default ExportButton; 