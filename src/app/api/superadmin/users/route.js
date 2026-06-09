import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Company from '@/models/Company';
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
    const { role } = getRequestSession(request);
    if (role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const data = await request.json();

    const { username, password, role: targetRole, companyId } = data;

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

    // Hash password
    const hashedPassword = await hashPassword(password);

    const newUser = await User.create({
      username: username.trim().toLowerCase(),
      password: hashedPassword,
      role: targetRole,
      companyId: targetRole === 'superadmin' ? null : companyId,
    });

    return NextResponse.json({
      success: true,
      user: {
        _id: newUser._id,
        username: newUser.username,
        role: newUser.role,
        companyId: newUser.companyId
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Superadmin Users POST API Error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
