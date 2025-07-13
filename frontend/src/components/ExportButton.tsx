import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportButtonProps {
  data: any[];
  filename?: string;
  onExport?: (type: string) => void;
}

const ExportButton: React.FC<ExportButtonProps> = ({ data, filename = 'asistencias', onExport }) => {
  const [isOpen, setIsOpen] = useState(false);

  const exportToExcel = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(data.map(item => ({
        'Persona': item.persona.nombre,
        'Tipo': item.persona.curso ? 'Alumno' : item.persona.nombre.includes('Prof') ? 'Profesor' : 'Personal',
        'Curso': item.persona.curso?.nombre || '-',
        'Fecha y Hora': item.estado.nombre === 'Ausente' ? '-' : new Date(item.fecha_hora).toLocaleString('es-ES'),
        'Temperatura': item.estado.nombre === 'Ausente' ? '-' : `${item.temperatura}°C`,
        'Estado': item.estado.nombre
      })));

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

  const exportToCSV = () => {
    try {
      const csvData = data.map(item => ({
        'Persona': item.persona.nombre,
        'Tipo': item.persona.curso ? 'Alumno' : item.persona.nombre.includes('Prof') ? 'Profesor' : 'Personal',
        'Curso': item.persona.curso?.nombre || '-',
        'Fecha y Hora': item.estado.nombre === 'Ausente' ? '-' : new Date(item.fecha_hora).toLocaleString('es-ES'),
        'Temperatura': item.estado.nombre === 'Ausente' ? '-' : `${item.temperatura}°C`,
        'Estado': item.estado.nombre
      }));

      const ws = XLSX.utils.json_to_sheet(csvData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `${filename}.csv`);
      
      onExport?.('csv');
    } catch (error) {
      console.error('Error al exportar a CSV:', error);
      onExport?.('error');
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.text('Reporte de Asistencias', 14, 22);
      
      // Fecha de generación
      doc.setFontSize(10);
      doc.text(`Generado el: ${new Date().toLocaleString('es-ES')}`, 14, 30);
      
      // Tabla
      const tableData = data.map(item => [
        item.persona.nombre,
        item.persona.curso ? 'Alumno' : item.persona.nombre.includes('Prof') ? 'Profesor' : 'Personal',
        item.persona.curso?.nombre || '-',
        item.estado.nombre === 'Ausente' ? '-' : new Date(item.fecha_hora).toLocaleDateString('es-ES'),
        item.estado.nombre === 'Ausente' ? '-' : `${item.temperatura}°C`,
        item.estado.nombre
      ]);

      autoTable(doc, {
        head: [['Persona', 'Tipo', 'Curso', 'Fecha', 'Temperatura', 'Estado']],
        body: tableData,
        startY: 40,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        margin: { top: 40 },
      });
      
      doc.save(`${filename}.pdf`);
      
      onExport?.('pdf');
    } catch (error) {
      console.error('Error al exportar a PDF:', error);
      onExport?.('error');
    }
  };

  return (
    <div className="dropdown">
      <button
        className="btn btn-outline-primary btn-sm dropdown-toggle"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <i className="bi bi-download me-1"></i>Exportar
      </button>
      {isOpen && (
        <div className="dropdown-menu show" style={{ position: 'absolute', zIndex: 1000 }}>
          <button
            className="dropdown-item"
            onClick={() => {
              exportToExcel();
              setIsOpen(false);
            }}
          >
            <i className="bi bi-file-earmark-excel me-2 text-success"></i>
            Exportar a Excel (.xlsx)
          </button>
          <button
            className="dropdown-item"
            onClick={() => {
              exportToCSV();
              setIsOpen(false);
            }}
          >
            <i className="bi bi-file-earmark-text me-2 text-info"></i>
            Exportar a CSV (.csv)
          </button>
          <button
            className="dropdown-item"
            onClick={() => {
              exportToPDF();
              setIsOpen(false);
            }}
          >
            <i className="bi bi-file-earmark-pdf me-2 text-danger"></i>
            Exportar a PDF (.pdf)
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButton; 