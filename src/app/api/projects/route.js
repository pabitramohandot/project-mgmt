import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Client from '@/models/Client';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const { companyId } = getRequestSession(request);
    let query = { companyId };

    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Auto update past-due projects to Pending in the background to avoid blocking
    Project.updateMany(
      {
        ...query,
        endDate: { $lt: new Date() },
        status: { $nin: ['Completed', 'Pending'] }
      },
      { $set: { status: 'Pending' } }
    ).catch(err => console.error('Error auto-updating projects in GET:', err));

    const projects = await Project.find(query).populate('client').sort({ createdAt: -1 }).lean();
    
    // Map status dynamically to Pending for any overdue project not yet saved in DB
    const processedProjects = projects.map(proj => {
      if (proj.endDate && new Date(proj.endDate) < new Date() && proj.status !== 'Completed' && proj.status !== 'Pending') {
        return { ...proj, status: 'Pending' };
      }
      return proj;
    });

    return NextResponse.json(processedProjects);
  } catch (error) {
    console.error('Projects GET API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const { companyId } = getRequestSession(request);
    const data = await request.json();

    if (!data.name || !data.clientName) {
      return NextResponse.json({ error: 'Project Name and Client Name are required' }, { status: 400 });
    }

    // Convert empty string client to null to avoid Mongoose ObjectId CastErrors
    if (data.client === '') {
      data.client = null;
    }

    data.companyId = companyId;

    const project = await Project.create(data);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Projects POST API Error:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
