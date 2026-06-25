import dbConnect from '@/lib/db';
import Client from '@/models/Client';
import Company from '@/models/Company';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET(request) {
  try {
    const isAllowed = await hasPermission(request, 'clients', 'read');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view clients' }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const { companyId } = getRequestSession(request);
    let query = { companyId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    const clients = await Client.find(query).sort({ name: 1 }).lean();
    return NextResponse.json(clients);
  } catch (error) {
    console.error('Clients GET API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const isAllowed = await hasPermission(request, 'clients', 'write');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to modify clients' }, { status: 403 });
    }

    await dbConnect();
    const { companyId } = getRequestSession(request);
    const data = await request.json();

    if (!data.name || !data.email) {
      return NextResponse.json({ error: 'Client Name and Email are required' }, { status: 400 });
    }

    // Enforce Client Limit
    const companyDoc = await Company.findById(companyId).lean();
    if (companyDoc && companyDoc.clientLimit > 0) {
      const currentClients = await Client.countDocuments({ companyId });
      if (currentClients >= companyDoc.clientLimit) {
        return NextResponse.json({ error: `Client creation limit reached. Max allowed: ${companyDoc.clientLimit}` }, { status: 400 });
      }
    }

    // Check if client with this email already exists under this tenant
    const targetCompanyId = companyId;
    const existing = await Client.findOne({ 
      email: data.email.toLowerCase().trim(),
      companyId: targetCompanyId
    });
    if (existing) {
      return NextResponse.json({ error: 'A client with this email already exists' }, { status: 400 });
    }

    const client = await Client.create({
      ...data,
      email: data.email.toLowerCase().trim(),
      companyId: targetCompanyId
    });
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('Clients POST API Error:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
