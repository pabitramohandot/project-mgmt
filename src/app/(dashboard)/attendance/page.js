'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Coffee, 
  UserCheck, 
  TrendingUp, 
  MapPin, 
  FileSpreadsheet, 
  ChevronLeft, 
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';
import ClockInWidget from '@/components/ClockInWidget';

export default function AttendancePage() {
  const { showToast } = useNotification();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/attendance');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load attendance logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Generate calendar days for current month view
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // Sunday=0, Monday=1 etc
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Fill empty days before first day of month
    // Aligning to start on Monday or Sunday (standard Sunday start here)
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= totalDays; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getAttendanceForDay = (day) => {
    if (!day) return null;
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const checkDateStr = `${year}-${month}-${dayStr}`;
    return history.find(h => h.date === checkDateStr);
  };

  const formatHours = (minutes) => {
    if (!minutes) return '0 hrs';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins} mins`;
    return `${hrs}h ${mins}m`;
  };

  const days = getDaysInMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const yearNum = currentDate.getFullYear();

  // Summary Metrics calculations
  const totalPresent = history.filter(h => h.status === 'Present').length;
  const totalHalfDays = history.filter(h => h.status === 'Half-day').length;
  const totalLeaves = history.filter(h => h.status === 'On Leave').length;
  const totalWorkedMins = history.reduce((sum, h) => sum + (h.totalWorkMinutes || 0), 0);

  return (
    <div className="attendance-page-container">
      <div className="attendance-header">
        <div>
          <h1 className="page-title-text">Attendance & Timesheet</h1>
          <p className="page-subtitle-text">Keep track of your daily logs, breaks, and monthly timesheet summary.</p>
        </div>
      </div>

      {/* Clock Widget embedded directly */}
      <ClockInWidget />

      {/* Overview Cards */}
      <div className="metrics-grid">
        <div className="metric-card-premium">
          <div className="metric-card-icon green">
            <UserCheck size={18} />
          </div>
          <div className="metric-card-content">
            <span className="metric-title">Days Present</span>
            <span className="metric-value">{totalPresent}</span>
          </div>
        </div>

        <div className="metric-card-premium">
          <div className="metric-card-icon orange">
            <Clock size={18} />
          </div>
          <div className="metric-card-content">
            <span className="metric-title">Half Days</span>
            <span className="metric-value">{totalHalfDays}</span>
          </div>
        </div>

        <div className="metric-card-premium">
          <div className="metric-card-icon blue">
            <CalendarIcon size={18} />
          </div>
          <div className="metric-card-content">
            <span className="metric-title">Leaves Taken</span>
            <span className="metric-value">{totalLeaves}</span>
          </div>
        </div>

        <div className="metric-card-premium">
          <div className="metric-card-icon purple">
            <TrendingUp size={18} />
          </div>
          <div className="metric-card-content">
            <span className="metric-title">Total Hours worked</span>
            <span className="metric-value">{formatHours(totalWorkedMins)}</span>
          </div>
        </div>
      </div>

      <div className="attendance-grid-layout">
        {/* Calendar View */}
        <div className="attendance-glass-card">
          <div className="calendar-header-row">
            <h3 className="calendar-title">
              <CalendarIcon size={16} />
              <span>Monthly Calendar</span>
            </h3>
            <div className="calendar-nav-buttons">
              <button className="nav-btn" onClick={handlePrevMonth}><ChevronLeft size={16} /></button>
              <span className="month-year-label">{monthName} {yearNum}</span>
              <button className="nav-btn" onClick={handleNextMonth}><ChevronRight size={16} /></button>
            </div>
          </div>

          <div className="calendar-body">
            <div className="weekday-header">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="weekday">{d}</div>
              ))}
            </div>
            <div className="days-grid">
              {days.map((day, idx) => {
                const log = getAttendanceForDay(day);
                let dayClass = 'day-cell';
                if (!day) dayClass += ' empty';
                
                let dotColor = null;
                if (log) {
                  if (log.status === 'Present') dotColor = '#10b981';
                  else if (log.status === 'Half-day') dotColor = '#f59e0b';
                  else if (log.status === 'On Leave') dotColor = '#3b82f6';
                  else if (log.status === 'Absent') dotColor = '#ef4444';
                }

                return (
                  <div key={idx} className={dayClass}>
                    {day && <span className="day-number">{day}</span>}
                    {dotColor && (
                      <span className="status-dot-calendar" style={{ backgroundColor: dotColor }}></span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="calendar-legend">
            <div className="legend-item"><span className="legend-color-dot present"></span><span>Present</span></div>
            <div className="legend-item"><span className="legend-color-dot halfday"></span><span>Half-day</span></div>
            <div className="legend-item"><span className="legend-color-dot leave"></span><span>Leave</span></div>
            <div className="legend-item"><span className="legend-color-dot absent"></span><span>Absent</span></div>
          </div>
        </div>

        {/* Detailed Logs List */}
        <div className="attendance-glass-card logs-panel">
          <h3 className="calendar-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
            <FileSpreadsheet size={16} />
            <span>Clocking History Logs</span>
          </h3>

          <div className="logs-scroller">
            {loading ? (
              <div className="loader-box">
                <Loader2 className="animate-spin" size={24} />
              </div>
            ) : history.length === 0 ? (
              <div className="empty-logs">No clock logs found yet. Clock in to get started!</div>
            ) : (
              <div className="logs-list">
                {history.map((log) => (
                  <div key={log._id} className="log-row-premium">
                    <div className="log-date-col">
                      <span className="log-day-name">{new Date(log.clockIn).toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                      <span className="log-day-date">{new Date(log.clockIn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                    </div>

                    <div className="log-times">
                      <div className="time-entry">
                        <span className="label">IN</span>
                        <span className="value">{new Date(log.clockIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="time-entry">
                        <span className="label">OUT</span>
                        <span className="value">
                          {log.clockOut 
                            ? new Date(log.clockOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) 
                            : '—'
                          }
                        </span>
                      </div>
                    </div>

                    <div className="log-metrics">
                      <div className="metric">
                        <span className="label">WORKED</span>
                        <span className="value">{formatHours(log.totalWorkMinutes)}</span>
                      </div>
                      {log.totalBreakMinutes > 0 && (
                        <div className="metric">
                          <span className="label">BREAK</span>
                          <span className="value">{log.totalBreakMinutes}m</span>
                        </div>
                      )}
                    </div>

                    <div className="log-status">
                      <span className={`status-badge-premium ${log.status.toLowerCase().replace(' ', '')}`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .attendance-page-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
        }
        .attendance-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .page-title-text {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
          letter-spacing: -0.02em;
        }
        .page-subtitle-text {
          font-size: 0.82rem;
          color: var(--text-secondary);
          margin: 0.2rem 0 0 0;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem;
        }
        @media (max-width: 1024px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }
        }
        .metric-card-premium {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.2s;
        }
        .metric-card-premium:hover {
          transform: translateY(-2px);
          border-color: var(--accent-primary-glow);
        }
        .metric-card-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .metric-card-icon.green { background: rgba(16, 185, 129, 0.08); color: #10b981; }
        .metric-card-icon.orange { background: rgba(245, 158, 11, 0.08); color: #f59e0b; }
        .metric-card-icon.blue { background: rgba(59, 130, 246, 0.08); color: #3b82f6; }
        .metric-card-icon.purple { background: rgba(168, 85, 247, 0.08); color: #a855f7; }
        
        .metric-card-content {
          display: flex;
          flex-direction: column;
        }
        .metric-title {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .metric-value {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.2;
          margin-top: 2px;
        }

        .attendance-grid-layout {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 1.5rem;
        }
        @media (max-width: 1024px) {
          .attendance-grid-layout {
            grid-template-columns: 1fr;
          }
        }
        
        .attendance-glass-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .calendar-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.75rem;
        }
        .calendar-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .calendar-nav-buttons {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .nav-btn {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .nav-btn:hover {
          color: var(--text-primary);
          border-color: var(--accent-primary);
        }
        .month-year-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
          min-width: 110px;
          text-align: center;
        }

        .calendar-body {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .weekday-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }
        .day-cell {
          aspect-ratio: 1;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-primary);
          position: relative;
        }
        .day-cell.empty {
          background: transparent;
          border-color: transparent;
        }
        .status-dot-calendar {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          display: block;
          margin-bottom: 2px;
        }
        .calendar-legend {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
          margin-top: 0.5rem;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .legend-color-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
        }
        .legend-color-dot.present { background: #10b981; }
        .legend-color-dot.halfday { background: #f59e0b; }
        .legend-color-dot.leave { background: #3b82f6; }
        .legend-color-dot.absent { background: #ef4444; }

        .logs-panel {
          max-height: 480px;
        }
        .logs-scroller {
          overflow-y: auto;
          flex: 1;
          padding-right: 4px;
        }
        .logs-scroller::-webkit-scrollbar {
          width: 4px;
        }
        .logs-scroller::-webkit-scrollbar-thumb {
          background: var(--border-color-hover);
          border-radius: 4px;
        }
        .empty-logs {
          padding: 4rem 1rem;
          text-align: center;
          font-size: 0.82rem;
          color: var(--text-muted);
        }
        .loader-box {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem 0;
          color: var(--accent-primary);
        }
        .logs-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .log-row-premium {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          gap: 1rem;
          transition: all 0.2s;
        }
        .log-row-premium:hover {
          border-color: var(--accent-primary-glow);
          background: rgba(255, 255, 255, 0.02);
        }
        .log-date-col {
          display: flex;
          flex-direction: column;
          min-width: 60px;
        }
        .log-day-name {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .log-day-date {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        
        .log-times {
          display: flex;
          gap: 1.25rem;
        }
        .time-entry {
          display: flex;
          flex-direction: column;
        }
        .time-entry .label {
          font-size: 0.62rem;
          font-weight: 700;
          color: var(--text-muted);
        }
        .time-entry .value {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .log-metrics {
          display: flex;
          gap: 1.25rem;
        }
        .log-metrics .metric {
          display: flex;
          flex-direction: column;
        }
        .log-metrics .metric .label {
          font-size: 0.62rem;
          font-weight: 700;
          color: var(--text-muted);
        }
        .log-metrics .metric .value {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .status-badge-premium {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          display: inline-block;
          text-align: center;
        }
        .status-badge-premium.present { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .status-badge-premium.half-day { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        .status-badge-premium.onleave { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        .status-badge-premium.absent { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
      `}</style>
    </div>
  );
}
