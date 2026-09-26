import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import Project from '@/models/Project';
import Role from '@/models/Role';
import { getRequestSession, hashPassword } from '@/lib/auth';

import { getCategoryForUser } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, role, userId } = session;
    const currentUser = await User.findById(userId).populate('customRole').lean();
    const category = await getCategoryForUser(currentUser);

    const { searchParams } = new URL(request.url);
    const filterCompanyId = searchParams.get('companyId') || companyId;

    let userQuery = { role: { $ne: 'superadmin' } };
    if (category === 'Employee' || (role !== 'superadmin' && role !== 'company_admin' && currentUser?.category === 'Employee')) {
      userQuery._id = userId;
    } else if (filterCompanyId) {
      userQuery.companyId = filterCompanyId;
    } else if (role !== 'superadmin') {
      if (!companyId) {
        return NextResponse.json({ error: 'No company associated' }, { status: 400 });
      }
      userQuery.companyId = companyId;
    }

    const effectiveCompanyId = filterCompanyId || companyId;

    // Fetch users, attendance, and projects in parallel
    const [users, allAttendance, allProjects] = await Promise.all([
      User.find(userQuery)
        .populate('customRole')
        .populate('companyId', 'name slug logo')
        .select('-password')
        .sort({ createdAt: -1 })
        .lean(),
      Attendance.find(effectiveCompanyId ? { companyId: effectiveCompanyId } : (role === 'superadmin' ? {} : { companyId }))
        .sort({ date: -1 })
        .lean(),
      Project.find(effectiveCompanyId ? { companyId: effectiveCompanyId } : (role === 'superadmin' ? {} : { companyId }))
        .lean(),
    ]);

    const Company = (await import('@/models/Company')).default;
    let companyDoc = companyId ? await Company.findById(companyId).select('currency').lean() : null;
    const activeCompanyCurrency = companyDoc?.currency || 'INR';

    const todayStr = new Date().toISOString().split('T')[0];

    const employeesWithAnalytics = users.map((emp) => {
      const empIdStr = emp._id.toString();

      // Attendance Analytics
      const empAttendance = allAttendance.filter((a) => a.userId.toString() === empIdStr);
      const totalPresent = empAttendance.filter((a) => a.status === 'Present').length;
      const totalHalfDays = empAttendance.filter((a) => a.status === 'Half-day').length;
      const totalLeaves = empAttendance.filter((a) => a.status === 'On Leave').length;
      const totalAttendanceMins = empAttendance.reduce((sum, a) => sum + (a.totalWorkMinutes || 0), 0);
      
      const todayAttendance = empAttendance.find((a) => a.date === todayStr);

      // Tasks Analytics across all company projects
      let assignedTasksCount = 0;
      let completedTasksCount = 0;
      let pendingTasksCount = 0;
      let totalTaskMinsSpent = 0;

      allProjects.forEach((proj) => {
        if (proj.columns) {
          proj.columns.forEach((col) => {
            if (col.tasks) {
              col.tasks.forEach((task) => {
                const isAssigned = task.assignees && task.assignees.some((assigneeId) => assigneeId.toString() === empIdStr);
                if (isAssigned) {
                  assignedTasksCount++;
                  if (col.name?.toLowerCase().includes('done') || col.name?.toLowerCase().includes('complete') || task.completed) {
                    completedTasksCount++;
                  } else {
                    pendingTasksCount++;
                  }
                  if (task.timeSpent) {
                    totalTaskMinsSpent += task.timeSpent;
                  }
                }
              });
            }
          });
        }
      });

      const taskCompletionRate = assignedTasksCount > 0 ? Math.round((completedTasksCount / assignedTasksCount) * 100) : 0;

      return {
        _id: emp._id.toString(),
        username: emp.username,
        email: emp.email || null,
        whatsapp: emp.whatsapp || null,
        role: emp.role,
        category: emp.category || 'Employee',
        customRole: emp.customRole ? {
          _id: emp.customRole._id.toString(),
          name: emp.customRole.name
        } : null,
        customRoleName: emp.customRole?.name || null,
        company: emp.companyId ? {
          id: emp.companyId._id,
          name: emp.companyId.name,
          logo: emp.companyId.logo
        } : null,
        isOnline: !!emp.isOnline,
        lastActive: emp.lastActive || null,
        createdAt: emp.createdAt,
        todayStatus: todayAttendance ? {
          clockIn: todayAttendance.clockIn,
          clockOut: todayAttendance.clockOut,
          status: todayAttendance.status,
          onBreak: todayAttendance.breaks?.some(b => !b.end) || false
        } : null,
        employeeNo: emp.employeeNo || '',
        designation: emp.designation || '',
        department: emp.department || '',
        location: emp.location || '',
        bankName: emp.bankName || '',
        bankAccountNo: emp.bankAccountNo || '',
        panNumber: emp.panNumber || '',
        pfUan: emp.pfUan || '',
        joiningDate: emp.joiningDate || '',
        salary: {
          basicSalary: emp.salary?.basicSalary || 0,
          allowances: emp.salary?.allowances || 0,
          deductions: emp.salary?.deductions || 0,
          netSalary: emp.salary?.netSalary || 0,
          currency: emp.salary?.currency || activeCompanyCurrency,
          customEarnings: emp.salary?.customEarnings || [],
          customDeductions: emp.salary?.customDeductions || [],
        },
        analytics: {
          totalPresent,
          totalHalfDays,
          totalLeaves,
          totalAttendanceHours: Math.round(totalAttendanceMins / 60),
          assignedTasksCount,
          completedTasksCount,
          pendingTasksCount,
          taskCompletionRate,
          totalTaskHoursSpent: Math.round(totalTaskMinsSpent / 60),
        }
      };
    });

    return NextResponse.json({
      success: true,
      employees: employeesWithAnalytics,
      totalEmployees: employeesWithAnalytics.length
    });
  } catch (error) {
    console.error('Employees API GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || (session.role !== 'company_admin' && session.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }

    const {
      employeeId,
      username,
      email,
      whatsapp,
      password,
      customRoleId,
      employeeNo,
      designation,
      department,
      location,
      bankName,
      bankAccountNo,
      panNumber,
      pfUan,
      joiningDate,
      salary
    } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const employee = await User.findById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: 'Employee account not found' }, { status: 404 });
    }

    // Company Admin check: ensure employee belongs to the same company
    if (session.role === 'company_admin' && employee.companyId?.toString() !== session.companyId) {
      return NextResponse.json({ error: 'Access denied to this employee' }, { status: 403 });
    }

    if (username && username.trim() !== employee.username) {
      const existing = await User.findOne({ username: username.trim(), _id: { $ne: employee._id } });
      if (existing) {
        return NextResponse.json({ error: 'Username already in use by another user' }, { status: 400 });
      }
      employee.username = username.trim();
    }

    if (email !== undefined) {
      employee.email = email ? email.trim().toLowerCase() : '';
    }

    if (whatsapp !== undefined) {
      employee.whatsapp = whatsapp ? whatsapp.trim() : '';
    }

    if (employeeNo !== undefined) employee.employeeNo = employeeNo.trim();
    if (designation !== undefined) employee.designation = designation.trim();
    if (department !== undefined) employee.department = department.trim();
    if (location !== undefined) employee.location = location.trim();
    if (bankName !== undefined) employee.bankName = bankName.trim();
    if (bankAccountNo !== undefined) employee.bankAccountNo = bankAccountNo.trim();
    if (panNumber !== undefined) employee.panNumber = panNumber.trim();
    if (pfUan !== undefined) employee.pfUan = pfUan.trim();
    if (joiningDate !== undefined) employee.joiningDate = joiningDate;

    if (customRoleId !== undefined) {
      if (customRoleId) {
        const roleObj = await Role.findById(customRoleId).lean();
        if (roleObj) {
          employee.customRole = roleObj._id;
          employee.category = roleObj.name;
        }
      } else {
        employee.customRole = null;
        employee.category = 'Employee';
      }
    }

    if (password && password.trim()) {
      employee.password = await hashPassword(password.trim());
    }

    if (salary !== undefined && salary !== null) {
      const basicSalary = Number(salary.basicSalary) || 0;
      const customEarnings = Array.isArray(salary.customEarnings)
        ? salary.customEarnings.map(item => ({ label: item.label || '', amount: Number(item.amount) || 0 }))
        : [];
      const customDeductions = Array.isArray(salary.customDeductions)
        ? salary.customDeductions.map(item => ({ label: item.label || '', amount: Number(item.amount) || 0 }))
        : [];

      const sumCustomEarnings = customEarnings.reduce((s, i) => s + (i.amount || 0), 0);
      const allowances = salary.allowances !== undefined ? Number(salary.allowances) : sumCustomEarnings;
      const sumCustomDeductions = customDeductions.reduce((s, i) => s + (i.amount || 0), 0);
      const deductions = salary.deductions !== undefined ? Number(salary.deductions) : sumCustomDeductions;
      const netSalary = Math.max(0, (basicSalary + allowances) - deductions);

      const Company = (await import('@/models/Company')).default;
      let companyDoc = employee.companyId ? await Company.findById(employee.companyId).select('currency').lean() : null;
      const activeCompanyCurrency = companyDoc?.currency || 'INR';
      const currency = salary.currency || activeCompanyCurrency;

      employee.salary = {
        basicSalary,
        allowances,
        deductions,
        netSalary,
        currency,
        customEarnings,
        customDeductions,
      };
    }

    await employee.save();

    return NextResponse.json({ success: true, employee });
  } catch (error) {
    console.error('Employees API PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
