import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Company from '@/models/Company';
import Role from '@/models/Role';
import { getRequestSession, hashPassword } from '@/lib/auth';

export async function GET(request) {
  try {
    const { role } = getRequestSession(request);
    if (role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const users = await User.find()
      .populate('companyId', 'name slug')
      .populate('customRole', 'name')
      .sort({ createdAt: -1 })
      .lean();
      
    return NextResponse.json(users);
  } catch (error) {
    console.error('Superadmin Users GET API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { role, companyId: adminCompanyId } = getRequestSession(request);
    if (role !== 'superadmin' && role !== 'company_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const data = await request.json();

    let { username, password, role: targetRole, companyId, customRole } = data;

    if (role === 'company_admin') {
      companyId = adminCompanyId;
      targetRole = 'company_user';
    }

    if (!username || !password || !targetRole) {
      return NextResponse.json({ error: 'Username, password, and role are required' }, { status: 400 });
    }

    // Check unique username
    const existing = await User.findOne({ username: username.trim().toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
    }

    // If targetRole is not superadmin, companyId is required
    if (targetRole !== 'superadmin' && !companyId) {
      return NextResponse.json({ error: 'Company assignment is required for non-superadmin users' }, { status: 400 });
    }

    // Enforce role and creation limitations for company_admin
    if (role === 'company_admin') {
      if (!customRole) {
        return NextResponse.json({ error: 'Role specification is required' }, { status: 400 });
      }
      const roleDoc = await Role.findById(customRole).lean();
      if (!roleDoc || roleDoc.isSystem) {
        return NextResponse.json({ error: 'Company administrators can only assign custom roles' }, { status: 400 });
      }

      // Enforce Employee Limit
      const companyDoc = await Company.findById(companyId).lean();
      if (companyDoc && companyDoc.employeeLimit > 0) {
        const currentCount = await User.countDocuments({ companyId });
        if (currentCount >= companyDoc.employeeLimit) {
          return NextResponse.json({ error: `Employee creation limit reached. Max allowed: ${companyDoc.employeeLimit}` }, { status: 400 });
        }
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    const newUser = await User.create({
      username: username.trim().toLowerCase(),
      password: hashedPassword,
      role: targetRole,
      companyId: targetRole === 'superadmin' ? null : companyId,
      customRole: targetRole === 'company_user' ? (customRole || null) : null,
    });

    return NextResponse.json({
      success: true,
      user: {
        _id: newUser._id,
        username: newUser.username,
        role: newUser.role,
        companyId: newUser.companyId,
        customRole: newUser.customRole
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Superadmin Users POST API Error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
