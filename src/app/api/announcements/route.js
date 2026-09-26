import dbConnect from '@/lib/db';
import Client from '@/models/Client';
import User from '@/models/User';
import { sendAnnouncementEmail } from '@/lib/email';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';
import { getCategoryForUser } from '@/lib/permissions';

export async function POST(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, userId, role } = session;
    const currentUser = await User.findById(userId).populate('customRole').lean();
    const category = await getCategoryForUser(currentUser);

    if (category === 'Employee' && role !== 'company_admin' && role !== 'superadmin') {
      return NextResponse.json({ error: 'Access Denied. Announcements broadcasting is restricted to Management & Admin.' }, { status: 403 });
    }

    const data = await request.json();

    const { recipientType, recipients, subject, message, channels } = data;

    if (!message || !recipientType || !channels || channels.length === 0) {
      return NextResponse.json({ error: 'Message, recipient type, and at least one channel are required.' }, { status: 400 });
    }

    let baseQuery = { companyId };

    // Find targeted clients
    let query = { ...baseQuery };
    if (recipientType === 'individual') {
      if (!recipients || typeof recipients !== 'string') {
        return NextResponse.json({ error: 'A single client ID is required for individual broadcasts.' }, { status: 400 });
      }
      query._id = recipients;
    } else if (recipientType === 'selected') {
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return NextResponse.json({ error: 'At least one selected client ID is required.' }, { status: 400 });
      }
      query._id = { $in: recipients };
    }

    const targetedClients = await Client.find(query).sort({ name: 1 });

    const results = {
      emailSent: [],
      emailFailed: [],
      whatsappQueue: []
    };

    const sendEmailChannel = channels.includes('email');
    const sendWhatsAppChannel = channels.includes('whatsapp');

    for (const client of targetedClients) {
      // Prepare client-side WhatsApp details if selected
      if (sendWhatsAppChannel) {
        results.whatsappQueue.push({
          id: client._id,
          name: client.name,
          phone: client.phone || '',
          email: client.email
        });
      }

      // Send Email immediately if selected
      if (sendEmailChannel) {
        try {
          if (!client.email) {
            results.emailFailed.push({ name: client.name, reason: 'Client has no email address configured.' });
            continue;
          }
          await sendAnnouncementEmail(client.email, client.name, subject, message, companyId);
          results.emailSent.push(client.name);
        } catch (e) {
          console.error(`Failed to send email to ${client.name}:`, e);
          results.emailFailed.push({ name: client.name, reason: e.message });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Announcement processed successfully. targeted ${targetedClients.length} clients.`,
      results
    });
  } catch (error) {
    console.error('Announcements API Error:', error);
    return NextResponse.json({ error: 'Failed to process announcements broadcast.' }, { status: 500 });
  }
}
