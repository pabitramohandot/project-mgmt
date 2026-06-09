import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';

export async function GET(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Limit notifications to last 50 for page performance
    const notifications = await Notification.find({ companyId: session.companyId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Notifications GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve notifications' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      await Notification.updateMany(
        { companyId: session.companyId, isRead: false },
        { $set: { isRead: true } }
      );
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, companyId: session.companyId },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error('Notifications PUT Error:', error);
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
