import dbConnect from '@/lib/db';
import Lead from '@/models/Lead';
import LeadActivity from '@/models/LeadActivity';
import Client from '@/models/Client';
import Project from '@/models/Project';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function POST(request, { params }) {
  try {
    const isAllowed = await hasPermission(request, 'crm', 'write');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: Cannot convert lead' }, { status: 403 });
    }

    await dbConnect();
    const { companyId, userId } = getRequestSession(request);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const lead = await Lead.findOne({ _id: id, companyId });
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // 1. Create or Find existing Client
    let client = null;
    const clientEmail = lead.email?.trim() || `${lead.contactName.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.com`;
    
    if (lead.email) {
      client = await Client.findOne({ email: lead.email.toLowerCase().trim(), companyId });
    }

    if (!client) {
      client = await Client.create({
        name: lead.contactName,
        email: clientEmail,
        phone: lead.phone || '',
        company: lead.companyName || lead.title,
        status: 'Active',
        companyId,
      });
    }

    // 2. Create Project if requested (default true)
    let project = null;
    if (body.createProject !== false) {
      project = await Project.create({
        name: lead.title,
        description: `Project created from converted won lead: ${lead.title}. Notes: ${lead.notes || ''}`,
        clientName: client.name,
        clientEmail: client.email,
        client: client._id,
        status: 'Active',
        companyId,
      });
    }

    // 3. Update Lead status
    lead.stage = 'won';
    lead.status = 'Converted';
    lead.convertedToClientId = client._id;
    if (project) {
      lead.convertedToProjectId = project._id;
    }
    await lead.save();

    // 4. Log Activity
    await LeadActivity.create({
      companyId,
      leadId: lead._id,
      type: 'Status Change',
      title: 'Lead Converted',
      description: `Lead converted to Client "${client.name}"${project ? ` and Project "${project.name}"` : ''}.`,
      performedBy: userId,
      isDone: true,
      completedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Lead converted successfully!',
      client,
      project,
      lead,
    });
  } catch (error) {
    console.error('Lead Convert Error:', error);
    return NextResponse.json({ error: 'Failed to convert lead' }, { status: 500 });
  }
}
