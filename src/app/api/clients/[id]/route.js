import dbConnect from '@/lib/db';
import Client from '@/models/Client';
import Project from '@/models/Project';
import Invoice from '@/models/Invoice';
import { NextResponse } from 'next/server';

export async function GET(request, context) {
  try {
    await dbConnect();
    const params = await context.params;
    const { id } = params;

    const client = await Client.findById(id).lean();
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Return projects and invoices associated with this client, fetched in parallel
    const [projects, invoices] = await Promise.all([
      Project.find({ client: id }).sort({ createdAt: -1 }).lean(),
      Invoice.find({ client: id }).sort({ createdAt: -1 }).lean()
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

    const client = await Client.findById(id);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    Object.assign(client, data);
    const savedClient = await client.save();

    // Also update clientName/clientEmail in linked projects and invoices for legacy compatibility
    await Project.updateMany({ client: id }, { clientName: savedClient.name, clientEmail: savedClient.email });
    await Invoice.updateMany({ client: id }, { clientName: savedClient.name, clientEmail: savedClient.email });

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

    // Prevent deletion if linked to projects
    const projectCount = await Project.countDocuments({ client: id });
    if (projectCount > 0) {
      return NextResponse.json({ error: 'Cannot delete client. This client is linked to active projects.' }, { status: 400 });
    }

    const client = await Client.findByIdAndDelete(id);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Client profile deleted successfully' });
  } catch (error) {
    console.error('Client DELETE API Error:', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
