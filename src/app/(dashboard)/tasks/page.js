'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ClipboardList, 
  Search, 
  Briefcase, 
  User, 
  CalendarDays, 
  CheckCircle2, 
  Circle, 
  ArrowRight,
  ExternalLink,
  Plus,
  AlertTriangle,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function AllTasksPage() {
  const { showToast } = useNotification();
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [userCategory, setUserCategory] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  
  // Form states
  const [taskName, setTaskName] = useState('');
  const [taskProjectId, setTaskProjectId] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskStatus, setTaskStatus] = useState('Todo');
  const [taskNotes, setTaskNotes] = useState('');
  
  // Searchable project dropdown states
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to fetch tasks data');
      const data = await res.json();
      setProjects(data.allTimeProjects || []);
      if (data.employeeStats) {
        setEmployees(data.employeeStats);
      }
      if (data.category) {
        setUserCategory(data.category);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const isEmployee = userCategory === 'Employee';

  // Extract all tasks from projects (Exclude completed tasks from main view, but let filters show them if they want, wait, the original logic had if (!task.completed). Let's keep that or make it show completed tasks if statusFilter is all/completed. Actually let's include completed tasks too if statusFilter is 'all' or 'completed' so that they can see all tasks, or keep the original behavior where allTasks is just active ones. Wait, if we keep the original behavior:
  // "projects.forEach(project => { project.tasks.forEach(task => { if (!task.completed) { ... } }) })"
  // Let's modify it slightly to: if they want to manage tasks, including completed ones, they should see them. Or we can just extract all tasks including completed ones, and default status filter to 'active' or 'all'. Let's extract all tasks so they can search/edit completed ones too!)
  const allTasks = [];
  projects.forEach(project => {
    if (project.tasks && Array.isArray(project.tasks)) {
      project.tasks.forEach(task => {
        if (!task.completed && task.status !== 'Completed') {
          allTasks.push({
            ...task,
            projectId: project._id,
            projectName: project.name
          });
        }
      });
    }
  });

  // Toggle task completion
  const handleToggleComplete = async (projectId, taskId, currentCompleted, currentStatus) => {
    try {
      const project = projects.find(p => p._id === projectId);
      if (!project) return;

      const updatedTasks = project.tasks.map(t => {
        if (t._id === taskId) {
          const nextCompleted = !currentCompleted;
          return {
            ...t,
            completed: nextCompleted,
            status: nextCompleted ? 'Completed' : 'In Progress'
          };
        }
        return t;
      });

      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasks }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update task status');
      }
      
      showToast(currentCompleted ? 'Task marked as incomplete' : 'Task marked as completed', 'success');
      fetchProjects(); // Reload task data
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Helper to format date for input
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  // Open modal for Adding Task
  const handleOpenAddModal = () => {
    setModalMode('add');
    setSelectedTaskId(null);
    setTaskName('');
    setTaskProjectId(projects[0]?._id || '');
    setTaskAssignedTo('');
    setTaskDueDate('');
    setTaskPriority('Medium');
    setTaskStatus('Todo');
    setTaskNotes('');
    setProjectSearchTerm('');
    setIsProjectDropdownOpen(false);
    setIsModalOpen(true);
  };

  // Open modal for Editing Task
  const handleOpenEditModal = (task) => {
    setModalMode('edit');
    setSelectedTaskId(task._id);
    setTaskName(task.name || '');
    setTaskProjectId(task.projectId || '');
    setTaskAssignedTo(task.assignedTo || '');
    setTaskDueDate(formatDateForInput(task.dueDate));
    setTaskPriority(task.priority || 'Medium');
    setTaskStatus(task.status || 'Todo');
    setTaskNotes(task.notes || '');
    setProjectSearchTerm('');
    setIsProjectDropdownOpen(false);
    setIsModalOpen(true);
  };

  // Handle Save (Add or Edit)
  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!taskName.trim()) {
      showToast('Task name is required', 'error');
      return;
    }
    if (!taskProjectId) {
      showToast('Project is required', 'error');
      return;
    }

    try {
      if (modalMode === 'add') {
        const project = projects.find(p => p._id === taskProjectId);
        if (!project) throw new Error('Selected project not found');

        const newTask = {
          name: taskName,
          completed: taskStatus === 'Completed',
          status: taskStatus,
          assignedTo: taskAssignedTo,
          dueDate: taskDueDate ? new Date(taskDueDate) : null,
          priority: taskPriority,
          notes: taskNotes,
        };

        const res = await fetch(`/api/projects/${taskProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks: [...(project.tasks || []), newTask] }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to add task');
        }

        showToast('Task added successfully', 'success');
      } else {
        // Edit Mode
        const project = projects.find(p => p._id === taskProjectId);
        if (!project) throw new Error('Project not found');

        const updatedTasks = project.tasks.map(t => {
          if (t._id === selectedTaskId) {
            return {
              ...t,
              name: taskName,
              completed: taskStatus === 'Completed',
              status: taskStatus,
              assignedTo: taskAssignedTo,
              dueDate: taskDueDate ? new Date(taskDueDate) : null,
              priority: taskPriority,
              notes: taskNotes,
            };
          }
          return t;
        });

        const res = await fetch(`/api/projects/${taskProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks: updatedTasks }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to update task');
        }

        showToast('Task updated successfully', 'success');
      }

      setIsModalOpen(false);
      fetchProjects();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Delete Task
  const handleDeleteTask = async (projectId, taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const project = projects.find(p => p._id === projectId);
      if (!project) throw new Error('Project not found');

      const updatedTasks = project.tasks.filter(t => t._id !== taskId);

      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasks }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete task');
      }

      showToast('Task deleted successfully', 'success');
      fetchProjects();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Apply search and filters
  const filteredTasks = allTasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (task.projectName && task.projectName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'todo' && task.status === 'Todo') ||
                          (statusFilter === 'in-progress' && task.status === 'In Progress') ||
                          (statusFilter === 'completed' && task.status === 'Completed');
                          
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesProject = projectFilter === 'all' || task.projectId === projectFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesProject;
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardList size={28} style={{ color: 'var(--accent-primary)' }} />
            <span>All Tasks</span>
          </h1>
          <p className="page-subtitle">Track, filter, and manage tasks across all active company projects.</p>
        </div>
        {!isEmployee && (
          <button 
            onClick={handleOpenAddModal} 
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px' }}
          >
            <Plus size={18} />
            <span>Add Task</span>
          </button>
        )}
      </div>

      {/* Filters Segment */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Search Box */}
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search tasks or projects..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '36px', width: '100%', borderRadius: '8px' }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: '150px' }}>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)} 
              className="form-select"
              style={{ borderRadius: '8px', width: '100%' }}
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div style={{ minWidth: '150px' }}>
            <select 
              value={priorityFilter} 
              onChange={(e) => setPriorityFilter(e.target.value)} 
              className="form-select"
              style={{ borderRadius: '8px', width: '100%' }}
            >
              <option value="all">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Project Filter */}
          <div style={{ minWidth: '200px' }}>
            <select 
              value={projectFilter} 
              onChange={(e) => setProjectFilter(e.target.value)} 
              className="form-select"
              style={{ borderRadius: '8px', width: '100%' }}
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }}></div>
          <h3 style={{ marginTop: '1rem' }}>Loading all tasks...</h3>
        </div>
      ) : error ? (
        <div className="empty-state" style={{ color: '#ef4444' }}>
          <AlertTriangle size={48} />
          <h3>Error loading tasks</h3>
          <p>{error}</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state">
          <CheckCircle2 size={48} style={{ color: '#10b981', opacity: 0.7 }} />
          <h3>No tasks found</h3>
          <p>Try modifying your search query or filter options.</p>
        </div>
      ) : (
        <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Task Title</th>
                <th>Project</th>
                <th>Assigned To</th>
                <th>Due Date</th>
                <th>Priority</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => {
                const isOverdue = !task.completed && task.dueDate && new Date(task.dueDate) < new Date();
                
                return (
                  <tr key={task._id} className="premium-table-row">
                    <td>
                      <button 
                        onClick={() => handleToggleComplete(task.projectId, task._id, task.completed, task.status)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: task.completed ? 'var(--status-completed, #10b981)' : 'var(--text-muted)' }}
                        title={task.completed ? "Mark incomplete" : "Mark completed"}
                      >
                        {task.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                    </td>
                    <td style={{ fontWeight: 600, color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none' }}>
                      {task.name}
                    </td>
                    <td>
                      <Link href={`/projects/${task.projectId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
                        <Briefcase size={12} />
                        <span>{task.projectName}</span>
                      </Link>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        <User size={12} />
                        <span>{task.assignedTo || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td>
                      {task.dueDate ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: isOverdue ? 'var(--status-overdue, #ef4444)' : 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: isOverdue ? 700 : 500 }}>
                          <CalendarDays size={12} />
                          <span>{new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge-post-type ${task.priority?.toLowerCase() === 'high' ? 'reel' : task.priority?.toLowerCase() === 'low' ? 'motion' : 'carousel'}`} style={{ fontSize: '0.72rem', padding: '0.15rem 0.55rem', borderRadius: '4px', textTransform: 'capitalize' }}>
                        {task.priority || 'Medium'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${task.completed ? 'completed' : task.status === 'In Progress' ? 'progress' : 'planning'}`} style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem' }}>
                        {task.completed ? 'Completed' : task.status || 'Todo'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'center' }}>
                        <Link href={`/projects/${task.projectId}`} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                          <span>Project</span>
                          <ExternalLink size={12} />
                        </Link>
                        {!isEmployee && (
                          <>
                            <button 
                              onClick={() => handleOpenEditModal(task)} 
                              className="btn btn-secondary" 
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem', borderRadius: '6px', color: 'var(--accent-primary)', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                              title="Edit Task"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteTask(task.projectId, task._id)} 
                              className="btn btn-secondary" 
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem', borderRadius: '6px', color: 'var(--status-overdue, #ef4444)', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}
                              title="Delete Task"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Task Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{ background: 'none', backdropFilter: 'none' }}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                {modalMode === 'add' ? 'Add New Task' : 'Edit Task'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTask}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Task Name *</label>
                <input 
                  type="text" 
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="form-input"
                  placeholder="Enter task name"
                  required
                  style={{ width: '100%', borderRadius: '8px' }}
                />
              </div>

              {modalMode === 'add' ? (
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Project *</label>
                  
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text"
                      placeholder="Search and select project..."
                      value={isProjectDropdownOpen ? projectSearchTerm : (projects.find(p => p._id === taskProjectId)?.name || '')}
                      onFocus={() => {
                        setIsProjectDropdownOpen(true);
                        setProjectSearchTerm('');
                      }}
                      onChange={(e) => {
                        setProjectSearchTerm(e.target.value);
                        setIsProjectDropdownOpen(true);
                      }}
                      onBlur={() => {
                        // Small timeout to allow option click to register before dropdown closes
                        setTimeout(() => {
                          setIsProjectDropdownOpen(false);
                        }, 200);
                      }}
                      className="form-input"
                      style={{ width: '100%', borderRadius: '8px', paddingRight: '2.5rem' }}
                      required
                    />
                    <div 
                      onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}
                    >
                      <Search size={16} />
                    </div>

                    {isProjectDropdownOpen && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: 0, 
                        right: 0, 
                        background: 'var(--bg-secondary)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '8px', 
                        marginTop: '4px', 
                        maxHeight: '200px', 
                        overflowY: 'auto', 
                        zIndex: 1010,
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' 
                      }}>
                        {projects.filter(p => p.name.toLowerCase().includes(projectSearchTerm.toLowerCase())).length === 0 ? (
                          <div style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No projects found</div>
                        ) : (
                          projects
                            .filter(p => p.name.toLowerCase().includes(projectSearchTerm.toLowerCase()))
                            .map(p => (
                              <div 
                                key={p._id}
                                onClick={() => {
                                  setTaskProjectId(p._id);
                                  setIsProjectDropdownOpen(false);
                                }}
                                style={{ 
                                  padding: '0.75rem 1rem', 
                                  cursor: 'pointer', 
                                  fontSize: '0.875rem',
                                  color: 'var(--text-primary)',
                                  background: taskProjectId === p._id ? 'rgba(0, 174, 239, 0.15)' : 'transparent',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.05)'}
                                onMouseLeave={(e) => e.target.style.background = taskProjectId === p._id ? 'rgba(0, 174, 239, 0.15)' : 'transparent'}
                              >
                                {p.name}
                              </div>
                            ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Project</label>
                  <input 
                    type="text" 
                    value={projects.find(p => p._id === taskProjectId)?.name || ''} 
                    disabled 
                    className="form-input" 
                    style={{ width: '100%', borderRadius: '8px', opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Assigned To</label>
                <select 
                  value={taskAssignedTo}
                  onChange={(e) => setTaskAssignedTo(e.target.value)}
                  className="form-select"
                  style={{ width: '100%', borderRadius: '8px' }}
                >
                  <option value="">Unassigned</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp.username}>{emp.username}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Priority</label>
                  <select 
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="form-select"
                    style={{ width: '100%', borderRadius: '8px' }}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Status</label>
                  <select 
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value)}
                    className="form-select"
                    style={{ width: '100%', borderRadius: '8px' }}
                  >
                    <option value="Todo">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Due Date</label>
                <input 
                  type="date" 
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', borderRadius: '8px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Notes</label>
                <textarea 
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  className="form-input"
                  placeholder="Add any additional details..."
                  rows="3"
                  style={{ width: '100%', borderRadius: '8px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="btn btn-secondary"
                  style={{ borderRadius: '8px', padding: '0.6rem 1.2rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ borderRadius: '8px', padding: '0.6rem 1.2rem' }}
                >
                  {modalMode === 'add' ? 'Create Task' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
