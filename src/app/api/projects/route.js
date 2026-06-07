import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Client from '@/models/Client';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = {};
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

    // Auto update past-due projects to Pending
    await Project.updateMany(
      {
        endDate: { $lt: new Date() },
        status: { $nin: ['Completed', 'Pending'] }
      },
      { $set: { status: 'Pending' } }
    );

    const projects = await Project.find(query).populate('client').sort({ createdAt: -1 });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Projects GET API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const data = await request.json();

    if (!data.name || !data.clientName) {
      return NextResponse.json({ error: 'Project Name and Client Name are required' }, { status: 400 });
    }

    // Convert empty string client to null to avoid Mongoose ObjectId CastErrors
    if (data.client === '') {
      data.client = null;
    }

    const project = await Project.create(data);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Projects POST API Error:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
