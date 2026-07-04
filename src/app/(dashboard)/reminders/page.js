'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Plus, Trash2, Calendar as CalendarIcon, AlertCircle, RefreshCw, Send, Users, Clock, Video, X, ExternalLink, Keyboard, ChevronLeft, ChevronRight, Pencil, Share2, MapPin } from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

const hoursList = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];
const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const monthsList = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function RemindersPage() {
  const { showToast, showConfirm } = useNotification();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  
  // View mode switcher: 'agenda' or 'week'
  const [viewMode, setViewMode] = useState('agenda');

  // Modal toggle state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Exact form states matching the "Schedule Meeting" pop-up exactly
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('No client (personal meeting)');
  
  // Custom Date Picker states
  const [selectedDate, setSelectedDate] = useState(''); // Stores 'YYYY-MM-DD'
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [datePickerCoords, setDatePickerCoords] = useState({ top: 0, left: 0 });
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  
  // Helper: get current system time broken into hour/minute/ampm
  const getCurrentTime = () => {
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return {
      hour: String(h).padStart(2, '0'),
      minute: String(m).padStart(2, '0'),
      ampm
    };
  };

  // Time states — initialised to current system clock
  const _initTime = getCurrentTime();
  const [timeHour, setTimeHour] = useState(_initTime.hour);
  const [timeMinute, setTimeMinute] = useState(_initTime.minute);
  const [timeAmpm, setTimeAmpm] = useState(_initTime.ampm);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [timePickerCoords, setTimePickerCoords] = useState({ top: 0, left: 0 });
  
  // Custom Time Picker View Mode: 'hours' or 'minutes' or 'keyboard'
  const [pickerMode, setPickerMode] = useState('hours');
  
  const dateTriggerRef = useRef(null);
  const datePickerRef = useRef(null);
  const timeTriggerRef = useRef(null);
  const timePickerRef = useRef(null);
  const clientDropdownRef = useRef(null);

  const [duration, setDuration] = useState('1 hour');
  const [attendees, setAttendees] = useState('');
  const [description, setDescription] = useState('');
  const [addGoogleMeet, setAddGoogleMeet] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingType, setMeetingType] = useState('online'); // 'online' or 'offline'
  const [location, setLocation] = useState('');
  const [remindMe, setRemindMe] = useState('15 minutes before');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingReminderId, setEditingReminderId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);

  // Client dropdown states
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  useEffect(() => {
    async function checkGoogleStatus() {
      try {
        const res = await fetch('/api/auth/google/status');
        if (res.ok) {
          const data = await res.json();
          setGoogleCalendarConnected(data.connected);
          localStorage.setItem('google_calendar_connected', data.connected ? 'true' : 'false');
        }
      } catch (err) {
        console.error('Failed to check Google status:', err);
      }
    }
    checkGoogleStatus();
  }, [isModalOpen]);

  // Close client dropdown when clicking outside
  useEffect(() => {
    function handleClientOutside(e) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target)) {
        setIsClientDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClientOutside);
    return () => document.removeEventListener('mousedown', handleClientOutside);
  }, []);

  // Close custom pickers when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      // Close date picker
      if (
        datePickerRef.current && 
        !datePickerRef.current.contains(event.target) &&
        dateTriggerRef.current &&
        !dateTriggerRef.current.contains(event.target)
      ) {
        setIsDatePickerOpen(false);
      }
      // Close time picker
      if (
        timePickerRef.current && 
        !timePickerRef.current.contains(event.target) &&
        timeTriggerRef.current &&
        !timeTriggerRef.current.contains(event.target)
      ) {
        setIsTimePickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Dynamically load Google Font "Plus Jakarta Sans" on mount
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Recalculate coordinates if window resizes while open
  useEffect(() => {
    function handleResize() {
      if (isTimePickerOpen && timeTriggerRef.current) {
        const rect = timeTriggerRef.current.getBoundingClientRect();
        setTimePickerCoords({
          top: rect.bottom + window.scrollY + 6,
          left: rect.left + window.scrollX
        });
      }
      if (isDatePickerOpen && dateTriggerRef.current) {
        const rect = dateTriggerRef.current.getBoundingClientRect();
        setDatePickerCoords({
          top: rect.bottom + window.scrollY + 6,
          left: rect.left + window.scrollX
        });
      }
    }
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isTimePickerOpen, isDatePickerOpen]);

  const toggleTimePicker = (e) => {
    e.stopPropagation();
    if (!isTimePickerOpen && timeTriggerRef.current) {
      const rect = timeTriggerRef.current.getBoundingClientRect();
      setTimePickerCoords({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX
      });
      // Close other pickers
      setIsDatePickerOpen(false);
    }
    setIsTimePickerOpen(!isTimePickerOpen);
  };

  const toggleDatePicker = (e) => {
    e.stopPropagation();
    if (!isDatePickerOpen && dateTriggerRef.current) {
      const rect = dateTriggerRef.current.getBoundingClientRect();
      setDatePickerCoords({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX
      });
      // Set calendar view month/year to selectedDate or today
      const baseDate = selectedDate ? new Date(selectedDate) : new Date();
      setCalendarMonth(baseDate.getMonth());
      setCalendarYear(baseDate.getFullYear());
      // Close other pickers
      setIsTimePickerOpen(false);
    }
    setIsDatePickerOpen(!isDatePickerOpen);
  };

  // Format hour/minute/ampm into HH:MM for backend submission
  const getFormattedTime = () => {
    let hourNum = parseInt(timeHour) || 0;
    if (timeAmpm === 'PM' && hourNum < 12) {
      hourNum += 12;
    }
    if (timeAmpm === 'AM' && hourNum === 12) {
      hourNum = 0;
    }
    const hh = hourNum.toString().padStart(2, '0');
    const mm = (timeMinute || '0').padStart(2, '0');
    return `${hh}:${mm}`;
  };

  // Convert HH:MM string back to Hour/Min/AMPM for visual display
  const getDisplayTime = () => {
    const h = timeHour ? parseInt(timeHour) : '--';
    const m = timeMinute || '--';
    return `${h}:${m} ${timeAmpm}`;
  };

  // Helper display date value
  const getDisplayDate = () => {
    if (!selectedDate) return 'dd - mm - yyyy';
    const [yy, mm, dd] = selectedDate.split('-');
    return `${dd} - ${mm} - ${yy}`;
  };

  useEffect(() => {
    setMounted(true);
    async function initData() {
      try {
        setLoading(true);
        // Fetch current user details
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData);
        }

        // Fetch reminders
        const remindersRes = await fetch('/api/reminders');
        if (remindersRes.ok) {
          const remindersData = await remindersRes.json();
          setReminders(remindersData);
        }

        // Fetch clients for dropdown
        const clientsRes = await fetch('/api/clients');
        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          setClients(clientsData);
        }
      } catch (err) {
        console.error('Error initializing reminders page data:', err);
        showToast('Error loading reminders page data', 'error');
      } finally {
        setLoading(false);
      }
    }

    initData();
  }, []);

  const refreshReminders = async () => {
    try {
      const res = await fetch('/api/reminders');
      if (res.ok) {
        const data = await res.json();
        setReminders(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Meeting Title is required', 'error');
      return;
    }
    if (!selectedDate) {
      showToast('Date is required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const isEdit = !!editingReminderId;
      const url = isEdit ? `/api/reminders/${editingReminderId}` : '/api/reminders';
      const method = isEdit ? 'PUT' : 'POST';

      let finalMeetingUrl = meetingUrl;
      if (meetingType === 'online' && addGoogleMeet && !finalMeetingUrl) {
        const code1 = Math.random().toString(36).substring(2, 5);
        const code2 = Math.random().toString(36).substring(2, 6);
        const code3 = Math.random().toString(36).substring(2, 5);
        finalMeetingUrl = `https://meet.google.com/${code1}-${code2}-${code3}`;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          client,
          date: selectedDate,
          time: getFormattedTime(),
          duration,
          attendees,
          description,
          addGoogleMeet,
          meetingUrl: finalMeetingUrl,
          meetingType,
          location,
          remindMe
        })
      });

      if (res.ok) {
        showToast(isEdit ? 'Meeting updated successfully!' : 'Reminder scheduled successfully! Invitations emailed to attendees.', 'success');
        setTitle('');
        setClient('No client (personal meeting)');
        setSelectedDate('');
        const _t = getCurrentTime();
        setTimeHour(_t.hour);
        setTimeMinute(_t.minute);
        setTimeAmpm(_t.ampm);
        setDuration('1 hour');
        setAttendees('');
        setDescription('');
        setAddGoogleMeet(false);
        setMeetingUrl('');
        setMeetingType('online');
        setLocation('');
        setRemindMe('15 minutes before');
        setEditingReminderId(null);
        setIsModalOpen(false);
        refreshReminders();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to schedule meeting', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error scheduling meeting', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditReminder = (reminder) => {
    setEditingReminderId(reminder._id);
    setTitle(reminder.title);
    setClient(reminder.client || 'No client (personal meeting)');
    
    // Format date string to YYYY-MM-DD
    const rDate = new Date(reminder.date);
    const year = rDate.getFullYear();
    const month = String(rDate.getMonth() + 1).padStart(2, '0');
    const day = String(rDate.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);

    // Parse time: "07:00 AM" or similar
    if (reminder.time) {
      const match = reminder.time.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        setTimeHour(match[1]);
        setTimeMinute(match[2]);
        setTimeAmpm(match[3].toUpperCase());
      }
    }

    setDuration(reminder.duration || '1 hour');
    setAttendees(reminder.attendees || '');
    setDescription(reminder.description || '');
    setMeetingType(reminder.meetingType || 'online');
    setLocation(reminder.location || '');
    setAddGoogleMeet(!!reminder.addGoogleMeet);
    setMeetingUrl(reminder.meetingUrl || '');
    setRemindMe(reminder.remindMe || '15 minutes before');
    
    // Open modal
    setIsModalOpen(true);
  };

  const handleShareReminder = (reminder) => {
    const formattedDate = new Date(reminder.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const shareText = `Meeting details:
Subject: ${reminder.title}
Client: ${reminder.client}
Date: ${formattedDate}
Time: ${reminder.time} (${reminder.duration})
Meeting Type: ${reminder.meetingType === 'offline' ? 'In Person' : 'Online'}
${reminder.meetingType === 'offline' ? `Location: ${reminder.location}` : `Meeting Link: ${reminder.meetingUrl || 'Google Meet'}`}
Description: ${reminder.description || 'N/A'}`;

    navigator.clipboard.writeText(shareText)
      .then(() => {
        showToast('Meeting details copied to clipboard!', 'success');
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy meeting details', 'error');
      });
  };

  const handleDeleteReminder = (id, reminderTitle) => {
    showConfirm({
      title: 'Delete Scheduled Meeting',
      message: `Are you sure you want to delete "${reminderTitle}"? This will cancel the reminder trigger.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/reminders/${id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            showToast('Scheduled meeting deleted successfully', 'success');
            refreshReminders();
          } else {
            const err = await res.json();
            showToast(err.error || 'Failed to delete reminder', 'error');
          }
        } catch (e) {
          console.error(e);
          showToast('Error deleting reminder', 'error');
        }
      }
    });
  };

  const hasWriteAccess = currentUser?.permissions?.reminders === 'write' || currentUser?.role === 'superadmin';

  // Helper date checking
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const next7DaysEnd = new Date(todayEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Live filter reminders based on search input query
  const filteredReminders = reminders.filter(r => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      r.title?.toLowerCase().includes(query) ||
      r.client?.toLowerCase().includes(query) ||
      r.description?.toLowerCase().includes(query) ||
      r.attendees?.toLowerCase().includes(query) ||
      r.location?.toLowerCase().includes(query)
    );
  });

  // Grouping for Agenda
  const todayReminders = filteredReminders.filter(r => {
    const rDate = new Date(r.date);
    return rDate >= todayStart && rDate <= todayEnd;
  });

  // Upcoming meetings (next 7 days, excluding today)
  const upcomingReminders = filteredReminders.filter(r => {
    const rDate = new Date(r.date);
    return rDate > todayEnd && rDate <= next7DaysEnd;
  });

  // Compile Week Days starting DIRECTLY from today (next 7 days rolling)
  const getWeekDates = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date();
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDates = getWeekDates();

  // Trigonometric Math coordinates for Clock Labels (radius: 38%)
  const getClockCoordinates = (index, totalSteps = 12) => {
    const angle = (index * (360 / totalSteps)) * (Math.PI / 180);
    const x = 50 + 38 * Math.sin(angle);
    const y = 50 - 38 * Math.cos(angle);
    return { x: `${x}%`, y: `${y}%`, angle: index * (360 / totalSteps) };
  };

  // Compile Calendar days grid
  const getDaysInMonth = (month, year) => {
    const dateObj = new Date(year, month, 1);
    const days = [];
    
    // Find starting day of the week (0: Sun, 6: Sat)
    const startDay = dateObj.getDay();
    
    // Previous month filling
    const prevMonthEnd = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevMonthEnd - i;
      const targetDate = new Date(year, month - 1, d);
      days.push({
        day: d,
        isCurrentMonth: false,
        dateStr: `${targetDate.getFullYear()}-${(targetDate.getMonth()+1).toString().padStart(2, '0')}-${targetDate.getDate().toString().padStart(2, '0')}`
      });
    }
    
    // Current month days
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= totalDays; i++) {
      const targetDate = new Date(year, month, i);
      days.push({
        day: i,
        isCurrentMonth: true,
        dateStr: `${targetDate.getFullYear()}-${(targetDate.getMonth()+1).toString().padStart(2, '0')}-${targetDate.getDate().toString().padStart(2, '0')}`
      });
    }
    
    // Next month days to complete 42 cells (6 rows)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const targetDate = new Date(year, month + 1, i);
      days.push({
        day: i,
        isCurrentMonth: false,
        dateStr: `${targetDate.getFullYear()}-${(targetDate.getMonth()+1).toString().padStart(2, '0')}-${targetDate.getDate().toString().padStart(2, '0')}`
      });
    }
    
    return days;
  };

  const calendarDays = getDaysInMonth(calendarMonth, calendarYear);

  const prevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="meetings-container animate-fade-in">
      {/* INJECT CUSTOM INLINE CSS TO ENFORCE FONT FAMILY ACROSS ALL SUB-ELEMENTS & PLACEHOLDERS */}
      <style dangerouslySetInnerHTML={{__html: `
        body,
        body *,
        input,
        select,
        textarea,
        button,
        span,
        div,
        p,
        h3 {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
        input::placeholder,
        textarea::placeholder {
          font-family: 'Plus Jakarta Sans', sans-serif !important;
          color: #9ca3af !important;
          opacity: 0.8 !important;
        }
      `}} />

      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottom: '1px solid var(--border-color, #e5e7eb)', 
        paddingBottom: '1rem',
        marginBottom: '0.5rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: 'var(--text-primary, #111827)' }}>
            Meetings
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #6b7280)', margin: '4px 0 0 0' }}>
            Your schedule in Asia/Kolkata
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Live Search Meetings */}
          <input
            type="text"
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #e5e7eb)',
              fontSize: '0.825rem',
              outline: 'none',
              width: '180px',
              background: '#ffffff',
              color: 'var(--text-primary, #111827)'
            }}
          />

          {/* Agenda & Week Switches */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-secondary, #f3f4f6)',
            borderRadius: '8px',
            padding: '2px',
            border: '1px solid var(--border-color, #e5e7eb)'
          }}>
            <button
              onClick={() => setViewMode('agenda')}
              style={{
                background: viewMode === 'agenda' ? '#ffffff' : 'transparent',
                color: viewMode === 'agenda' ? '#111827' : '#6b7280',
                border: 'none',
                padding: '0.45rem 1rem',
                borderRadius: '6px',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: viewMode === 'agenda' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Agenda
            </button>
            <button
              onClick={() => setViewMode('week')}
              style={{
                background: viewMode === 'week' ? '#ffffff' : 'transparent',
                color: viewMode === 'week' ? '#111827' : '#6b7280',
                border: 'none',
                padding: '0.45rem 1rem',
                borderRadius: '6px',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: viewMode === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Week
            </button>
          </div>

          {hasWriteAccess && (
            <button 
              onClick={() => {
                setEditingReminderId(null);
                setTitle('');
                setClient('No client (personal meeting)');
                setSelectedDate('');
                const _t = getCurrentTime();
                setTimeHour(_t.hour);
                setTimeMinute(_t.minute);
                setTimeAmpm(_t.ampm);
                setDuration('1 hour');
                setAttendees('');
                setDescription('');
                setAddGoogleMeet(false);
                setMeetingUrl('');
                setMeetingType('online');
                setLocation('');
                setRemindMe('15 minutes before');
                setIsModalOpen(true);
              }} 
              style={{
                background: 'var(--accent-primary, #ea580c)',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1.15rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                transition: 'opacity 0.2s',
                height: '36px'
              }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
              <Plus size={16} />
              <span>Schedule</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODES */}
      {viewMode === 'agenda' ? (
        /* ---------------- AGENDA VIEW ---------------- */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Today Block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Today
            </div>
            {todayReminders.length === 0 ? (
              <div style={{
                padding: '2.5rem',
                background: 'var(--bg-card, #ffffff)',
                border: '1px solid var(--border-color, #e5e7eb)',
                borderRadius: '12px',
                color: 'var(--text-muted, #6b7280)',
                fontSize: '0.85rem',
                fontWeight: 500,
                textAlign: 'center'
              }}>
                No meetings scheduled for today.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {todayReminders.map(reminder => (
                  <AgendaCard 
                    key={reminder._id} 
                    reminder={reminder} 
                    hasWriteAccess={hasWriteAccess} 
                    onEdit={handleEditReminder}
                    onShare={handleShareReminder}
                    onDelete={handleDeleteReminder} 
                  />
                ))}
              </div>
            )}
          </div>
 
          {/* Upcoming Block (Next 7 Days) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Upcoming (Next 7 Days)
            </div>
            {upcomingReminders.length === 0 ? (
              <div style={{
                padding: '2.5rem',
                background: 'var(--bg-card, #ffffff)',
                border: '1px solid var(--border-color, #e5e7eb)',
                borderRadius: '12px',
                color: 'var(--text-muted, #6b7280)',
                fontSize: '0.85rem',
                fontWeight: 500,
                textAlign: 'center'
              }}>
                No upcoming meetings scheduled for the next 7 days.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {upcomingReminders.map(reminder => (
                  <AgendaCard 
                    key={reminder._id} 
                    reminder={reminder} 
                    hasWriteAccess={hasWriteAccess} 
                    onEdit={handleEditReminder}
                    onShare={handleShareReminder}
                    onDelete={handleDeleteReminder} 
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ---------------- WEEK VIEW ---------------- */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '0.75rem',
          alignItems: 'start',
          width: '100%',
          overflowX: 'auto',
          paddingBottom: '1rem'
        }}>
          {weekDates.map((dayDate) => {
            const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
            const dayNum = dayDate.getDate();
            const monthName = dayDate.toLocaleDateString('en-US', { month: 'short' });

            // Filter reminders on this specific date
            const dayReminders = filteredReminders.filter(r => {
              const rDate = new Date(r.date);
              return rDate.getDate() === dayNum &&
                     rDate.getMonth() === dayDate.getMonth() &&
                     rDate.getFullYear() === dayDate.getFullYear();
            });

            return (
              <div 
                key={dayDate.toISOString()}
                style={{
                  background: 'var(--bg-card, #ffffff)',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  borderRadius: '12px',
                  padding: '1rem 0.75rem',
                  minHeight: '180px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                {/* Day Header */}
                <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted, #6b7280)' }}>
                    {dayName}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-primary, #ea580c)', marginTop: '2px' }}>
                    {dayNum} {monthName}
                  </div>
                </div>

                {/* Day Meetings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                  {dayReminders.length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: '#cbd5e1', fontStyle: 'italic', padding: '0.5rem 0' }}>
                      —
                    </div>
                  ) : (
                    dayReminders.map(r => (
                      <div 
                        key={r._id}
                        style={{
                          background: 'rgba(234, 88, 12, 0.03)',
                          border: '1px solid rgba(234, 88, 12, 0.15)',
                          borderRadius: '6px',
                          padding: '0.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}
                      >
                        <strong style={{ fontSize: '0.78rem', color: 'var(--text-primary, #111827)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.title}>
                          {r.title}
                        </strong>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary, #4b5563)' }}>
                          {r.time}
                        </span>
                        {r.meetingType !== 'offline' && r.meetingUrl && (
                          <a 
                            href={r.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '0.68rem',
                              color: 'var(--accent-primary, #ea580c)',
                              fontWeight: 700,
                              textDecoration: 'none',
                              marginTop: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'rgba(234, 88, 12, 0.08)',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              alignSelf: 'flex-start',
                              transition: 'opacity 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                          >
                            <Video size={10} />
                            <span>Join</span>
                          </a>
                        )}
                        {r.meetingType === 'offline' && r.location && (
                          <div
                            style={{
                              fontSize: '0.68rem',
                              color: '#4b5563',
                              fontWeight: 700,
                              marginTop: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#f3f4f6',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              alignSelf: 'flex-start'
                            }}
                            title={r.location}
                          >
                            <span>📍 {r.location.substring(0, 10)}{r.location.length > 10 ? '...' : ''}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE REMINDER PROFESSIONAL MODAL */}
      {mounted && isModalOpen && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1rem',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            fontFamily: 'inherit'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.25rem',
              borderBottom: '1px solid #f3f4f6',
            }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#111827' }}>
                Schedule Meeting
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.color = '#374151'}
                onMouseOut={(e) => e.currentTarget.style.color = '#9ca3af'}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateReminder} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', boxSizing: 'border-box' }}>
              
              {/* Meeting Title * */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937' }}>
                  Meeting Title <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Project kickoff"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#111827',
                    fontSize: '0.825rem',
                    width: '100%',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                  required
                />
              </div>

              {/* Client - Searchable Dropdown */}
              <div ref={clientDropdownRef} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', position: 'relative' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937' }}>
                  Client
                </label>

                {/* Trigger button */}
                <div
                  onClick={() => { setIsClientDropdownOpen(v => !v); setClientSearch(''); }}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: `1px solid ${isClientDropdownOpen ? 'var(--accent-primary, #ea580c)' : '#d1d5db'}`,
                    background: '#ffffff',
                    color: client === 'No client (personal meeting)' ? '#9ca3af' : '#111827',
                    fontSize: '0.825rem',
                    width: '100%',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    userSelect: 'none',
                    transition: 'border-color 0.15s'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {client || 'No client (personal meeting)'}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink: 0, transform: isClientDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {/* Dropdown panel */}
                {isClientDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 9999,
                    overflow: 'hidden'
                  }}>

                    {/* Search input */}
                    <div style={{ padding: '0.5rem', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.35rem 0.6rem' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                          type="text"
                          autoFocus
                          placeholder="Search clients..."
                          value={clientSearch}
                          onChange={e => setClientSearch(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          style={{
                            border: 'none',
                            outline: 'none',
                            fontSize: '0.8rem',
                            color: '#111827',
                            background: 'transparent',
                            width: '100%'
                          }}
                        />
                        {clientSearch && (
                          <button onClick={e => { e.stopPropagation(); setClientSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9ca3af', lineHeight: 1 }}>✕</button>
                        )}
                      </div>
                    </div>

                    {/* Options list */}
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {/* No client option */}
                      {('No client (personal meeting)'.toLowerCase().includes(clientSearch.toLowerCase())) && (
                        <div
                          onClick={() => { setClient('No client (personal meeting)'); setIsClientDropdownOpen(false); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                            padding: '0.55rem 0.75rem',
                            cursor: 'pointer',
                            background: client === 'No client (personal meeting)' ? 'rgba(var(--accent-primary-rgb, 234, 88, 12), 0.06)' : 'transparent',
                            borderLeft: client === 'No client (personal meeting)' ? '3px solid var(--accent-primary, #ea580c)' : '3px solid transparent',
                            transition: 'background 0.1s'
                          }}
                          onMouseEnter={e => { if (client !== 'No client (personal meeting)') e.currentTarget.style.background = '#f9fafb'; }}
                          onMouseLeave={e => { if (client !== 'No client (personal meeting)') e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', color: '#6b7280', flexShrink: 0
                          }}>—</div>
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151' }}>No client (personal meeting)</div>
                          </div>
                          {client === 'No client (personal meeting)' && (
                            <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary, #ea580c)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </div>
                      )}

                      {/* Client list from API */}
                      {clients
                        .filter(c =>
                          c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                          c.company?.toLowerCase().includes(clientSearch.toLowerCase())
                        )
                        .map(c => {
                          const initials = c.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
                          const isSelected = client === c.name;
                          return (
                            <div
                              key={c._id}
                              onClick={() => { setClient(c.name); setIsClientDropdownOpen(false); }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.6rem',
                                padding: '0.55rem 0.75rem',
                                cursor: 'pointer',
                                background: isSelected ? 'rgba(var(--accent-primary-rgb, 234, 88, 12), 0.06)' : 'transparent',
                                borderLeft: isSelected ? '3px solid var(--accent-primary, #ea580c)' : '3px solid transparent',
                                transition: 'background 0.1s'
                              }}
                              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f9fafb'; }}
                              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                            >
                              {/* Avatar circle with initials */}
                              <div style={{
                                width: '28px', height: '28px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--accent-primary, #ea580c), #f97316)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.65rem', fontWeight: 700, color: '#ffffff', flexShrink: 0
                              }}>{initials}</div>
                              <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                                {c.company && <div style={{ fontSize: '0.7rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.company}</div>}
                              </div>
                              {isSelected && (
                                <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary, #ea580c)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                              )}
                            </div>
                          );
                        })
                      }

                      {/* Empty state */}
                      {clients.filter(c =>
                        c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                        c.company?.toLowerCase().includes(clientSearch.toLowerCase())
                      ).length === 0 && !('No client (personal meeting)'.toLowerCase().includes(clientSearch.toLowerCase())) && (
                        <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.78rem' }}>No clients found</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Date, Time, Duration Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '0.75rem', width: '100%' }}>
                {/* Date (Custom Calendar trigger) * */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', position: 'relative' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937' }}>
                    Date <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div
                    ref={dateTriggerRef}
                    onClick={toggleDatePicker}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      color: '#111827',
                      fontSize: '0.825rem',
                      width: '100%',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      height: '34px',
                      userSelect: 'none'
                    }}
                  >
                    <span>{getDisplayDate()}</span>
                    <CalendarIcon size={14} style={{ color: '#9ca3af' }} />
                  </div>
                </div>

                {/* Time (Watch Clock Trigger Input) * */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', position: 'relative' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937' }}>
                    Time <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  
                  {/* Visual trigger input */}
                  <div
                    ref={timeTriggerRef}
                    onClick={toggleTimePicker}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      color: '#111827',
                      fontSize: '0.825rem',
                      width: '100%',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      height: '34px',
                      userSelect: 'none'
                    }}
                  >
                    <span>{getDisplayTime()}</span>
                    <Clock size={14} style={{ color: '#9ca3af' }} />
                  </div>
                </div>

                {/* Duration */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937' }}>
                    Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      color: '#111827',
                      fontSize: '0.825rem',
                      width: '100%',
                      boxSizing: 'border-box',
                      outline: 'none',
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236b7280\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.75rem center',
                      backgroundSize: '1rem'
                    }}
                  >
                    <option value="30 minutes">30 minutes</option>
                    <option value="45 minutes">45 minutes</option>
                    <option value="1 hour">1 hour</option>
                    <option value="1.5 hours">1.5 hours</option>
                    <option value="2 hours">2 hours</option>
                  </select>
                </div>
              </div>

              {/* Attendees (emails) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937' }}>
                  Attendees (emails)
                </label>
                <input
                  type="text"
                  placeholder="alice@example.com, bob@example.com"
                  value={attendees}
                  onChange={(e) => setAttendees(e.target.value)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#111827',
                    fontSize: '0.825rem',
                    width: '100%',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '1px' }}>
                  Comma or newline separated. They'll receive the Google Calendar invite.
                </span>
              </div>

              {/* Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937' }}>
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Agenda and notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#111827',
                    fontSize: '0.825rem',
                    width: '100%',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Meeting Type Selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937' }}>
                  Meeting Type
                </label>
                <div style={{
                  display: 'flex',
                  background: 'var(--bg-secondary, #f3f4f6)',
                  borderRadius: '8px',
                  padding: '2px',
                  border: '1px solid var(--border-color, #e5e7eb)'
                }}>
                  <button
                    type="button"
                    onClick={() => setMeetingType('online')}
                    style={{
                      background: meetingType === 'online' ? 'var(--accent-primary, #ea580c)' : 'transparent',
                      color: meetingType === 'online' ? '#ffffff' : '#6b7280',
                      border: 'none',
                      flex: 1,
                      padding: '0.45rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Online
                  </button>
                  <button
                    type="button"
                    onClick={() => setMeetingType('offline')}
                    style={{
                      background: meetingType === 'offline' ? 'var(--accent-primary, #ea580c)' : 'transparent',
                      color: meetingType === 'offline' ? '#ffffff' : '#6b7280',
                      border: 'none',
                      flex: 1,
                      padding: '0.45rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Offline (In Person)
                  </button>
                </div>
              </div>

              {/* Conditional Options */}
              {meetingType === 'online' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div 
                    onClick={() => {
                      if (!googleCalendarConnected) {
                        showToast('Please connect your Google Calendar in Settings to enable Google Meet integration.', 'warning');
                        return;
                      }
                      const nextVal = !addGoogleMeet;
                      setAddGoogleMeet(nextVal);
                      if (nextVal) {
                        const genSeg = (len) => Array.from({length: len}, () => Math.floor(Math.random() * 36).toString(36)).join('');
                        setMeetingUrl(`https://meet.google.com/${genSeg(3)}-${genSeg(4)}-${genSeg(3)}`);
                      } else {
                        setMeetingUrl('');
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      background: '#ffffff',
                      cursor: googleCalendarConnected ? 'pointer' : 'not-allowed',
                      opacity: googleCalendarConnected ? 1 : 0.65
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Video size={16} style={{ color: 'var(--accent-primary, #ea580c)' }} />
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937' }}>Add Google Meet</div>
                        <div style={{ fontSize: '0.72rem', color: googleCalendarConnected ? '#10b981' : '#6b7280', fontWeight: googleCalendarConnected ? 600 : 400 }}>
                          {googleCalendarConnected ? '● Synced with Google Calendar' : 'Connect Google Calendar in Settings to enable'}
                        </div>
                      </div>
                    </div>
                    <div 
                      style={{
                        width: '36px',
                        height: '20px',
                        borderRadius: '10px',
                        background: addGoogleMeet ? 'var(--accent-primary, #ea580c)' : '#cbd5e1',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: addGoogleMeet ? 'flex-end' : 'flex-start',
                        transition: 'background-color 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                        transition: 'all 0.2s ease'
                      }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937' }}>
                      Meeting link (manual)
                    </label>
                    <input
                      type="url"
                      placeholder="https://meet.google.com/abc-defg-hij"
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        background: '#ffffff',
                        color: '#111827',
                        fontSize: '0.825rem',
                        width: '100%',
                        boxSizing: 'border-box',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937' }}>
                    Location / Venue
                  </label>
                  <input
                    type="text"
                    placeholder="Conference Room A, 4th Floor"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      color: '#111827',
                      fontSize: '0.825rem',
                      width: '100%',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>
              )}

              {/* Remind me selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>

                {/* Remind me */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1f2937' }}>
                    Remind me
                  </label>
                  <select
                    value={remindMe}
                    onChange={(e) => setRemindMe(e.target.value)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      color: '#111827',
                      fontSize: '0.825rem',
                      width: '100%',
                      boxSizing: 'border-box',
                      outline: 'none',
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236b7280\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.75rem center',
                      backgroundSize: '1rem'
                    }}
                  >
                    <option value="At time of event">At time of event</option>
                    <option value="5 minutes before">5 minutes before</option>
                    <option value="15 minutes before">15 minutes before</option>
                    <option value="30 minutes before">30 minutes before</option>
                    <option value="1 hour before">1 hour before</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                borderTop: '1px solid #f3f4f6',
                paddingTop: '0.75rem',
                marginTop: '0.25rem',
                width: '100%'
              }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #d1d5db',
                    color: '#374151',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: 'var(--accent-primary, #ea580c)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'opacity 0.15s ease',
                    boxShadow: '0 2px 8px rgba(234, 88, 12, 0.2)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                >
                  {submitting ? 'Scheduling...' : 'Schedule Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* PORTAL RENDERED CREATIVE DATE PICKER POPUP */}
      {mounted && isDatePickerOpen && createPortal(
        <div
          ref={datePickerRef}
          style={{
            position: 'absolute',
            top: `${datePickerCoords.top}px`,
            left: `${datePickerCoords.left}px`,
            width: '290px',
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 1000000,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            boxSizing: 'border-box'
          }}
        >
          {/* Header: Month & Year Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1f2937' }}>
              {monthsList[calendarMonth]}, {calendarYear}
            </span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                type="button"
                onClick={prevMonth}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#4b5563',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '50%'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f3f4f6'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#4b5563',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '50%'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f3f4f6'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday headers: Su, Mo ... Sa */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <span key={d} style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af' }}>
                {d}
              </span>
            ))}
          </div>

          {/* 6x7 Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {calendarDays.map((cell, idx) => {
              const isSelected = selectedDate === cell.dateStr;
              
              // Today check
              const todayObj = new Date();
              const todayStr = `${todayObj.getFullYear()}-${(todayObj.getMonth()+1).toString().padStart(2, '0')}-${todayObj.getDate().toString().padStart(2, '0')}`;
              const isToday = cell.dateStr === todayStr;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDate(cell.dateStr);
                    setIsDatePickerOpen(false);
                  }}
                  style={{
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: isSelected || isToday ? 700 : 500,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: isSelected 
                      ? 'var(--accent-primary, #ea580c)' 
                      : 'transparent',
                    color: isSelected 
                      ? '#ffffff' 
                      : cell.isCurrentMonth 
                        ? '#1f2937' 
                        : '#cbd5e1',
                    border: isSelected
                      ? 'none'
                      : isToday
                        ? '1px solid var(--accent-primary, #ea580c)'
                        : 'none'
                  }}
                  onMouseOver={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#f3f4f6';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {cell.day}
                </div>
              );
            })}
          </div>

          {/* Footer Controls: Clear & Today */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '0.5rem',
            borderTop: '1px solid #f2f2f7',
            marginTop: '0.25rem'
          }}>
            <button
              type="button"
              onClick={() => {
                setSelectedDate('');
                setIsDatePickerOpen(false);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-primary, #ea580c)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const todayObj = new Date();
                const todayStr = `${todayObj.getFullYear()}-${(todayObj.getMonth()+1).toString().padStart(2, '0')}-${todayObj.getDate().toString().padStart(2, '0')}`;
                setSelectedDate(todayStr);
                setIsDatePickerOpen(false);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-primary, #ea580c)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Today
            </button>
          </div>

        </div>,
        document.body
      )}

      {/* PORTAL RENDERED WATCH TIME PICKER DIAL CARD */}
      {mounted && isTimePickerOpen && createPortal(
        <div 
          ref={timePickerRef}
          style={{
            position: 'absolute',
            top: `${timePickerCoords.top}px`,
            left: `${timePickerCoords.left}px`,
            width: '280px',
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 1000000,
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            boxSizing: 'border-box'
          }}
        >
          {/* SELECT TIME Header Label */}
          <div style={{ width: '100%', fontSize: '0.65rem', fontWeight: 700, color: '#8e8e93', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid #f2f2f7', paddingBottom: '4px' }}>
            SELECT TIME
          </div>

          {/* Display Box Area */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%' }}>
            {/* Hour Display */}
            <div 
              onClick={() => setPickerMode('hours')}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                background: pickerMode === 'hours' ? '#ffffff' : '#e5e7eb',
                color: pickerMode === 'hours' ? 'var(--accent-primary, #ea580c)' : '#111827',
                border: pickerMode === 'hours' ? '2px solid var(--accent-primary, #ea580c)' : '2px solid transparent',
                fontSize: '2.4rem',
                fontWeight: 600,
                lineHeight: 1,
                cursor: 'pointer',
                minWidth: '60px',
                textAlign: 'center',
                boxSizing: 'border-box'
              }}
            >
              {timeHour ? parseInt(timeHour) : '--'}
            </div>

            {/* Separator Colon */}
            <span style={{ fontSize: '2.4rem', fontWeight: 600, color: '#1c1c1e', lineHeight: 1 }}>:</span>

            {/* Minute Display */}
            <div 
              onClick={() => setPickerMode('minutes')}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                background: pickerMode === 'minutes' ? '#ffffff' : '#e5e7eb',
                color: pickerMode === 'minutes' ? 'var(--accent-primary, #ea580c)' : '#111827',
                border: pickerMode === 'minutes' ? '2px solid var(--accent-primary, #ea580c)' : '2px solid transparent',
                fontSize: '2.4rem',
                fontWeight: 600,
                lineHeight: 1,
                cursor: 'pointer',
                minWidth: '60px',
                textAlign: 'center',
                boxSizing: 'border-box'
              }}
            >
              {timeMinute}
            </div>

            {/* AM/PM Switch */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              overflow: 'hidden',
              marginLeft: '0.25rem'
            }}>
              <button
                type="button"
                onClick={() => setTimeAmpm('AM')}
                style={{
                  padding: '0.35rem 0.5rem',
                  background: timeAmpm === 'AM' ? 'var(--accent-primary, #ea580c)' : '#ffffff',
                  color: timeAmpm === 'AM' ? '#ffffff' : '#6b7280',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  borderBottom: '1px solid #d1d5db'
                }}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setTimeAmpm('PM')}
                style={{
                  padding: '0.35rem 0.5rem',
                  background: timeAmpm === 'PM' ? 'var(--accent-primary, #ea580c)' : '#ffffff',
                  color: timeAmpm === 'PM' ? '#ffffff' : '#6b7280',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                PM
              </button>
            </div>
          </div>

          {/* KEYBOARD MODE OR DIAL FACE */}
          {pickerMode === 'keyboard' ? (
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%', padding: '0.5rem 0' }}>
              {/* Hour input — raw typing, padded on blur */}
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={timeHour}
                placeholder="HH"
                onKeyDown={(e) => {
                  if (e.key === 'Backspace') {
                    e.preventDefault();
                    setTimeHour(prev => prev.length > 1 ? prev.slice(0, -1) : '');
                  } else if (/^\d$/.test(e.key)) {
                    e.preventDefault();
                    const next = timeHour.length < 2 ? timeHour + e.key : e.key;
                    const num = parseInt(next, 10);
                    // Accept if within range, or if it's a first digit (1-9)
                    if (num >= 1 && num <= 12) setTimeHour(next);
                    else if (next.length === 1 && num >= 0) setTimeHour(next);
                  }
                }}
                onBlur={() => {
                  if (timeHour) {
                    const num = parseInt(timeHour, 10);
                    const clamped = Math.min(Math.max(num, 1), 12);
                    setTimeHour(String(clamped).padStart(2, '0'));
                  }
                }}
                onChange={() => {}}
                style={{ width: '50%', padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: '6px', textAlign: 'center', fontSize: '0.85rem' }}
              />
              {/* Minute input — raw typing, padded on blur */}
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={timeMinute}
                placeholder="MM"
                onKeyDown={(e) => {
                  if (e.key === 'Backspace') {
                    e.preventDefault();
                    setTimeMinute(prev => prev.length > 1 ? prev.slice(0, -1) : '');
                  } else if (/^\d$/.test(e.key)) {
                    e.preventDefault();
                    const next = timeMinute.length < 2 ? timeMinute + e.key : e.key;
                    const num = parseInt(next, 10);
                    if (num >= 0 && num <= 59) setTimeMinute(next);
                    else if (next.length === 1) setTimeMinute(next);
                  }
                }}
                onBlur={() => {
                  if (timeMinute !== '') {
                    const num = parseInt(timeMinute, 10);
                    const clamped = Math.min(Math.max(num, 0), 59);
                    setTimeMinute(String(clamped).padStart(2, '0'));
                  }
                }}
                onChange={() => {}}
                style={{ width: '50%', padding: '0.4rem', border: '1px solid #d1d5db', borderRadius: '6px', textAlign: 'center', fontSize: '0.85rem' }}
              />
            </div>
          ) : (
            /* ANALOG DIAL FACE VIEW */
            <div style={{
              position: 'relative',
              width: '180px',
              height: '180px',
              background: '#e9e9eb',
              borderRadius: '50%',
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none'
            }}>
              {/* Center Dot */}
              <div style={{
                position: 'absolute',
                width: '8px',
                height: '8px',
                background: 'var(--accent-primary, #ea580c)',
                borderRadius: '50%',
                zIndex: 10
              }} />

              {/* Clock dial labels */}
              {pickerMode === 'hours' ? (
                // Render hours: 1 to 12
                [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hr, idx) => {
                  const labelStr = hr.toString().padStart(2, '0');
                  const coords = getClockCoordinates(idx, 12);
                  const isSelected = timeHour === labelStr;

                  return (
                    <div
                      key={hr}
                      onClick={() => {
                        setTimeHour(labelStr);
                        setPickerMode('minutes');
                      }}
                      style={{
                        position: 'absolute',
                        left: coords.x,
                        top: coords.y,
                        transform: 'translate(-50%, -50%)',
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: isSelected ? 'var(--accent-primary, #ea580c)' : 'transparent',
                        color: isSelected ? '#ffffff' : '#333333',
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 5
                      }}
                    >
                      {hr}
                    </div>
                  );
                })
              ) : (
                // Render minutes: 00 to 55
                [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((min, idx) => {
                  const labelStr = min.toString().padStart(2, '0');
                  const coords = getClockCoordinates(idx, 12);
                  const isSelected = timeMinute === labelStr;

                  return (
                    <div
                      key={min}
                      onClick={() => setTimeMinute(labelStr)}
                      style={{
                        position: 'absolute',
                        left: coords.x,
                        top: coords.y,
                        transform: 'translate(-50%, -50%)',
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: isSelected ? 'var(--accent-primary, #ea580c)' : 'transparent',
                        color: isSelected ? '#ffffff' : '#333333',
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 5
                      }}
                    >
                      {labelStr}
                    </div>
                  );
                })
              )}

              {/* Interactive Hands indicator */}
              <div style={{
                position: 'absolute',
                width: '2px',
                height: '62px',
                background: 'var(--accent-primary, #ea580c)',
                bottom: '50%',
                left: 'calc(50% - 1px)',
                transformOrigin: 'bottom center',
                transform: `rotate(${
                  pickerMode === 'hours'
                    ? (hoursList.indexOf(timeHour) !== -1 ? hoursList.indexOf(timeHour) * 30 : 0)
                    : ((parseInt(timeMinute) || 0) * 6)
                }deg)`,
                zIndex: 4
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: 'calc(50% - 13px)',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--accent-primary, #ea580c)',
                  opacity: 0.3
                }} />
              </div>
            </div>
          )}

          {/* Footer Control Bar */}
          <div style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '0.5rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid #f2f2f7'
          }}>
            {/* Keyboard icon button on left */}
            <button
              type="button"
              onClick={() => setPickerMode(pickerMode === 'keyboard' ? 'hours' : 'keyboard')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-primary, #ea580c)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Keyboard size={18} />
            </button>

            {/* Confirm/Cancel actions on right */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsTimePickerOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-primary, #ea580c)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => setIsTimePickerOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-primary, #ea580c)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                OK
              </button>
            </div>
          </div>

        </div>,
        document.body
      )}
    </div>
  );
}

// Sub-component for Agenda Cards
function AgendaCard({ reminder, hasWriteAccess, onEdit, onShare, onDelete }) {
  return (
    <div
      style={{
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border-color, #e5e7eb)',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {/* Title */}
        <div>
          <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-primary, #111827)', letterSpacing: '-0.015em' }}>
            {reminder.title}
          </h4>
        </div>

        {/* Metadata Badges line (placed BELOW title) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.25rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid var(--accent-primary, #ea580c)',
            background: 'transparent',
            color: 'var(--accent-primary, #ea580c)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            Client: {reminder.client}
          </span>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.25rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid var(--accent-primary, #ea580c)',
            background: 'transparent',
            color: 'var(--accent-primary, #ea580c)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {reminder.meetingType === 'offline' ? <MapPin size={12} /> : <Video size={12} />}
            <span>{reminder.meetingType === 'offline' ? 'Offline' : 'Online'}</span>
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #6b7280)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} style={{ color: 'var(--accent-primary, #ea580c)' }} />
            <span>{reminder.time} ({reminder.duration})</span>
          </span>
          {reminder.attendees && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #6b7280)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Users size={12} style={{ color: 'var(--accent-primary, #ea580c)' }} />
              <span>{reminder.attendees.split(',').length} attendee{reminder.attendees.split(',').length !== 1 ? 's' : ''}</span>
            </span>
          )}
        </div>

        {/* Location & Description */}
        <div style={{ marginTop: '0.15rem' }}>
          {reminder.meetingType === 'offline' && reminder.location && (
            <div style={{ fontSize: '0.825rem', color: '#4b5563', margin: '4px 0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} style={{ color: 'var(--accent-primary, #ea580c)' }} />
              <span>Location: {reminder.location}</span>
            </div>
          )}
          {reminder.description && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #4b5563)', margin: 0, lineHeight: 1.45 }}>
              {reminder.description}
            </p>
          )}
        </div>

        {/* Join button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
          {reminder.meetingType !== 'offline' && reminder.meetingUrl && (
            <a 
              href={reminder.meetingUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                fontSize: '0.78rem',
                color: '#ffffff',
                background: 'var(--accent-primary, #ea580c)',
                padding: '0.45rem 1.15rem',
                borderRadius: '8px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(var(--accent-primary-rgb, 234, 88, 12), 0.25)',
                transition: 'opacity 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
              <Video size={14} /> Join now
            </a>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {/* Share Button (Available to all) */}
        <button
          onClick={() => onShare(reminder)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted, #6b7280)',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s'
          }}
          title="Share meeting details"
          onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-primary, #ea580c)'}
          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <Share2 size={16} />
        </button>

        {/* Edit and Delete Buttons (Only if hasWriteAccess) */}
        {hasWriteAccess && (
          <>
            <button
              onClick={() => onEdit(reminder)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #6b7280)',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s'
              }}
              title="Edit meeting"
              onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-primary, #ea580c)'}
              onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <Pencil size={16} />
            </button>

            <button
              onClick={() => onDelete(reminder._id, reminder.title)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #6b7280)',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s'
              }}
              title="Delete meeting"
              onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
              onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
