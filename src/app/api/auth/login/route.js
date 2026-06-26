import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Company from '@/models/Company';
import { signToken, hashPassword } from '@/lib/auth';

export async function POST(request) {
  try {
    await dbConnect();
    const { username, password } = await request.json();
    console.log("LOGIN ATTEMPT:", username, password.length);

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const user = await User.findOne({ username: username.trim().toLowerCase() });
    if (!user) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 401 });
    }

    const hashedPassword = await hashPassword(password);
    const trimmedHashedPassword = await hashPassword(password.trim());
    if (user.password !== hashedPassword && user.password !== trimmedHashedPassword) {
      return NextResponse.json({ error: 'Invalid password (check for spaces)' }, { status: 401 });
    }

    // If company user, verify company isActive status
    if (user.role !== 'superadmin') {
      if (!user.companyId) {
        return NextResponse.json({ error: 'User is not assigned to a company' }, { status: 400 });
      }
      const company = await Company.findById(user.companyId);
      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 400 });
      }
      if (!company.isActive) {
        return NextResponse.json(
          { error: 'Your company account has been suspended. Please contact support.' },
          { status: 403 }
        );
      }
    }

    const token = await signToken({
      username: user.username,
      userId: user._id.toString(),
      companyId: user.companyId ? user.companyId.toString() : null,
      role: user.role,
    });

    const response = NextResponse.json({ success: true, message: 'Logged in successfully' });

    // Set HTTP-only cookie
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
