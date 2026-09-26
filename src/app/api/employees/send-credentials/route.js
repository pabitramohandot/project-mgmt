import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Company from '@/models/Company';
import { getRequestSession } from '@/lib/auth';
import { sendOnboardingEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || (session.role !== 'company_admin' && session.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }

    const { employeeId, customPassword } = await request.json();
    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    const employee = await User.findById(employeeId).lean();
    if (!employee) {
      return NextResponse.json({ error: 'Employee account not found' }, { status: 404 });
    }

    if (!employee.email) {
      return NextResponse.json({ error: 'Employee does not have an email address specified' }, { status: 400 });
    }

    let companyName = 'IONETWEB';
    if (employee.companyId) {
      const company = await Company.findById(employee.companyId).lean();
      if (company) companyName = company.name;
    }

    const passToUse = customPassword || 'Check with your Admin for initial password';

    const result = await sendOnboardingEmail(
      employee.email.trim().toLowerCase(),
      employee.username,
      employee.username,
      passToUse,
      companyName
    );

    if (result.success) {
      return NextResponse.json({ success: true, message: `Login instructions sent to ${employee.email}` });
    } else {
      return NextResponse.json({ error: result.error || 'Failed to dispatch credentials email' }, { status: 500 });
    }
  } catch (error) {
    console.error('Send credentials error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
