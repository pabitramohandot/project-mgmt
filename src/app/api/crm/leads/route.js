import dbConnect from '@/lib/db';
import Lead from '@/models/Lead';
import LeadActivity from '@/models/LeadActivity';
import User from '@/models/User';
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
    const search = searchParams.get('search');
    const stage = searchParams.get('stage');
    const source = searchParams.get('source');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');

    let query = { companyId };

    if (stage) query.stage = stage;
    if (source) query.source = source;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { contactName: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email image')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(leads);
  } catch (error) {
    console.error('Leads GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const isAllowed = await hasPermission(request, 'crm', 'write');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: You cannot create leads' }, { status: 403 });
    }

    await dbConnect();
    const { companyId, userId } = getRequestSession(request);
    const data = await request.json();

    if (!data.title || !data.contactName) {
      return NextResponse.json({ error: 'Lead Title and Contact Person Name are required' }, { status: 400 });
    }

    const newLead = await Lead.create({
      ...data,
      companyId,
      createdBy: userId,
      value: Number(data.value) || 0,
      winProbability: Number(data.winProbability) || 20,
    });

    // Auto-create initial activity log
    await LeadActivity.create({
      companyId,
      leadId: newLead._id,
      type: 'Status Change',
      title: 'Lead Created',
      description: `Lead created under initial stage "${newLead.stage.toUpperCase()}"`,
      performedBy: userId,
      isDone: true,
      completedAt: new Date(),
    });

    const populated = await Lead.findById(newLead._id)
      .populate('assignedTo', 'name email image')
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    console.error('Leads POST Error:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}
