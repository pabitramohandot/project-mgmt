import dbConnect from '@/lib/db';
import Lead from '@/models/Lead';
import LeadActivity from '@/models/LeadActivity';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET(request, { params }) {
  try {
    const isAllowed = await hasPermission(request, 'crm', 'read');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: Access denied to CRM' }, { status: 403 });
    }

    await dbConnect();
    const { companyId } = getRequestSession(request);
    const { id } = await params;

    const activities = await LeadActivity.find({ leadId: id, companyId })
      .populate('performedBy', 'name email image')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Lead Activities GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch lead activities' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const isAllowed = await hasPermission(request, 'crm', 'write');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: You cannot add activities' }, { status: 403 });
    }

    await dbConnect();
    const { companyId, userId } = getRequestSession(request);
    const { id } = await params;
    const data = await request.json();

    if (!data.title) {
      return NextResponse.json({ error: 'Activity title is required' }, { status: 400 });
    }

    const activity = await LeadActivity.create({
      ...data,
      companyId,
      leadId: id,
      performedBy: userId,
      completedAt: data.isDone ? new Date() : null,
    });

    // Update lastContactedAt on lead
    await Lead.findByIdAndUpdate(id, { lastContactedAt: new Date() });

    const populated = await LeadActivity.findById(activity._id)
      .populate('performedBy', 'name email image')
      .lean();

    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    console.error('Lead Activity POST Error:', error);
    return NextResponse.json({ error: 'Failed to create lead activity' }, { status: 500 });
  }
}
