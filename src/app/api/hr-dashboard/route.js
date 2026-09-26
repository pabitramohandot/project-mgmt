import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Company from '@/models/Company';
import Attendance from '@/models/Attendance';
import Leave from '@/models/Leave';
import Onboarding from '@/models/Onboarding';
import Payroll from '@/models/Payroll';
import Holiday from '@/models/Holiday';
import { getRequestSession } from '@/lib/auth';
import { getCategoryForUser } from '@/lib/permissions';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, role, userId } = session;
    let currentUser = null;
    let category = 'Admin';
    try {
      currentUser = await User.findById(userId).populate('customRole').lean();
      if (currentUser) {
        category = await getCategoryForUser(currentUser);
      }
    } catch (e) {
      console.error('Error fetching user in HR Dashboard:', e);
    }

    if (category === 'Employee' && role !== 'company_admin' && role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Access Denied. HR Dashboard is restricted to Admin & HR Management.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filterCompanyId = searchParams.get('companyId') || companyId;
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    let userQuery = { role: { $ne: 'superadmin' } };
    let companyQuery = {};

    const validCompanyId = filterCompanyId && mongoose.Types.ObjectId.isValid(filterCompanyId) ? filterCompanyId : null;

    if (validCompanyId) {
      userQuery.companyId = validCompanyId;
      companyQuery.companyId = validCompanyId;
    } else if (role !== 'superadmin') {
      if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
        userQuery.companyId = companyId;
        companyQuery.companyId = companyId;
      } else {
        return NextResponse.json({
          success: true,
          companyName: 'Workspace',
          todayStr,
          metrics: {
            totalEmployees: 0,
            employeeLimit: 0,
            departmentCounts: {},
            attendance: { presentToday: 0, onLeaveToday: 0, totalEmployees: 0, attendancePercentage: 0, recentClockIns: [] },
            onboarding: { activeCount: 0, completedCount: 0, recent: [] },
            leaves: { pendingCount: 0, pendingList: [], recentList: [] },
            payroll: { currentMonth: currentMonthStr, currency: 'INR', totalPayrollAmount: 0, paidPayrollCount: 0, pendingPayrollCount: 0, recordCount: 0 },
            upcomingHolidays: []
          }
        });
      }
    }

    // 1. Fetch Users & Workforce Breakdown
    let users = [];
    try {
      users = await User.find(userQuery)
        .select('username email role category companyId createdAt')
        .populate('customRole', 'name')
        .lean();
    } catch (e) {
      console.error('Users query error in HR Dashboard:', e);
    }

    const totalEmployees = users.length;
    const departmentCounts = {};
    users.forEach(u => {
      const dept = u.category || u.customRole?.name || 'General';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });

    // Fetch Company details
    let employeeLimit = 0;
    let companyName = 'Workspace';
    let currency = 'INR';
    if (validCompanyId) {
      try {
        const comp = await Company.findById(validCompanyId).lean();
        if (comp) {
          employeeLimit = comp.employeeLimit || 0;
          companyName = comp.name || companyName;
          currency = comp.currency || 'INR';
        }
      } catch (e) {
        console.error('Company fetch error in HR Dashboard:', e);
      }
    }

    // 2. Attendance Today
    let todayAttendance = [];
    try {
      todayAttendance = await Attendance.find({ ...companyQuery, date: todayStr })
        .populate('userId', 'username email category')
        .sort({ clockIn: -1 })
        .lean();
    } catch (e) {
      console.error('Attendance query error in HR Dashboard:', e);
    }

    const presentToday = todayAttendance.filter(a => a.status === 'Present' || a.clockIn).length;
    const onLeaveToday = todayAttendance.filter(a => a.status === 'On Leave').length;
    const attendancePercentage = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;

    // 3. Onboarding Status
    let onboardings = [];
    try {
      onboardings = await Onboarding.find(companyQuery)
        .populate('userId', 'username email category')
        .sort({ createdAt: -1 })
        .lean();
    } catch (e) {
      console.error('Onboarding query error in HR Dashboard:', e);
    }

    const activeOnboardings = onboardings.filter(o => o.status === 'In Progress').length;
    const completedOnboardings = onboardings.filter(o => o.status === 'Completed').length;
    const recentOnboardings = onboardings.slice(0, 5);

    // 4. Pending & Recent Leaves
    let pendingLeaves = [];
    let recentLeaves = [];
    try {
      pendingLeaves = await Leave.find({ ...companyQuery, status: 'Pending' })
        .populate('userId', 'username email category')
        .sort({ createdAt: -1 })
        .lean();

      recentLeaves = await Leave.find(companyQuery)
        .populate('userId', 'username email category')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean();
    } catch (e) {
      console.error('Leaves query error in HR Dashboard:', e);
    }

    // 5. Payroll Summary for Current Month
    let payrolls = [];
    try {
      payrolls = await Payroll.find({ ...companyQuery, month: currentMonthStr })
        .select('netSalary status month userId')
        .lean();
    } catch (e) {
      console.error('Payroll query error in HR Dashboard:', e);
    }

    const totalPayrollAmount = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
    const paidPayrollCount = payrolls.filter(p => p.status === 'Paid').length;
    const pendingPayrollCount = payrolls.filter(p => p.status === 'Pending' || p.status === 'Processing').length;

    // 6. Upcoming Holidays
    let upcomingHolidays = [];
    try {
      upcomingHolidays = await Holiday.find({
        ...companyQuery,
        date: { $gte: todayStr }
      })
        .sort({ date: 1 })
        .limit(5)
        .lean();
    } catch (e) {
      console.error('Holiday query error in HR Dashboard:', e);
    }

    return NextResponse.json({
      success: true,
      companyName,
      todayStr,
      metrics: {
        totalEmployees,
        employeeLimit,
        departmentCounts,
        attendance: {
          presentToday,
          onLeaveToday,
          totalEmployees,
          attendancePercentage,
          recentClockIns: todayAttendance.slice(0, 5)
        },
        onboarding: {
          activeCount: activeOnboardings,
          completedCount: completedOnboardings,
          recent: recentOnboardings
        },
        leaves: {
          pendingCount: pendingLeaves.length,
          pendingList: pendingLeaves.slice(0, 6),
          recentList: recentLeaves
        },
        payroll: {
          currentMonth: currentMonthStr,
          currency,
          totalPayrollAmount,
          paidPayrollCount,
          pendingPayrollCount,
          recordCount: payrolls.length
        },
        upcomingHolidays
      }
    });
  } catch (error) {
    console.error('HR Dashboard GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
