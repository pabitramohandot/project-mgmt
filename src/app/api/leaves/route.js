import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Leave from '@/models/Leave';
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
      // Employees see their own leaves
      query = { userId };
    } else if (filterCompanyId) {
      query = { companyId: filterCompanyId };
    }

    const leaves = await Leave.find(query)
      .populate('userId', 'username email role')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, leaves });
  } catch (error) {
    console.error('Leaves GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.userId || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leaveType, startDate, endDate, reason } = body;

    if (!startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'Start date, end date, and reason are required' }, { status: 400 });
    }

    const user = await User.findById(session.userId).lean();

    const leave = await Leave.create({
      userId: session.userId,
      companyId: session.companyId,
      leaveType: leaveType || 'Casual Leave',
      startDate,
      endDate,
      reason,
      status: 'Pending',
      appliedBy: user?.username || 'Employee'
    });

    return NextResponse.json({ success: true, leave });
  } catch (error) {
    console.error('Leaves POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await User.findById(session.userId).populate('customRole').lean();
    const category = await getCategoryForUser(currentUser);

    if (category === 'Employee' && session.role !== 'company_admin' && session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Only admins and managers can approve/reject leaves' }, { status: 403 });
    }

    const body = await request.json();
    const targetLeaveId = body.leaveId || body.id;
    const { status, adminNote } = body;

    if (!targetLeaveId || !status) {
      return NextResponse.json({ error: 'Leave ID and status are required' }, { status: 400 });
    }

    const leave = await Leave.findById(targetLeaveId);
    if (!leave) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    leave.status = status;
    if (adminNote !== undefined) leave.adminNote = adminNote;
    await leave.save();

    return NextResponse.json({ success: true, leave });
  } catch (error) {
    console.error('Leaves PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
