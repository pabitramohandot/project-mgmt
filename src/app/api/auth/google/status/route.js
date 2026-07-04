import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getRequestSession } from '@/lib/auth';

export async function GET(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.userId) {
      return NextResponse.json({ connected: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.userId).lean();
    if (!user) {
      return NextResponse.json({ connected: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      connected: !!user.googleRefreshToken,
      email: user.googleCalendarEmail || ''
    });
  } catch (error) {
    console.error('Google Auth Status Error:', error);
    return NextResponse.json({ connected: false, error: 'Failed to retrieve status' }, { status: 500 });
  }
}
