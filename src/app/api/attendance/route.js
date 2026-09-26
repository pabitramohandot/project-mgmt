import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Attendance from '@/models/Attendance';
import Company from '@/models/Company';
import { getRequestSession } from '@/lib/auth';

// Helper to format date as YYYY-MM-DD
function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function GET(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // 'history' or 'status'

    const todayStr = getLocalDateString();

    if (mode === 'status') {
      // Find today's attendance record
      const attendance = await Attendance.findOne({
        userId: session.userId,
        date: todayStr,
      });

      return NextResponse.json({
        success: true,
        attendance: attendance || null,
        today: todayStr,
      });
    }

    // Default: return user's attendance history
    const history = await Attendance.find({ userId: session.userId })
      .sort({ date: -1 })
      .limit(60);

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('Attendance GET API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.userId || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, reason, latitude, longitude, notes } = body;
    const todayStr = getLocalDateString();
    const now = new Date();

    let attendance = await Attendance.findOne({
      userId: session.userId,
      date: todayStr,
    });

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';

    if (action === 'clockIn') {
      if (attendance) {
        return NextResponse.json({ error: 'Already clocked in today' }, { status: 400 });
      }

      attendance = await Attendance.create({
        userId: session.userId,
        companyId: session.companyId,
        date: todayStr,
        clockIn: now,
        status: 'Present',
        notes: notes || '',
        location: {
          latitude: latitude || null,
          longitude: longitude || null,
          ip: ipAddress,
        },
      });

      return NextResponse.json({ success: true, attendance });
    }

    if (!attendance) {
      return NextResponse.json({ error: 'No attendance record found for today' }, { status: 400 });
    }

    if (action === 'clockOut') {
      if (attendance.clockOut) {
        return NextResponse.json({ error: 'Already clocked out today' }, { status: 400 });
      }

      // If currently on a break, end the break automatically
      const activeBreak = attendance.breaks.find(b => !b.end);
      if (activeBreak) {
        activeBreak.end = now;
      }

      attendance.clockOut = now;

      // Calculate total work minutes and break minutes
      let totalBreakMs = 0;
      attendance.breaks.forEach(b => {
        if (b.start && b.end) {
          totalBreakMs += new Date(b.end) - new Date(b.start);
        }
      });

      const totalWorkedMs = new Date(attendance.clockOut) - new Date(attendance.clockIn);
      attendance.totalBreakMinutes = Math.round(totalBreakMs / 60000);
      attendance.totalWorkMinutes = Math.round((totalWorkedMs - totalBreakMs) / 60000);

      // Determine half-day status based on company timetable settings
      let halfDayHoursThreshold = 4;
      let halfDayCutoffTime = '14:00';

      if (session.companyId) {
        const companyDoc = await Company.findById(session.companyId).lean();
        if (companyDoc?.timetable) {
          if (companyDoc.timetable.halfDayThresholdHours !== undefined) {
            halfDayHoursThreshold = Number(companyDoc.timetable.halfDayThresholdHours);
          }
          if (companyDoc.timetable.halfDayClockOutTime) {
            halfDayCutoffTime = companyDoc.timetable.halfDayClockOutTime;
          }
        }
      }

      const thresholdMins = halfDayHoursThreshold * 60;
      const clockOutTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      if (attendance.totalWorkMinutes < thresholdMins || (halfDayCutoffTime && clockOutTimeStr < halfDayCutoffTime)) {
        attendance.status = 'Half-day';
      } else {
        attendance.status = 'Present';
      }

      if (notes) {
        attendance.notes = notes;
      }

      await attendance.save();
      return NextResponse.json({ success: true, attendance });
    }

    if (action === 'startBreak') {
      if (attendance.clockOut) {
        return NextResponse.json({ error: 'Cannot start break after clocking out' }, { status: 400 });
      }

      const activeBreak = attendance.breaks.find(b => !b.end);
      if (activeBreak) {
        return NextResponse.json({ error: 'Already on break' }, { status: 400 });
      }

      attendance.breaks.push({
        start: now,
        reason: reason || 'Lunch/Short Break',
      });

      await attendance.save();
      return NextResponse.json({ success: true, attendance });
    }

    if (action === 'endBreak') {
      const activeBreak = attendance.breaks.find(b => !b.end);
      if (!activeBreak) {
        return NextResponse.json({ error: 'Not currently on break' }, { status: 400 });
      }

      activeBreak.end = now;
      await attendance.save();
      return NextResponse.json({ success: true, attendance });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Attendance POST API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
