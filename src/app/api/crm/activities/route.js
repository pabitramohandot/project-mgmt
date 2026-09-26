import dbConnect from '@/lib/db';
import LeadActivity from '@/models/LeadActivity';
import Lead from '@/models/Lead';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET(request) {
  try {
    const isAllowed = await hasPermission(request, 'crm', 'read');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: Access denied to CRM' }, { status: 403 });
    }

    await dbConnect();
    const { companyId } = getRequestSession(request);
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type');
    const isDone = searchParams.get('isDone');

    let query = { companyId };
    if (type) query.type = type;
    if (isDone !== null && isDone !== undefined && isDone !== '') {
      query.isDone = isDone === 'true';
    }

    const activities = await LeadActivity.find(query)
      .populate('leadId', 'title contactName companyName stage phone email')
      .populate('performedBy', 'name email image')
      .sort({ scheduledAt: 1, createdAt: -1 })
      .lean();

    return NextResponse.json(activities);
  } catch (error) {
    console.error('CRM Activities GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch CRM activities' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const isAllowed = await hasPermission(request, 'crm', 'write');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: You cannot modify activities' }, { status: 403 });
    }

    await dbConnect();
    const { companyId } = getRequestSession(request);
    const { id, isDone } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    const updated = await LeadActivity.findOneAndUpdate(
      { _id: id, companyId },
      {
        $set: {
          isDone: Boolean(isDone),
          completedAt: isDone ? new Date() : null,
        },
      },
      { new: true }
    )
      .populate('leadId', 'title contactName companyName stage')
      .populate('performedBy', 'name email image')
      .lean();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('CRM Activity PUT Error:', error);
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 });
  }
}
