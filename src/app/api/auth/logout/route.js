import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(request) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    const payload = await verifyToken(token);

    if (payload?.userId) {
      await dbConnect();
      await User.findByIdAndUpdate(payload.userId, { isOnline: false });
      
      if (payload.loginHistoryId) {
        try {
          const LoginHistory = (await import('@/models/LoginHistory')).default;
          const loginRecord = await LoginHistory.findById(payload.loginHistoryId);
          if (loginRecord) {
            loginRecord.logoutTime = new Date();
            loginRecord.duration = Math.round((loginRecord.logoutTime.getTime() - loginRecord.loginTime.getTime()) / 1000);
            await loginRecord.save();
          }
        } catch (err) {
          console.error('Failed to close login history record:', err);
        }
      }
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    
    // Clear the HTTP-only cookie
    response.cookies.set('admin_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // expire immediately
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Logout API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
