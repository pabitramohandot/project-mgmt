import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import { sendAnnouncementEmail } from '@/lib/email';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';

export async function POST(request, context) {
  try {
    await dbConnect();
    const params = await context.params;
    const { id } = params;
    const { companyId } = getRequestSession(request);

    const project = await Project.findOne({ _id: id, companyId }).populate('client').lean();
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const clientEmail = project.clientEmail || project.client?.email;
    if (!clientEmail) {
      return NextResponse.json({ error: 'Client has no email configured' }, { status: 400 });
    }

    const { subject, body } = await request.json();
    if (!subject || !body) {
      return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 });
    }

    const emailResult = await sendAnnouncementEmail(
      clientEmail,
      project.clientName,
      subject,
      body,
      companyId
    );

    if (emailResult && emailResult.skipped) {
      return NextResponse.json({ error: `Failed to send email: ${emailResult.reason}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: emailResult.messageId });
  } catch (error) {
    console.error('Project email sending error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
