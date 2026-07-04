import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';
import Reminder from '@/models/Reminder';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';
import { getPermissionsForUser, getCategoryForUser } from '@/lib/permissions';

export async function GET(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.companyId || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Evaluate pending reminders and generate notifications
    const activeReminders = await Reminder.find({
      companyId: session.companyId,
      isCompleted: false
    });

    const now = new Date();
    for (const reminder of activeReminders) {
      if (!reminder.date || !reminder.time) continue;

      let shouldTrigger = false;

      // Combine date and time
      const eventDate = new Date(reminder.date);
      const [hours, minutes] = reminder.time.split(':');
      eventDate.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);

      // Parse remindMe offset
      let offsetMinutes = 0;
      if (reminder.remindMe === '5 minutes before') {
        offsetMinutes = 5;
      } else if (reminder.remindMe === '15 minutes before') {
        offsetMinutes = 15;
      } else if (reminder.remindMe === '30 minutes before') {
        offsetMinutes = 30;
      } else if (reminder.remindMe === '1 hour before') {
        offsetMinutes = 60;
      }

      const triggerTime = new Date(eventDate.getTime() - offsetMinutes * 60 * 1000);

      if (triggerTime <= now) {
        shouldTrigger = true;
        reminder.isCompleted = true;
      }

      if (shouldTrigger) {
        await reminder.save();

        // Create notification
        await Notification.create({
          companyId: session.companyId,
          reminderId: reminder._id,
          message: `[Reminder] ${reminder.title}: Starting at ${reminder.time} (${reminder.duration})`,
          isRead: false
        });
      }
    }

    // 2. Fetch notifications and populate reminder details
    const notifications = await Notification.find({ companyId: session.companyId })
      .populate('reminderId')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // 3. Filter notifications based on target audience for the requesting user
    const user = await User.findById(session.userId).populate('customRole').lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userCategory = await getCategoryForUser(user);
    const userRoleId = user.customRole ? String(user.customRole._id || user.customRole) : null;
    const permissions = await getPermissionsForUser(user);
    const hasWriteReminders = permissions && permissions.reminders === 'write';

    const filteredNotifications = notifications.filter(n => {
      // If notification is not linked to a reminder, everyone in the company sees it (e.g. feedback updates)
      if (!n.reminderId) return true;

      const rem = n.reminderId;
      // Creators / writers can see all reminder notifications
      if (hasWriteReminders) return true;

      // Check audience match
      if (rem.targetType === 'all') return true;
      if (rem.targetType === 'category' && rem.targetCategory === userCategory) return true;
      if (rem.targetType === 'role' && String(rem.targetRole) === userRoleId) return true;

      return false;
    });

    return NextResponse.json(filteredNotifications);
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
