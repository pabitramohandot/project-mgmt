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
    
    // Update online status in database
    await User.findByIdAndUpdate(user._id, {
      $set: {
        isOnline: true,
        lastActive: new Date()
      }
    });

    const LoginHistory = (await import('@/models/LoginHistory')).default;
    const userAgent = request.headers.get('user-agent') || '';
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';

    let loginHistoryId = null;
    if (user.companyId) {
      try {
        const loginRecord = await LoginHistory.create({
          userId: user._id,
          companyId: user.companyId,
          username: user.username,
          loginTime: new Date(),
          userAgent,
          ipAddress
        });
        loginHistoryId = loginRecord._id.toString();
      } catch (err) {
        console.error('Failed to create login history record:', err);
      }
    }

    const token = await signToken({
      username: user.username,
      userId: user._id.toString(),
      companyId: user.companyId ? user.companyId.toString() : null,
      role: user.role,
      loginHistoryId
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
