import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import Project from '@/models/Project';
import LoginHistory from '@/models/LoginHistory';
import { getRequestSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request, context) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await context?.params;
    const id = resolvedParams?.id;
    if (!id) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    const targetUser = await User.findById(id)
      .populate('customRole')
      .populate('companyId', 'name slug logo')
      .select('-password')
      .lean();

    if (!targetUser) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Permission check: admins can only view employees belonging to their company (and not superadmin accounts)
    if (session.role !== 'superadmin') {
      if (targetUser.role === 'superadmin') {
        return NextResponse.json({ error: 'Access denied: Super admin accounts cannot be managed here' }, { status: 403 });
      }
      const userCompId = targetUser.companyId?._id ? targetUser.companyId._id.toString() : targetUser.companyId?.toString();
      if (userCompId && session.companyId && userCompId !== session.companyId) {
        return NextResponse.json({ error: 'Access denied: You can only view employees in your company' }, { status: 403 });
      }
    }

    const empIdStr = targetUser._id.toString();

    // Fetch Attendance history, Projects, and LoginHistory in parallel
    const [attendanceLogs, companyProjects, loginHistory] = await Promise.all([
      Attendance.find({ userId: targetUser._id })
        .sort({ date: -1 })
        .limit(100)
        .lean(),
      Project.find(targetUser.companyId ? { companyId: targetUser.companyId._id || targetUser.companyId } : {})
        .lean(),
      LoginHistory.find({ userId: targetUser._id })
        .sort({ loginTime: -1 })
        .limit(30)
        .lean(),
    ]);

    // Attendance breakdown
    const totalPresent = attendanceLogs.filter((a) => a.status === 'Present').length;
    const totalHalfDays = attendanceLogs.filter((a) => a.status === 'Half-day').length;
    const totalLeaves = attendanceLogs.filter((a) => a.status === 'On Leave').length;
    const totalAbsent = attendanceLogs.filter((a) => a.status === 'Absent').length;
    const totalAttendanceMins = attendanceLogs.reduce((sum, a) => sum + (a.totalWorkMinutes || 0), 0);
    const totalBreakMins = attendanceLogs.reduce((sum, a) => sum + (a.totalBreakMinutes || 0), 0);

    // Extract all tasks assigned to this employee across all projects
    const assignedTasks = [];
    let completedCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let totalTaskMins = 0;
    const now = new Date();

    companyProjects.forEach((proj) => {
      (proj.tasks || []).forEach((t) => {
        if (t.assignedTo === targetUser.username || t.assignedTo === empIdStr) {
          const isCompleted = t.completed || t.status === 'Completed';
          if (isCompleted) {
            completedCount++;
          } else {
            pendingCount++;
            if (t.dueDate && new Date(t.dueDate) < now) {
              overdueCount++;
            }
          }

          totalTaskMins += t.totalTimeSpent || 0;

          assignedTasks.push({
            taskId: t._id ? t._id.toString() : null,
            name: t.name,
            projectName: proj.name,
            projectId: proj._id ? proj._id.toString() : null,
            projectStatus: proj.status,
            completed: isCompleted,
            status: t.status || (isCompleted ? 'Completed' : 'Todo'),
            priority: t.priority || 'Medium',
            dueDate: t.dueDate || null,
            assignedBy: t.assignedBy || '',
            notes: t.notes || '',
            totalTimeSpent: t.totalTimeSpent || 0,
            timeLogs: t.timeLogs || [],
          });
        }
      });
    });

    const taskCompletionRate = assignedTasks.length > 0
      ? Math.round((completedCount / assignedTasks.length) * 100)
      : 100;

    return NextResponse.json({
      success: true,
      employee: {
        _id: targetUser._id,
        username: targetUser.username,
        email: targetUser.email || '',
        whatsapp: targetUser.whatsapp || '',
        role: targetUser.role,
        customRole: targetUser.customRole ? {
          id: targetUser.customRole._id,
          name: targetUser.customRole.name,
          permissions: targetUser.customRole.permissions
        } : null,
        company: targetUser.companyId ? {
          id: targetUser.companyId._id,
          name: targetUser.companyId.name,
          logo: targetUser.companyId.logo
        } : null,
        isOnline: !!targetUser.isOnline,
        lastActive: targetUser.lastActive || null,
        createdAt: targetUser.createdAt,
        salary: targetUser.salary || {
          basicSalary: 0,
          allowances: 0,
          deductions: 0,
          netSalary: 0,
          currency: 'INR'
        },
      },
      summary: {
        attendance: {
          totalPresent,
          totalHalfDays,
          totalLeaves,
          totalAbsent,
          totalWorkHours: Math.round(totalAttendanceMins / 60),
          totalBreakHours: Math.round(totalBreakMins / 60),
          logsCount: attendanceLogs.length,
          avgDailyHours: attendanceLogs.length > 0 ? (totalAttendanceMins / (attendanceLogs.length * 60)).toFixed(1) : '0'
        },
        tasks: {
          totalAssigned: assignedTasks.length,
          completedCount,
          pendingCount,
          overdueCount,
          completionRate: taskCompletionRate,
          totalTaskHoursSpent: Math.round(totalTaskMins / 60)
        }
      },
      attendanceLogs: attendanceLogs.map((a) => ({
        _id: a._id,
        date: a.date,
        clockIn: a.clockIn,
        clockOut: a.clockOut,
        status: a.status,
        totalWorkMinutes: a.totalWorkMinutes || 0,
        totalBreakMinutes: a.totalBreakMinutes || 0,
        breaksCount: a.breaks?.length || 0,
        notes: a.notes || '',
        location: a.location || null
      })),
      tasks: assignedTasks,
      loginHistory: loginHistory.map((l) => ({
        _id: l._id,
        loginTime: l.loginTime,
        logoutTime: l.logoutTime,
        duration: l.duration || 0,
        ip: l.ipAddress || '—',
        userAgent: l.userAgent || ''
      }))
    });
  } catch (error) {
    console.error('Employee Detail API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
