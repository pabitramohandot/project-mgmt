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
  AlertTriangle
} from 'lucide-react';
import { useNotification } from '@/components/NotificationProvider';

export default function AllTasksPage() {
  const { showToast } = useNotification();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [userCategory, setUserCategory] = useState('');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to fetch tasks data');
      const data = await res.json();
      setProjects(data.allTimeProjects || []);
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

  // Extract all tasks from projects (Exclude completed tasks)
  const allTasks = [];
  projects.forEach(project => {
    if (project.tasks && Array.isArray(project.tasks)) {
      project.tasks.forEach(task => {
        if (!task.completed) {
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

      if (!res.ok) throw new Error('Failed to update task status');
      
      showToast('Task marked as completed', 'success');
      fetchProjects(); // Reload task data
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
                          (statusFilter === 'in-progress' && task.status === 'In Progress');
                          
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
                      <Link href={`/projects/${task.projectId}`} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                        <span>Project</span>
                        <ExternalLink size={12} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
