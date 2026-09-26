'use client';

import { useState, useEffect } from 'react';
import { Play, Square, Pause, Coffee, MapPin, Compass } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function ClockInWidget() {
  const { showToast } = useNotification();
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isBreak, setIsBreak] = useState(false);
  const [location, setLocation] = useState(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/attendance?mode=status');
      if (res.ok) {
        const data = await res.json();
        setAttendance(data.attendance);
        if (data.attendance) {
          // Check if currently on a break (any break without an end time)
          const activeBreak = data.attendance.breaks?.find(b => !b.end);
          setIsBreak(!!activeBreak);
        }
      }
    } catch (e) {
      console.error('Error fetching attendance status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Request browser geolocation on widget load
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      setFetchingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setFetchingLocation(false);
        },
        (error) => {
          console.log('Location access denied or unavailable', error);
          setFetchingLocation(false);
        }
      );
    }
  }, []);

  // Elapsed timer handler
  useEffect(() => {
    if (!attendance || attendance.clockOut) {
      setElapsedTime(0);
      return;
    }

    const timer = setInterval(() => {
      const clockInTime = new Date(attendance.clockIn);
      const now = new Date();
      let totalBreakMs = 0;

      attendance.breaks?.forEach(b => {
        const start = new Date(b.start);
        const end = b.end ? new Date(b.end) : now;
        totalBreakMs += end - start;
      });

      const elapsed = now - clockInTime - totalBreakMs;
      setElapsedTime(Math.max(0, elapsed));
    }, 1000);

    return () => clearInterval(timer);
  }, [attendance]);

  const handleAction = async (action, reason = '') => {
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason,
          latitude: location?.latitude,
          longitude: location?.longitude,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Operation failed', 'error');
        return;
      }

      setAttendance(data.attendance);
      if (action === 'clockIn') {
        showToast('Successfully Clocked In! Have a great day.', 'success');
      } else if (action === 'clockOut') {
        showToast('Successfully Clocked Out! Good work today.', 'success');
      } else if (action === 'startBreak') {
        setIsBreak(true);
        showToast('Break started.', 'success');
      } else if (action === 'endBreak') {
        setIsBreak(false);
        showToast('Break ended. Welcome back!', 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('Connection error', 'error');
    }
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  if (loading) {
    return (
      <div className="clock-in-widget glassmorphic-loader" style={{ height: '90px', borderRadius: '16px' }}>
        <div className="skeleton" style={{ width: '100%', height: '100%', borderRadius: '16px' }}></div>
      </div>
    );
  }

  const isClockedIn = attendance && !attendance.clockOut;
  const isClockedOut = attendance && attendance.clockOut;

  return (
    <div className="clock-in-widget-premium">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
        <div className="live-status-indicator" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className={`status-dot ${isClockedIn ? (isBreak ? 'break' : 'active') : 'inactive'}`}></span>
          <span className="status-label" style={{ fontSize: '0.72rem', fontWeight: 800 }}>
            {!attendance ? 'Not Clocked In' : isClockedOut ? 'Shift Ended' : isBreak ? 'On Break' : 'Working'}
          </span>
        </div>

        <div className="stopwatch-display" style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          {isClockedIn ? formatTime(elapsedTime) : '00:00:00'}
        </div>

        {location && (
          <div className="location-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            <MapPin size={11} />
            <span>GPS Secured</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {isClockedOut && (
          <div className="shift-ended-summary" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <span>Today's Total: <strong>{Math.round((attendance.totalWorkMinutes || 0))}m</strong></span>
          </div>
        )}

        <div className="clock-in-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {!attendance && (
            <button className="btn-clock-in" onClick={() => handleAction('clockIn')}>
              <Play size={13} fill="currentColor" />
              <span>Clock In</span>
            </button>
          )}

          {isClockedIn && !isBreak && (
            <>
              <button className="btn-break" onClick={() => handleAction('startBreak', 'Lunch/Short Break')}>
                <Coffee size={13} />
                <span>Start Break</span>
              </button>
              <button className="btn-clock-out" onClick={() => handleAction('clockOut')}>
                <Square size={13} fill="currentColor" />
                <span>Clock Out</span>
              </button>
            </>
          )}

          {isClockedIn && isBreak && (
            <button className="btn-clock-in" onClick={() => handleAction('endBreak')}>
              <Play size={13} fill="currentColor" />
              <span>Resume</span>
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .clock-in-widget-premium {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 0.65rem 1.25rem;
          margin-bottom: 0.85rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .clock-in-widget-premium:hover {
          border-color: var(--accent-primary-glow);
        }
        .clock-in-left {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .live-status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 8px currentColor;
        }
        .status-dot.active {
          background-color: #10b981;
          color: #10b981;
        }
        .status-dot.break {
          background-color: #f59e0b;
          color: #f59e0b;
        }
        .status-dot.inactive {
          background-color: #ef4444;
          color: #ef4444;
        }
        .status-label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }
        .stopwatch-display {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--text-primary);
          font-family: monospace;
          letter-spacing: -0.02em;
        }
        .location-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.65rem;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          width: fit-content;
        }
        .clock-in-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .btn-clock-in, .btn-break, .btn-clock-out {
          border: none;
          outline: none;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.45rem 0.95rem;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          transition: all 0.2s ease;
        }
        .btn-clock-in {
          background: var(--accent-primary);
          color: #ffffff;
          box-shadow: 0 4px 14px var(--accent-primary-glow);
        }
        .btn-clock-in:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .btn-break {
          background: rgba(245, 158, 11, 0.12);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.25);
        }
        .btn-break:hover {
          background: #f59e0b;
          color: #0c1520;
          border-color: #f59e0b;
          transform: translateY(-1px);
        }
        .btn-clock-out {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
        .btn-clock-out:hover {
          background: #ef4444;
          color: #ffffff;
          border-color: #ef4444;
          transform: translateY(-1px);
        }
        .shift-ended-summary {
          font-size: 0.78rem;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          padding: 0.5rem 0.85rem;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
