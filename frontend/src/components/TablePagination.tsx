import * as React from 'react';
import './TablePagination.css';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (newCount: number) => void;
  perPageOptions?: number[];
  totalItems: number;
}

const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  perPageOptions = [10, 25, 50, 100],
  totalItems
}) => {
  return (
    <div className="table-pagination-wrapper">
      {/* Izquierda: info de registros */}
      <span className="pagination-info-text">
        Mostrando {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–{Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems}
      </span>

      {/* Centro: botones de página */}
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            className="btn-page"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ← Anterior
          </button>
          
          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2))
              .map((page, index, array) => (
                <React.Fragment key={page}>
                  {index > 0 && page - array[index - 1] > 1 && (
                    <span className="pagination-ellipsis">...</span>
                  )}
                  <button
                    className={`btn-page ${page === currentPage ? 'active' : ''}`}
                    onClick={() => onPageChange(page)}
                  >
                    {page}
                  </button>
                </React.Fragment>
            ))}
          </div>
          
          <button
            className="btn-page"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Derecha: selector de items por página, discreto */}
      <div className="per-page-selector">
        <select
          id="perPage"
          value={itemsPerPage}
          onChange={(e) => {
            onItemsPerPageChange(Number(e.target.value));
            onPageChange(1);
          }}
          title="Items por página"
        >
          {perPageOptions.map(opt => (
            <option key={opt} value={opt}>{opt} / pág.</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default TablePagination;
