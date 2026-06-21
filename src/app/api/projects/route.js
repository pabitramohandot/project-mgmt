import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Client from '@/models/Client';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';
import { processProjectStatus } from '@/lib/projectUtils';

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

    const now = new Date();
    // Background update category statuses to Pending if overdue
    Project.updateMany(
      {
        companyId,
        projectType: 'Development',
        devEndDate: { $lt: now },
        devStatus: { $nin: ['Completed', 'Pending'] }
      },
      { $set: { devStatus: 'Pending', status: 'Pending' } }
    ).catch(err => console.error('Error auto-updating devStatus in GET:', err));

    Project.updateMany(
      {
        companyId,
        projectType: '360 Deg Digital Marketing',
        marketingEndDate: { $lt: now },
        marketingStatus: { $nin: ['Completed', 'Pending'] }
      },
      { $set: { marketingStatus: 'Pending', status: 'Pending' } }
    ).catch(err => console.error('Error auto-updating marketingStatus in GET:', err));

    Project.updateMany(
      {
        companyId,
        projectType: 'Meta / Google Ads',
        adsDate: { $lt: now },
        adsStatus: { $nin: ['Completed', 'Pending'] }
      },
      { $set: { adsStatus: 'Pending', status: 'Pending' } }
    ).catch(err => console.error('Error auto-updating adsStatus in GET:', err));

    Project.updateMany(
      {
        companyId,
        projectType: 'Design',
        designEndDate: { $lt: now },
        designStatus: { $nin: ['Completed', 'Pending'] }
      },
      { $set: { designStatus: 'Pending', status: 'Pending' } }
    ).catch(err => console.error('Error auto-updating designStatus in GET:', err));

    const projects = await Project.find(query).populate('client').sort({ createdAt: -1 }).lean();
    
    // Map status dynamically checking for any overdue project categories
    const processedProjects = projects.map(proj => processProjectStatus(proj));

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
