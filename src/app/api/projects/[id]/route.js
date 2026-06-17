import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Invoice from '@/models/Invoice';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';
import { processProjectStatus } from '@/lib/projectUtils';

export async function GET(request, context) {
  try {
    await dbConnect();
    const params = await context.params;
    const { id } = params;

    const { companyId } = getRequestSession(request);
    let query = { _id: id, companyId };

    const project = await Project.findOne(query).lean();
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch invoices in parallel with checking/updating project overdue status
    const invoicesQuery = { project: id, companyId };
    const invoicesPromise = Invoice.find(invoicesQuery).sort({ createdAt: -1 }).lean();

    const finalProject = processProjectStatus(project);
    const invoices = await invoicesPromise;

    return NextResponse.json({ project: finalProject, invoices });
  } catch (error) {
    console.error('Project GET API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch project details' }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    await dbConnect();
    const params = await context.params;
    const { id } = params;
    const data = await request.json();
    console.log("PUT API data received:", JSON.stringify(data, null, 2));

    const { companyId, role } = getRequestSession(request);
    let query = { _id: id, companyId };

    const project = await Project.findOne(query);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (role === 'company_user') {
      const allowedKeys = ['tasks', 'statusUpdates', 'contentCalendar'];
      const payloadKeys = Object.keys(data);
      const hasRestrictedKeys = payloadKeys.some(key => !allowedKeys.includes(key));
      
      if (hasRestrictedKeys) {
        return NextResponse.json({ error: 'Forbidden: Company users cannot modify project details' }, { status: 403 });
      }

      if (data.tasks && data.tasks.length < (project.tasks || []).length) {
        return NextResponse.json({ error: 'Forbidden: Company users cannot delete tasks' }, { status: 403 });
      }

      if (data.statusUpdates && data.statusUpdates.length < (project.statusUpdates || []).length) {
        return NextResponse.json({ error: 'Forbidden: Company users cannot delete status updates' }, { status: 403 });
      }
    }

    // Convert empty string client to null to avoid Mongoose ObjectId CastErrors
    if (data.client === '') {
      data.client = null;
    }

    // Assign data to the live Mongoose document to trigger state tracking
    Object.assign(project, data);

    const savedProject = await project.save();
    return NextResponse.json(savedProject);
  } catch (error) {
    console.error('Project PUT API Error:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    await dbConnect();
    const params = await context.params;
    const { id } = params;

    const { companyId, role } = getRequestSession(request);
    if (role === 'company_user') {
      return NextResponse.json({ error: 'Forbidden: Company users cannot delete projects' }, { status: 403 });
    }
    let query = { _id: id, companyId };

    const project = await Project.findOne(query);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await Project.deleteOne({ _id: id, companyId });

    // Delete associated invoices
    const invoicesDeleteQuery = { project: id, companyId };
    await Invoice.deleteMany(invoicesDeleteQuery);

    return NextResponse.json({ message: 'Project and associated invoices deleted successfully' });
  } catch (error) {
    console.error('Project DELETE API Error:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
