import dbConnect from '@/lib/db';
import CRMPipeline from '@/models/CRMPipeline';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

const DEFAULT_STAGES = [
  { key: 'new', label: 'New Lead', color: '#3b82f6', order: 1, probability: 10 },
  { key: 'contacted', label: 'Contacted', color: '#8b5cf6', order: 2, probability: 25 },
  { key: 'qualified', label: 'Qualified', color: '#06b6d4', order: 3, probability: 50 },
  { key: 'proposal', label: 'Proposal Sent', color: '#f59e0b', order: 4, probability: 75 },
  { key: 'negotiation', label: 'Negotiation', color: '#ec4899', order: 5, probability: 90 },
  { key: 'won', label: 'Won', color: '#10b981', order: 6, probability: 100 },
  { key: 'lost', label: 'Lost', color: '#ef4444', order: 7, probability: 0 },
];

export async function GET(request) {
  try {
    const isAllowed = await hasPermission(request, 'crm', 'read');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: Access denied to CRM' }, { status: 403 });
    }

    await dbConnect();
    const { companyId } = getRequestSession(request);

    let pipeline = await CRMPipeline.findOne({ companyId }).lean();
    if (!pipeline) {
      return NextResponse.json({ stages: DEFAULT_STAGES });
    }

    return NextResponse.json(pipeline);
  } catch (error) {
    console.error('CRM Pipeline GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch pipeline settings' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const isAllowed = await hasPermission(request, 'crm', 'write');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: Cannot edit pipeline settings' }, { status: 403 });
    }

    await dbConnect();
    const { companyId } = getRequestSession(request);
    const { stages } = await request.json();

    if (!Array.isArray(stages) || stages.length === 0) {
      return NextResponse.json({ error: 'Pipeline stages must be a non-empty array' }, { status: 400 });
    }

    const updated = await CRMPipeline.findOneAndUpdate(
      { companyId },
      { $set: { stages } },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('CRM Pipeline POST Error:', error);
    return NextResponse.json({ error: 'Failed to save pipeline settings' }, { status: 500 });
  }
}
