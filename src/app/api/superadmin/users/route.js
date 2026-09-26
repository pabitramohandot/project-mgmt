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
    const { searchParams } = new URL(request.url);
    const filterCompanyId = searchParams.get('companyId');

    let query = {};
    if (filterCompanyId) {
      query.companyId = filterCompanyId;
    }

    const users = await User.find(query)
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

    let {
      username,
      password,
      role: targetRole,
      companyId,
      customRole,
      email,
      whatsapp,
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
    } = data;

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

    let categoryName = 'Employee';

    // Enforce role and creation limitations for company_admin
    if (role === 'company_admin') {
      if (!customRole) {
        return NextResponse.json({ error: 'Role specification is required' }, { status: 400 });
      }
      const roleDoc = await Role.findById(customRole).lean();
      if (!roleDoc || roleDoc.isSystem) {
        return NextResponse.json({ error: 'Company administrators can only assign custom roles' }, { status: 400 });
      }
      categoryName = roleDoc.name;

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

    let parsedSalary = {
      basicSalary: 0,
      allowances: 0,
      deductions: 0,
      netSalary: 0,
      currency: 'INR',
      customEarnings: [],
      customDeductions: []
    };

    if (salary) {
      const basicSalary = Number(salary.basicSalary) || 0;
      const customEarnings = Array.isArray(salary.customEarnings)
        ? salary.customEarnings.map(i => ({ label: i.label || '', amount: Number(i.amount) || 0 }))
        : [];
      const customDeductions = Array.isArray(salary.customDeductions)
        ? salary.customDeductions.map(i => ({ label: i.label || '', amount: Number(i.amount) || 0 }))
        : [];

      const sumEarnings = customEarnings.reduce((s, i) => s + (i.amount || 0), 0);
      const allowances = salary.allowances !== undefined ? Number(salary.allowances) : sumEarnings;
      const sumDeductions = customDeductions.reduce((s, i) => s + (i.amount || 0), 0);
      const deductions = salary.deductions !== undefined ? Number(salary.deductions) : sumDeductions;
      const netSalary = Math.max(0, (basicSalary + allowances) - deductions);

      parsedSalary = {
        basicSalary,
        allowances,
        deductions,
        netSalary,
        currency: salary.currency || 'INR',
        customEarnings,
        customDeductions
      };
    }

    const newUser = await User.create({
      username: username.trim().toLowerCase(),
      password: hashedPassword,
      role: targetRole,
      category: categoryName,
      companyId: targetRole === 'superadmin' ? null : companyId,
      customRole: targetRole === 'company_user' ? (customRole || null) : null,
      email: email ? email.trim().toLowerCase() : '',
      whatsapp: whatsapp ? whatsapp.trim() : '',
      employeeNo: employeeNo ? employeeNo.trim() : '',
      designation: designation ? designation.trim() : '',
      department: department ? department.trim() : '',
      location: location ? location.trim() : '',
      bankName: bankName ? bankName.trim() : '',
      bankAccountNo: bankAccountNo ? bankAccountNo.trim() : '',
      panNumber: panNumber ? panNumber.trim() : '',
      pfUan: pfUan ? pfUan.trim() : '',
      joiningDate: joiningDate || '',
      salary: parsedSalary
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
