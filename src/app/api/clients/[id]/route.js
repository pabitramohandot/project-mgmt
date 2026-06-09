import dbConnect from '@/lib/db';
import Client from '@/models/Client';
import Project from '@/models/Project';
import Invoice from '@/models/Invoice';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';

export async function GET(request, context) {
  try {
    await dbConnect();
    const params = await context.params;
    const { id } = params;

    const { companyId, role } = getRequestSession(request);
    let query = { _id: id };
    if (role !== 'superadmin') {
      query.companyId = companyId;
    }

    const client = await Client.findOne(query).lean();
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Return projects and invoices associated with this client, fetched in parallel
    let projectsQuery = { client: id };
    let invoicesQuery = { client: id };
    if (role !== 'superadmin') {
      projectsQuery.companyId = companyId;
      invoicesQuery.companyId = companyId;
    }

    const [projects, invoices] = await Promise.all([
      Project.find(projectsQuery).sort({ createdAt: -1 }).lean(),
      Invoice.find(invoicesQuery).sort({ createdAt: -1 }).lean()
    ]);

    return NextResponse.json({ client, projects, invoices });
  } catch (error) {
    console.error('Client GET API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch client details' }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    await dbConnect();
    const params = await context.params;
    const { id } = params;
    const data = await request.json();

    const { companyId, role } = getRequestSession(request);
    let query = { _id: id };
    if (role !== 'superadmin') {
      query.companyId = companyId;
    }

    const client = await Client.findOne(query);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    Object.assign(client, data);
    const savedClient = await client.save();

    // Also update clientName/clientEmail in linked projects and invoices for legacy compatibility
    let updateQuery = { client: id };
    if (role !== 'superadmin') {
      updateQuery.companyId = companyId;
    }
    await Project.updateMany(updateQuery, { clientName: savedClient.name, clientEmail: savedClient.email });
    await Invoice.updateMany(updateQuery, { clientName: savedClient.name, clientEmail: savedClient.email });

    return NextResponse.json(savedClient);
  } catch (error) {
    console.error('Client PUT API Error:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    await dbConnect();
    const params = await context.params;
    const { id } = params;

    const { companyId, role } = getRequestSession(request);
    let query = { _id: id };
    if (role !== 'superadmin') {
      query.companyId = companyId;
    }

    const client = await Client.findOne(query);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Prevent deletion if linked to projects under this tenant
    let projectCountQuery = { client: id };
    if (role !== 'superadmin') {
      projectCountQuery.companyId = companyId;
    }
    const projectCount = await Project.countDocuments(projectCountQuery);
    if (projectCount > 0) {
      return NextResponse.json({ error: 'Cannot delete client. This client is linked to active projects.' }, { status: 400 });
    }

    await Client.deleteOne({ _id: id });

    return NextResponse.json({ message: 'Client profile deleted successfully' });
  } catch (error) {
    console.error('Client DELETE API Error:', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
