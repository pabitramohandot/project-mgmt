import User from '@/models/User';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function getValidAccessToken(userId) {
  const user = await User.findById(userId);
  if (!user || !user.googleRefreshToken) {
    return null;
  }

  // If token is still valid (with 1-minute buffer), return it
  if (user.googleAccessToken && user.googleTokenExpiry && new Date(user.googleTokenExpiry).getTime() > Date.now() + 60000) {
    return user.googleAccessToken;
  }

  // Refresh token
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: user.googleRefreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Failed to refresh Google token:', data);
      return null;
    }

    const { access_token, expires_in } = data;
    const expiryDate = new Date(Date.now() + expires_in * 1000);

    user.googleAccessToken = access_token;
    user.googleTokenExpiry = expiryDate;
    await user.save();

    return access_token;
  } catch (error) {
    console.error('Error refreshing Google token:', error);
    return null;
  }
}

function getEventDateTime(dateVal, timeStr, durationStr, timezone = 'UTC') {
  const baseDate = new Date(dateVal);
  let hours = 0;
  let minutes = 0;
  if (timeStr) {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && hours < 12) {
        hours += 12;
      } else if (ampm === 'AM' && hours === 12) {
        hours = 0;
      }
    } else {
      const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      if (match24) {
        hours = parseInt(match24[1], 10);
        minutes = parseInt(match24[2], 10);
      }
    }
  }
  
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  const day = String(baseDate.getDate()).padStart(2, '0');
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const startLocalStr = `${year}-${month}-${day}T${hh}:${mm}:00`;

  let durationMs = 60 * 60 * 1000; // default 1 hour
  if (durationStr) {
    const amount = parseInt(durationStr, 10);
    if (durationStr.includes('minute')) {
      durationMs = amount * 60 * 1000;
    } else if (durationStr.includes('hour')) {
      durationMs = amount * 60 * 60 * 1000;
    }
  }
  
  const startObj = new Date(year, baseDate.getMonth(), baseDate.getDate(), hours, minutes, 0);
  const endObj = new Date(startObj.getTime() + durationMs);

  const endYear = endObj.getFullYear();
  const endMonth = String(endObj.getMonth() + 1).padStart(2, '0');
  const endDay = String(endObj.getDate()).padStart(2, '0');
  const endHh = String(endObj.getHours()).padStart(2, '0');
  const endMm = String(endObj.getMinutes()).padStart(2, '0');
  const endLocalStr = `${endYear}-${endMonth}-${endDay}T${endHh}:${endMm}:00`;
  
  return {
    start: {
      dateTime: startLocalStr,
      timeZone: timezone
    },
    end: {
      dateTime: endLocalStr,
      timeZone: timezone
    }
  };
}

export async function createGoogleCalendarEvent(userId, reminderData) {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return null;

  const { title, description, date, time, duration, attendees, addGoogleMeet, timezone } = reminderData;
  const { start, end } = getEventDateTime(date, time, duration, timezone);

  const eventBody = {
    summary: title,
    description: description || '',
    start,
    end,
  };

  if (attendees && attendees.trim()) {
    eventBody.attendees = attendees.split(',').map(email => ({ email: email.trim() }));
  }

  if (addGoogleMeet) {
    eventBody.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    };
  }

  try {
    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Error creating Google Calendar event:', data);
      return null;
    }

    let meetingUrl = '';
    if (data.conferenceData && data.conferenceData.entryPoints) {
      const videoLink = data.conferenceData.entryPoints.find(ep => ep.entryPointType === 'video');
      if (videoLink) {
        meetingUrl = videoLink.uri;
      }
    }

    return {
      googleEventId: data.id,
      meetingUrl: meetingUrl || '',
    };
  } catch (error) {
    console.error('Google Calendar Event Create Network Error:', error);
    return null;
  }
}

export async function updateGoogleCalendarEvent(userId, googleEventId, reminderData) {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken || !googleEventId) return null;

  const { title, description, date, time, duration, attendees, addGoogleMeet, meetingUrl, timezone } = reminderData;
  const { start, end } = getEventDateTime(date, time, duration, timezone);

  const eventBody = {
    summary: title,
    description: description || '',
    start,
    end,
  };

  if (attendees && attendees.trim()) {
    eventBody.attendees = attendees.split(',').map(email => ({ email: email.trim() }));
  }

  // If Google Meet needs to be added and we don't have a URL, request it
  if (addGoogleMeet && !meetingUrl) {
    eventBody.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    };
  }

  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}?conferenceDataVersion=1`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Error updating Google Calendar event:', data);
      return null;
    }

    let updatedMeetingUrl = meetingUrl;
    if (data.conferenceData && data.conferenceData.entryPoints) {
      const videoLink = data.conferenceData.entryPoints.find(ep => ep.entryPointType === 'video');
      if (videoLink) {
        updatedMeetingUrl = videoLink.uri;
      }
    }

    return {
      googleEventId: data.id,
      meetingUrl: updatedMeetingUrl || '',
    };
  } catch (error) {
    console.error('Google Calendar Event Update Network Error:', error);
    return null;
  }
}

export async function deleteGoogleCalendarEvent(userId, googleEventId) {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken || !googleEventId) return false;

  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.status === 204 || response.ok) {
      return true;
    }
    const data = await response.json();
    console.error('Error deleting Google Calendar event:', data);
    return false;
  } catch (error) {
    console.error('Google Calendar Event Delete Network Error:', error);
    return false;
  }
}
