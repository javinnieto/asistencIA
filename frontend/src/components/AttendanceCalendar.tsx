import React, { useState, useEffect, useRef } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useNavigate } from 'react-router-dom';

interface Asistencia {
  idAsistencia: number;
  persona: { idPersona: number; nombre: string; curso: { idCurso: number; nombre: string } | null };
  fecha_hora: string;
  temperatura: number;
  estado: { idEstadoAsistencia: number; nombre: string };
}

interface AttendanceCalendarProps {
  onDateSelect?: (date: Date) => void;
}

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ onDateSelect }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendanceData, setAttendanceData] = useState<{ [key: string]: { presentes: number; ausentes: number } }>({});
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState<string>('month');
  const navigate = useNavigate();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; date: Date | null } | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    type: '',
    level: '',
    courses: '',
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [addTaskMode, setAddTaskMode] = useState(false);
  const [highlightedDay, setHighlightedDay] = useState<Date | null>(null);
  const [tasks, setTasks] = useState<Array<{
    date: string; // YYYY-MM-DD (día asignado)
    title: string;
    description: string;
    type: string;
    courses: string;
    createdAt: string; // fecha y hora de creación
  }>>([]);

  // Función para obtener datos de asistencias para un rango de fechas
  const fetchAttendanceData = async (startDate: Date, endDate: Date) => {
    setLoading(true);
    const token = localStorage.getItem('accessToken');
    
    try {
      const startStr = startDate.toISOString().slice(0, 10);
      const endStr = endDate.toISOString().slice(0, 10);
      
      const response = await fetch(`/api/asistencias/?fecha_hora__date__gte=${startStr}&fecha_hora__date__lte=${endStr}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('accessToken');
          navigate('/login');
          return;
        }
        throw new Error('Error al obtener datos de asistencias');
      }

      const data = await response.json();
      const asistencias = data.results || [];

      // Procesar datos por fecha
      const processedData: { [key: string]: { presentes: number; ausentes: number } } = {};
      
      asistencias.forEach((asistencia: Asistencia) => {
        const fecha = asistencia.fecha_hora.split('T')[0]; // YYYY-MM-DD
        if (!processedData[fecha]) {
          processedData[fecha] = { presentes: 0, ausentes: 0 };
        }
        
        if (asistencia.estado.nombre === 'Presente') {
          processedData[fecha].presentes++;
        } else if (asistencia.estado.nombre === 'Ausente') {
          processedData[fecha].ausentes++;
        }
      });

      setAttendanceData(processedData);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos del mes actual al montar el componente
  useEffect(() => {
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    fetchAttendanceData(firstDayOfMonth, lastDayOfMonth);
  }, [navigate]);

  // Cargar datos cuando cambie la vista a mes
  useEffect(() => {
    if (currentView === 'month') {
      const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const lastDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      
      fetchAttendanceData(firstDayOfMonth, lastDayOfMonth);
    }
  }, [currentView, selectedDate]);

  // Cerrar menú contextual al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setContextMenu(null);
        setShowTaskForm(false);
      }
    };
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu]);

  // Función para manejar cambio de mes en el calendario
  const handleActiveStartDateChange = ({ activeStartDate, view }: { activeStartDate: Date | null; view: string }) => {
    if (activeStartDate && view === 'month') {
      const firstDayOfMonth = new Date(activeStartDate.getFullYear(), activeStartDate.getMonth(), 1);
      const lastDayOfMonth = new Date(activeStartDate.getFullYear(), activeStartDate.getMonth() + 1, 0);
      
      fetchAttendanceData(firstDayOfMonth, lastDayOfMonth);
    }
  };

  // Función para renderizar el contenido de cada día
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;

    const dateStr = date.toISOString().slice(0, 10);
    const dayData = attendanceData[dateStr];

    if (!dayData) return null;

    const total = dayData.presentes + dayData.ausentes;
    if (total === 0) return null;

    return (
      <div className="calendar-day-content">
        <div className="attendance-indicator">
          {dayData.presentes > 0 && (
            <div className="presente-dot" title={`${dayData.presentes} presentes`}></div>
          )}
          {dayData.ausentes > 0 && (
            <div className="ausente-dot" title={`${dayData.ausentes} ausentes`}></div>
          )}
        </div>
        <div className="attendance-count">{total}</div>
      </div>
    );
  };

  // Función para manejar clic en un día (usada por onClickDay)
  const handleDayClick = (value: Date, event: React.MouseEvent) => {
    setSelectedDate(value);
    setSelectedDay(value);
    setContextMenu({ x: event.clientX, y: event.clientY, date: value });
    if (onDateSelect) {
      onDateSelect(value);
    }
  };

  // Función para manejar la vista del calendario
  const handleViewChange = ({ view }: { view: string }) => {
    setCurrentView(view);
  };

  // Función para activar el modo agregar tarea
  const handleStartAddTask = () => {
    setAddTaskMode(true);
    setShowTaskForm(false);
    setHighlightedDay(null);
  };

  // Función para seleccionar un día en modo agregar tarea
  const handleAddTaskDayClick = (date: Date) => {
    setHighlightedDay(date);
    setShowTaskForm(true);
    setSelectedDay(date);
  };

  // Función para guardar la tarea
  const handleSaveTask = () => {
    if (!selectedDay) return;
    setTasks([
      ...tasks,
      {
        date: selectedDay.toISOString().slice(0, 10),
        title: taskFormData.title,
        description: taskFormData.description,
        type: taskFormData.type,
        courses: taskFormData.courses,
        createdAt: new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
      },
    ]);
    setShowTaskForm(false);
    setAddTaskMode(false);
    setHighlightedDay(null);
    setTaskFormData({ title: '', description: '', type: '', level: '', courses: '' });
  };

  // Función para borrar una tarea
  const handleDeleteTask = (idx: number) => {
    setTasks(tasks => tasks.filter((_, i) => i !== idx));
  };

  // Función para cancelar el formulario de tarea
  const handleCancelTask = () => {
    setShowTaskForm(false);
    setAddTaskMode(false);
    setHighlightedDay(null);
    setTaskFormData({ title: '', description: '', type: '', level: '', courses: '' });
  };

  // Modificar tileClassName para highlight de días
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    const dateStr = date.toISOString().slice(0, 10);
    // Highlight todos los días SOLO si está en modo agregar tarea y aún no se eligió un día ni está abierto el formulario
    if (addTaskMode && !highlightedDay && !showTaskForm) return 'calendar-task-selectable';
    // Highlight SOLO el día seleccionado mientras el formulario está abierto
    if (addTaskMode && highlightedDay && showTaskForm) {
      if (dateStr === highlightedDay.toISOString().slice(0, 10)) return 'calendar-task-selected';
      return null;
    }
    // Punto azul si hay tarea
    if (tasks.some(t => t.date === dateStr)) return 'calendar-task-has-task';
    // Clase basada en la proporción de asistencias
    const dayData = attendanceData[dateStr];
    if (!dayData) return null;
    const total = dayData.presentes + dayData.ausentes;
    if (total === 0) return null;
    const attendanceRate = dayData.presentes / total;
    if (attendanceRate >= 0.8) return 'high-attendance';
    if (attendanceRate >= 0.6) return 'medium-attendance';
    return 'low-attendance';
  };

  // onChange seguro para el calendario
  const handleCalendarChange = (value: Date | Date[] | null, _event?: any) => {
    if (value instanceof Date) {
      setSelectedDate(value);
    }
  };

  // Modificar onClickDay según modo
  const handleCalendarDayClick = (date: Date, event: React.MouseEvent) => {
    // Si el formulario está abierto, ignorar clicks en otros días
    if (showTaskForm) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (addTaskMode) {
      handleAddTaskDayClick(date);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  };

  return (
    <div className="attendance-calendar-container" ref={calendarRef}>
      <div className="calendar-header mb-3">
        <h5 className="mb-2">
          <i className="bi bi-calendar3 me-2"></i>
          Calendario de actividades
        </h5>
        <div className="calendar-legend d-flex gap-3 mb-2">
          <div className="legend-item d-flex align-items-center">
            <div className="presente-dot me-1"></div>
            <small>Presentes</small>
          </div>
          <div className="legend-item d-flex align-items-center">
            <div className="ausente-dot me-1"></div>
            <small>Ausentes</small>
          </div>
          <div className="legend-item d-flex align-items-center">
            <div className="high-attendance me-1"></div>
            <small>Alta asistencia</small>
          </div>
          <div className="legend-item d-flex align-items-center">
            <div className="low-attendance me-1"></div>
            <small>Baja asistencia</small>
          </div>
        </div>
      </div>
      
      <div className="calendar-wrapper">
        <div className="d-flex justify-content-end mb-2">
          <button className="btn btn-info" onClick={handleStartAddTask} disabled={addTaskMode}>
            <i className="bi bi-plus-circle me-2"></i>Agregar tarea
          </button>
        </div>
        {loading && (
          <div className="calendar-loading">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
          </div>
        )}
        

        
        <Calendar
          onChange={handleCalendarChange as any}
          onClickDay={handleCalendarDayClick}
          value={selectedDate}
          onActiveStartDateChange={handleActiveStartDateChange}
          onViewChange={handleViewChange}
          tileContent={tileContent}
          tileClassName={tileClassName}
          className="attendance-calendar"
          maxDate={new Date(2030, 11, 31)}
          minDate={new Date(2020, 0, 1)}
          locale="es-ES"
          showNavigation={true}
          showNeighboringMonth={true}
          selectRange={false}
          view={currentView as any}
        />
      </div>
      


      {/* Renderizar menú contextual */}
      {contextMenu && (
        <div
          className="calendar-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x, position: 'fixed', zIndex: 9999 }}
        >
          <button
            className="btn btn-sm btn-primary w-100"
            onClick={() => {
              setShowTaskForm(true);
              setContextMenu(null);
            }}
          >
            Agregar Tarea
          </button>
        </div>
      )}

      {/* Formulario para agregar tarea (igual que antes, pero submit llama a handleSaveTask) */}
      {showTaskForm && (
        <div className="calendar-task-form-modal">
          <div className="calendar-task-form">
            <h5>Agregar Tarea</h5>
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSaveTask();
              }}
            >
              <div className="mb-2">
                <label className="form-label">Título</label>
                <input
                  className="form-control"
                  value={taskFormData.title}
                  onChange={e => setTaskFormData({ ...taskFormData, title: e.target.value })}
                  required
                />
              </div>
              <div className="mb-2">
                <label className="form-label">Descripción</label>
                <textarea
                  className="form-control"
                  value={taskFormData.description}
                  onChange={e => setTaskFormData({ ...taskFormData, description: e.target.value })}
                  rows={3}
                  required
                />
              </div>
              <div className="mb-2">
                <label className="form-label">Tipo de actividad</label>
                <select
                  className="form-select"
                  value={taskFormData.type}
                  onChange={e => setTaskFormData({ ...taskFormData, type: e.target.value, level: '', courses: '' })}
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="administrativa">Administrativa</option>
                  <option value="profesores">Para profesores</option>
                  <option value="directores">Para directores</option>
                  <option value="alumnos_secundaria">Alumnos (Secundaria)</option>
                  <option value="alumnos_primaria">Alumnos (Primaria)</option>
                  <option value="recordatorio">Recordatorio</option>
                </select>
              </div>
              {/* Si es alumnos, mostrar cursos */}
              {taskFormData.type === 'alumnos_secundaria' && (
                <div className="mb-2">
                  <label className="form-label">Cursos (Secundaria)</label>
                  <input
                    className="form-control"
                    value={taskFormData.courses}
                    onChange={e => setTaskFormData({ ...taskFormData, courses: e.target.value })}
                    placeholder="Ej: 1°A, 2°B, 3°A..."
                    required
                  />
                </div>
              )}
              {taskFormData.type === 'alumnos_primaria' && (
                <div className="mb-2">
                  <label className="form-label">Cursos (Primaria)</label>
                  <input
                    className="form-control"
                    value={taskFormData.courses}
                    onChange={e => setTaskFormData({ ...taskFormData, courses: e.target.value })}
                    placeholder="Ej: 1°, 2°, 3°..."
                    required
                  />
                </div>
              )}
              <div className="d-flex gap-2 justify-content-end mt-3">
                <button type="button" className="btn btn-secondary" onClick={handleCancelTask}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de tareas */}
      {tasks.length > 0 && (
        <div className="calendar-task-list mt-4">
          <h6 className="mb-2"><i className="bi bi-list-task me-2"></i>Tareas</h6>
          <ul className="list-group">
            {tasks.map((task, idx) => (
              <li className="list-group-item bg-dark text-light mb-2 d-flex justify-content-between align-items-start" key={idx}>
                <div>
                  <div className="fw-bold">{task.title} <span className="badge bg-primary ms-2">{task.type}</span></div>
                  <div className="small text-muted">Día asignado: {task.date}</div>
                  <div className="small text-info">Creada el: {task.createdAt}</div>
                  <div>{task.description}</div>
                  {task.courses && <div className="small">Cursos: {task.courses}</div>}
                </div>
                <button className="btn btn-sm btn-danger ms-3 mt-2" title="Borrar tarea" onClick={() => handleDeleteTask(idx)}>
                  <i className="bi bi-trash"></i>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AttendanceCalendar; 