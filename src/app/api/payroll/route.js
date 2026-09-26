import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Payroll from '@/models/Payroll';
import User from '@/models/User';
import { getRequestSession } from '@/lib/auth';

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

    let query = {};
    if (category === 'Employee' || (role !== 'superadmin' && role !== 'company_admin')) {
      query = { userId };
    } else if (filterCompanyId) {
      query = { companyId: filterCompanyId };
    }

    const payrolls = await Payroll.find(query)
      .populate('userId', 'username email role')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, payrolls });
  } catch (error) {
    console.error('Payroll GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || (session.role !== 'company_admin' && session.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      targetUserId,
      month,
      basicSalary,
      allowances,
      deductions,
      status,
      notes,
      effectiveWorkDays,
      lopDays,
      customEarnings,
      customDeductions,
      employeeNo,
      designation,
      department,
      location,
      bankName,
      bankAccountNo,
      panNumber,
      pfUan,
      joiningDate
    } = body;

    if (!targetUserId || !month) {
      return NextResponse.json({ error: 'Employee and Month are required' }, { status: 400 });
    }

    const targetUser = await User.findById(targetUserId).lean();
    if (!targetUser) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const basic = basicSalary !== undefined ? (Number(basicSalary) || 0) : (targetUser.salary?.basicSalary || 0);

    const finalCustomEarnings = Array.isArray(customEarnings)
      ? customEarnings.map(i => ({ label: i.label || '', amount: Number(i.amount) || 0 }))
      : (targetUser.salary?.customEarnings || []);

    const finalCustomDeductions = Array.isArray(customDeductions)
      ? customDeductions.map(i => ({ label: i.label || '', amount: Number(i.amount) || 0 }))
      : (targetUser.salary?.customDeductions || []);

    const sumEarnings = finalCustomEarnings.reduce((s, i) => s + (i.amount || 0), 0);
    const allow = allowances !== undefined ? (Number(allowances) || 0) : (targetUser.salary?.allowances || sumEarnings);

    const sumDeductions = finalCustomDeductions.reduce((s, i) => s + (i.amount || 0), 0);
    const deduct = deductions !== undefined ? (Number(deductions) || 0) : (targetUser.salary?.deductions || sumDeductions);

    const net = Math.max(0, basic + allow - deduct);

    const payroll = await Payroll.create({
      userId: targetUserId,
      companyId: targetUser.companyId || session.companyId,
      month,
      employeeNo: employeeNo || targetUser.employeeNo || '',
      designation: designation || targetUser.designation || targetUser.category || '',
      department: department || targetUser.department || '',
      location: location || targetUser.location || '',
      bankName: bankName || targetUser.bankName || '',
      bankAccountNo: bankAccountNo || targetUser.bankAccountNo || '',
      panNumber: panNumber || targetUser.panNumber || '',
      pfUan: pfUan || targetUser.pfUan || '',
      joiningDate: joiningDate || targetUser.joiningDate || '',
      effectiveWorkDays: effectiveWorkDays !== undefined ? Number(effectiveWorkDays) : 30,
      lopDays: lopDays !== undefined ? Number(lopDays) : 0,
      basicSalary: basic,
      allowances: allow,
      deductions: deduct,
      netSalary: net,
      customEarnings: finalCustomEarnings,
      customDeductions: finalCustomDeductions,
      status: status || 'Pending',
      notes: notes || '',
      paymentDate: status === 'Paid' ? new Date() : null,
    });

    return NextResponse.json({ success: true, payroll });
  } catch (error) {
    console.error('Payroll POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
