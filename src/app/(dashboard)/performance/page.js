'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  ChevronRight,
  Zap,
  Users,
  Briefcase
} from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function PerformancePage() {
  const { showToast } = useNotification();
  const [stats, setStats] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load task counts and details
        const dashboardRes = await fetch('/api/dashboard');
        let dashboardData = {};
        if (dashboardRes.ok) {
          dashboardData = await resToJSON(dashboardRes);
        }

        // Load attendance history
        const attendanceRes = await fetch('/api/attendance');
        let attendanceData = [];
        if (attendanceRes.ok) {
          const body = await resToJSON(attendanceRes);
          attendanceData = body.history || [];
        }

        setStats(dashboardData);
        setAttendanceLogs(attendanceData);
      } catch (e) {
        console.error(e);
        showToast('Error loading performance stats', 'error');
      } finally {
        setLoading(false);
      }
    }

    async function resToJSON(res) {
      return res.json();
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--accent-primary)' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'currentColor', borderRadius: '50%' }}></div>
      </div>
    );
  }

  // Calculate metrics based on statistics and logs
  const tasks = stats?.tasks || [];
  const completedTasks = tasks.filter(t => t.completed || t.status === 'Completed').length;
  const totalTasksCount = tasks.length;
  const completionRate = totalTasksCount > 0 ? Math.round((completedTasks / totalTasksCount) * 100) : 0;

  // Streak calculations from attendance
  let currentStreak = 0;
  let activeStreak = true;
  const sortedAttendance = [...attendanceLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Calculate streaks: contiguous days with clock-ins
  const todayStr = new Date().toISOString().split('T')[0];
  let checkDate = new Date();
  
  for (let i = 0; i < 30; i++) {
    const formattedDate = checkDate.toISOString().split('T')[0];
    const log = attendanceLogs.find(l => l.date === formattedDate);
    if (log) {
      currentStreak++;
    } else {
      // Allow exception for today if not checked in yet
      if (formattedDate !== todayStr || currentStreak > 0) {
        break;
      }
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Calculate total tracked hours on tasks
  const totalTaskMinutes = tasks.reduce((sum, t) => sum + (t.totalTimeSpent || 0), 0);
  const totalTaskHours = Math.round(totalTaskMinutes / 60);

  // Performance Badge Assignment
  let badgeTitle = 'Rising Star';
  let badgeDescription = 'Keep logging hours and completing assignments to level up!';
  let nextBadge = 'Elite Builder';

  if (completionRate >= 80 && totalTaskHours >= 10) {
    badgeTitle = 'Champion Contributor';
    badgeDescription = 'Outstanding efficiency and hours logged!';
    nextBadge = 'Master Architect';
  } else if (completionRate >= 50 && totalTaskHours >= 5) {
    badgeTitle = 'Elite Builder';
    badgeDescription = 'Consistently logging and delivering tasks.';
    nextBadge = 'Champion Contributor';
  }

  return (
    <div className="performance-page-container">
      <div className="performance-header">
        <div>
          <h1 className="page-title-text">My Performance Hub</h1>
          <p className="page-subtitle-text">Monitor your contribution, timing, stats, and achievements.</p>
        </div>
      </div>

      <div className="badge-showcase-premium">
        <div className="badge-artwork">
          <div className="badge-glow-circle"></div>
          <Award size={48} className="badge-icon-svg" />
        </div>
        <div className="badge-meta">
          <span className="badge-level-tag">CURRENT LEVEL STATUS</span>
          <h2 className="badge-title">{badgeTitle}</h2>
          <p className="badge-desc">{badgeDescription}</p>
          <div className="badge-progress-container">
            <div className="badge-progress-header">
              <span>Next Reward: <strong>{nextBadge}</strong></span>
              <span>{completionRate}%</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${completionRate}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-metric-dashboard-grid">
        {/* Metric 1 */}
        <div className="performance-stat-card">
          <div className="stat-icon-wrapper purple">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Tasks Completed</span>
            <span className="stat-value">{completedTasks} <span className="denom">/ {totalTasksCount}</span></span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="performance-stat-card">
          <div className="stat-icon-wrapper green">
            <TrendingUp size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Completion Rate</span>
            <span className="stat-value">{completionRate}%</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="performance-stat-card">
          <div className="stat-icon-wrapper orange">
            <Zap size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Clock-In Streak</span>
            <span className="stat-value">{currentStreak} Days 🔥</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="performance-stat-card">
          <div className="stat-icon-wrapper blue">
            <Clock size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Task Work Hours</span>
            <span className="stat-value">{totalTaskHours} hrs</span>
          </div>
        </div>
      </div>

      <div className="performance-history-grid">
        <div className="attendance-glass-card">
          <h3 className="section-title-premium">
            <Calendar size={16} />
            <span>Assigned Tasks & Time Tracking Logs</span>
          </h3>
          <div className="tasks-logs-list">
            {tasks.length === 0 ? (
              <div className="empty-state-card">No tasks assigned yet.</div>
            ) : (
              tasks.map(t => (
                <div key={t._id} className="task-log-row-premium">
                  <div style={{ flex: 1 }}>
                    <div className="task-name-text">{t.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span className="project-name-badge">{t.projectName}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Status: <strong>{t.completed ? 'Completed' : t.status || 'Todo'}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="task-time-badge">
                    <Clock size={12} />
                    <span>{t.totalTimeSpent ? `${Math.floor(t.totalTimeSpent / 60)}h ${t.totalTimeSpent % 60}m` : '0m'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .performance-page-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
        }
        .performance-header {
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
        .badge-showcase-premium {
          display: flex;
          align-items: center;
          gap: 2rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 640px) {
          .badge-showcase-premium {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.5rem;
            padding: 1.5rem;
          }
        }
        .badge-artwork {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          position: relative;
          flex-shrink: 0;
          box-shadow: 0 8px 24px var(--accent-primary-glow);
        }
        .badge-glow-circle {
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border-radius: 50%;
          border: 2px dashed var(--accent-primary);
          opacity: 0.4;
          animation: spin 20s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        .badge-meta {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          width: 100%;
        }
        .badge-level-tag {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--accent-primary);
          letter-spacing: 0.08em;
        }
        .badge-title {
          font-size: 1.45rem;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0;
          letter-spacing: -0.02em;
        }
        .badge-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin: 0 0 0.5rem 0;
          line-height: 1.4;
        }
        .badge-progress-container {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          width: 100%;
        }
        .badge-progress-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .progress-bar-bg {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 999px;
          overflow: hidden;
        }
        [data-theme="light"] .progress-bar-bg {
          background: rgba(0, 0, 0, 0.05);
        }
        .progress-bar-fill {
          height: 100%;
          border-radius: 999px;
          background: var(--accent-primary);
          box-shadow: 0 0 8px var(--accent-primary-glow);
          transition: width 0.4s ease;
        }

        .stats-metric-dashboard-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem;
        }
        @media (max-width: 1024px) {
          .stats-metric-dashboard-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .stats-metric-dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
        .performance-stat-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.2s;
        }
        .performance-stat-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent-primary-glow);
        }
        .stat-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .stat-icon-wrapper.purple { background: rgba(168, 85, 247, 0.08); color: #a855f7; }
        .stat-icon-wrapper.green { background: rgba(16, 185, 129, 0.08); color: #10b981; }
        .stat-icon-wrapper.orange { background: rgba(245, 158, 11, 0.08); color: #f59e0b; }
        .stat-icon-wrapper.blue { background: rgba(59, 130, 246, 0.08); color: #3b82f6; }

        .stat-content {
          display: flex;
          flex-direction: column;
        }
        .stat-label {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .stat-value {
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.2;
          margin-top: 2px;
        }
        .stat-value .denom {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-muted);
        }

        .performance-history-grid {
          display: grid;
          grid-template-columns: 1fr;
        }
        .attendance-glass-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .section-title-premium {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.75rem;
        }
        .tasks-logs-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .task-log-row-premium {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.85rem 1rem;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          transition: all 0.2s;
        }
        .task-log-row-premium:hover {
          border-color: var(--accent-primary-glow);
          background: rgba(255, 255, 255, 0.03);
        }
        .task-name-text {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .project-name-badge {
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--accent-primary);
          background: rgba(0, 174, 239, 0.08);
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
        }
        .task-time-badge {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          padding: 0.35rem 0.65rem;
          border-radius: 8px;
        }
        [data-theme="light"] .task-time-badge {
          background: rgba(0, 0, 0, 0.02);
        }
        .empty-state-card {
          padding: 3rem 1rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.82rem;
        }
      `}</style>
    </div>
  );
}
