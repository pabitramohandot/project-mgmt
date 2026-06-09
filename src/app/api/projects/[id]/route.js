import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Invoice from '@/models/Invoice';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';

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

    let finalProject = project;
    if (project.endDate && new Date(project.endDate) < new Date() && project.status !== 'Completed' && project.status !== 'Pending') {
      // Dynamic update for the response object
      finalProject = { ...project, status: 'Pending' };
      // Database update in background
      Project.updateOne({ _id: id }, { $set: { status: 'Pending' } })
        .catch(err => console.error('Error auto-updating project status in GET [id]:', err));
    }

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

    const { companyId } = getRequestSession(request);
    let query = { _id: id, companyId };

    const project = await Project.findOne(query);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
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

    const { companyId } = getRequestSession(request);
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
