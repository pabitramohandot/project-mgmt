import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reminder from '@/models/Reminder';
import User from '@/models/User';
import { getRequestSession } from '@/lib/auth';
import { getPermissionsForUser } from '@/lib/permissions';

export async function GET(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.userId || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.userId).populate('customRole').lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const permissions = await getPermissionsForUser(user);
    const hasRead = permissions && permissions.reminders && permissions.reminders !== 'none';
    if (!hasRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Fetch all company reminders
    const reminders = await Reminder.find({ companyId: session.companyId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(reminders);
  } catch (error) {
    console.error('Reminders GET API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.userId || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.userId).populate('customRole').lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const permissions = await getPermissionsForUser(user);
    const hasWrite = permissions && permissions.reminders === 'write';
    if (!hasWrite) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      timezone
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Meeting Title is required' }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }
    if (!time) {
      return NextResponse.json({ error: 'Time is required' }, { status: 400 });
    }

    let finalMeetingUrl = meetingUrl;
    let googleEventId = null;

    try {
      const { createGoogleCalendarEvent } = await import('@/lib/googleCalendar');
      const gcalResult = await createGoogleCalendarEvent(session.userId, {
        title: title.trim(),
        description: description || '',
        date,
        time,
        duration,
        attendees,
        addGoogleMeet: !!addGoogleMeet,
        timezone: timezone || 'Asia/Kolkata' // Default to IST if not passed
      });

      if (gcalResult) {
        googleEventId = gcalResult.googleEventId;
        finalMeetingUrl = gcalResult.meetingUrl;
      }
    } catch (gcalErr) {
      console.error('[Google Calendar] Failed to create event:', gcalErr);
    }

    if (meetingType !== 'offline' && !!addGoogleMeet && !finalMeetingUrl) {
      const genSeg = (len) => Array.from({length: len}, () => Math.floor(Math.random() * 36).toString(36)).join('');
      finalMeetingUrl = `https://meet.google.com/${genSeg(3)}-${genSeg(4)}-${genSeg(3)}`;
    }

    const newReminder = await Reminder.create({
      companyId: session.companyId,
      title: title.trim(),
      client: client || 'No client (personal meeting)',
      date: new Date(date),
      time,
      duration: duration || '1 hour',
      attendees: attendees || '',
      description: description || '',
      addGoogleMeet: !!addGoogleMeet,
      meetingUrl: finalMeetingUrl || '',
      meetingType: meetingType || 'online',
      location: location || '',
      remindMe: remindMe || '15 minutes before',
      createdBy: session.userId,
      isCompleted: false,
      googleEventId: googleEventId || null
    });

    // Send invitation email to both client AND attendees
    try {
      const { sendMeetingInvitationEmail } = await import('@/lib/email');

      // Look up client email from DB
      let clientEmail = null;
      const clientName = client && client !== 'No client (personal meeting)' ? client.trim() : null;
      if (clientName) {
        try {
          const Client = (await import('@/models/Client')).default;
          const clientDoc = await Client.findOne({
            companyId: session.companyId,
            name: { $regex: new RegExp(`^${clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
          }).lean();
          if (clientDoc?.email) {
            clientEmail = clientDoc.email;
            console.log(`[Meeting Invite] Client email resolved: ${clientEmail} for "${clientName}"`);
          }
        } catch (clientErr) {
          console.error('Failed to fetch client email:', clientErr);
        }
      }

      if ((attendees && attendees.trim()) || clientEmail) {
        await sendMeetingInvitationEmail({
          attendees: attendees || '',
          clientEmail,
          title: title.trim(),
          client: client || 'No client (personal meeting)',
          date, time, duration,
          meetingType: meetingType || 'online',
          location: location || '',
          meetingUrl: meetingUrl || '',
          description: description || '',
          companyId: session.companyId
        });
      }
    } catch (emailErr) {
      console.error('Failed to send meeting invitation email:', emailErr);
    }

    return NextResponse.json({ success: true, reminder: newReminder }, { status: 201 });
  } catch (error) {
    console.error('Reminders POST API Error:', error);
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
  }
}
