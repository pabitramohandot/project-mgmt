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

    const lead = await Lead.findOne({ _id: id, companyId })
      .populate('assignedTo', 'name email image')
      .populate('createdBy', 'name email')
      .populate('convertedToClientId', 'name email company')
      .populate('convertedToProjectId', 'name status')
      .lean();

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const activities = await LeadActivity.find({ leadId: id, companyId })
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ ...lead, activities });
  } catch (error) {
    console.error('Lead GET by ID Error:', error);
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const isAllowed = await hasPermission(request, 'crm', 'write');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: You cannot modify leads' }, { status: 403 });
    }

    await dbConnect();
    const { companyId, userId } = getRequestSession(request);
    const { id } = await params;
    const body = await request.json();

    const existingLead = await Lead.findOne({ _id: id, companyId });
    if (!existingLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const oldStage = existingLead.stage;
    const newStage = body.stage;

    // Check if stage changed
    if (newStage && newStage !== oldStage) {
      await LeadActivity.create({
        companyId,
        leadId: id,
        type: 'Status Change',
        title: `Stage Changed to ${newStage.toUpperCase()}`,
        description: `Lead moved from "${oldStage.toUpperCase()}" to "${newStage.toUpperCase()}"`,
        performedBy: userId,
        isDone: true,
        completedAt: new Date(),
      });
    }

    // Update lead
    const updatedLead = await Lead.findOneAndUpdate(
      { _id: id, companyId },
      { $set: body },
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name email image')
      .populate('createdBy', 'name email')
      .lean();

    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error('Lead PUT Error:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const isAllowed = await hasPermission(request, 'crm', 'write');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: You cannot delete leads' }, { status: 403 });
    }

    await dbConnect();
    const { companyId } = getRequestSession(request);
    const { id } = await params;

    const deleted = await Lead.findOneAndDelete({ _id: id, companyId });
    if (!deleted) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Delete associated activities
    await LeadActivity.deleteMany({ leadId: id, companyId });

    return NextResponse.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Lead DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
