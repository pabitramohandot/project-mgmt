import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reminder from '@/models/Reminder';
import User from '@/models/User';
import { getRequestSession } from '@/lib/auth';
import { getPermissionsForUser } from '@/lib/permissions';

export async function PUT(request, context) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.userId || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    const user = await User.findById(session.userId).populate('customRole').lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const permissions = await getPermissionsForUser(user);
    const hasWrite = permissions && permissions.reminders === 'write';
    if (!hasWrite) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existingReminder = await Reminder.findOne({ _id: id, companyId: session.companyId });
    if (!existingReminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    const body = await request.json();
    const { 
      title, 
      client, 
      date, 
      time, 
      duration, 
      attendees, 
      description, 
      addGoogleMeet, 
      meetingUrl, 
      meetingType,
      location,
      remindMe,
      isCompleted,
      timezone
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }
    if (!time) {
      return NextResponse.json({ error: 'Time is required' }, { status: 400 });
    }

    existingReminder.title = title.trim();
    existingReminder.client = client || 'No client (personal meeting)';
    existingReminder.date = new Date(date);
    existingReminder.time = time;
    existingReminder.duration = duration || '1 hour';
    existingReminder.attendees = attendees || '';
    existingReminder.description = description || '';
    let finalMeetingUrl = meetingUrl;
    let googleEventId = existingReminder.googleEventId;

    try {
      const { createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } = await import('@/lib/googleCalendar');
      
      if (googleEventId) {
        if (meetingType === 'offline') {
          await deleteGoogleCalendarEvent(session.userId, googleEventId);
          googleEventId = null;
          finalMeetingUrl = '';
        } else {
          const gcalResult = await updateGoogleCalendarEvent(session.userId, googleEventId, {
            title: title.trim(),
            description: description || '',
            date,
            time,
            duration,
            attendees,
            addGoogleMeet: !!addGoogleMeet,
            meetingUrl: finalMeetingUrl,
            timezone: timezone || 'Asia/Kolkata'
          });
          if (gcalResult) {
            finalMeetingUrl = gcalResult.meetingUrl;
          }
        }
      } else if (meetingType !== 'offline' && !!addGoogleMeet) {
        const gcalResult = await createGoogleCalendarEvent(session.userId, {
          title: title.trim(),
          description: description || '',
          date,
          time,
          duration,
          attendees,
          addGoogleMeet: !!addGoogleMeet,
          timezone: timezone || 'Asia/Kolkata'
        });
        if (gcalResult) {
          googleEventId = gcalResult.googleEventId;
          finalMeetingUrl = gcalResult.meetingUrl;
        }
      }
    } catch (gcalErr) {
      console.error('[Google Calendar] Failed to update/sync event:', gcalErr);
    }

    if (meetingType !== 'offline' && !!addGoogleMeet && !finalMeetingUrl) {
      const genSeg = (len) => Array.from({length: len}, () => Math.floor(Math.random() * 36).toString(36)).join('');
      finalMeetingUrl = `https://meet.google.com/${genSeg(3)}-${genSeg(4)}-${genSeg(3)}`;
    }

    existingReminder.addGoogleMeet = !!addGoogleMeet;
    existingReminder.meetingUrl = finalMeetingUrl || '';
    existingReminder.meetingType = meetingType || 'online';
    existingReminder.location = location || '';
    existingReminder.remindMe = remindMe || '15 minutes before';
    existingReminder.googleEventId = googleEventId || null;

    if (typeof isCompleted === 'boolean') {
      existingReminder.isCompleted = isCompleted;
    }

    await existingReminder.save();

    return NextResponse.json({ success: true, reminder: existingReminder });
  } catch (error) {
    console.error('Reminder PUT API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update reminder' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.userId || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    const user = await User.findById(session.userId).populate('customRole').lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const permissions = await getPermissionsForUser(user);
    const hasWrite = permissions && permissions.reminders === 'write';
    if (!hasWrite) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deletedReminder = await Reminder.findOneAndDelete({ _id: id, companyId: session.companyId });
    if (!deletedReminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    if (deletedReminder.googleEventId) {
      try {
        const { deleteGoogleCalendarEvent } = await import('@/lib/googleCalendar');
        await deleteGoogleCalendarEvent(session.userId, deletedReminder.googleEventId);
      } catch (gcalErr) {
        console.error('[Google Calendar] Failed to delete event on Google Calendar:', gcalErr);
      }
    }

    return NextResponse.json({ success: true, message: 'Reminder deleted successfully' });
  } catch (error) {
    console.error('Reminder DELETE API Error:', error);
    return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 });
  }
}
