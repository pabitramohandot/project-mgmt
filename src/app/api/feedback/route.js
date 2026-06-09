import dbConnect from '@/lib/db';
import Feedback from '@/models/Feedback';
// Register referenced schemas to avoid Mongoose schema compilation errors during populate
import User from '@/models/User';
import Company from '@/models/Company';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';

export async function POST(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    
    if (!session || !session.userId || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, page, description, screenshot, referenceUrl } = body;

    if (!type || !description) {
      return NextResponse.json({ error: 'Type and description are required' }, { status: 400 });
    }

    if (!['bug', 'feature'].includes(type)) {
      return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 });
    }

    const feedback = await Feedback.create({
      companyId: session.companyId,
      userId: session.userId,
      type,
      page: type === 'bug' ? page : '',
      description,
      screenshot: screenshot || '',
      referenceUrl: type === 'feature' ? referenceUrl : '',
      status: 'pending'
    });

    return NextResponse.json({ success: true, feedback }, { status: 201 });
  } catch (error) {
    console.error('Feedback POST Error:', error);
    return NextResponse.json({ error: 'Failed to create feedback' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);

    if (!session || !session.userId || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = {};
    if (session.role === 'superadmin') {
      query = {};
    } else {
      query = { companyId: session.companyId };
    }

    const feedbacks = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .populate({ path: 'companyId', select: 'name logo' })
      .populate({ path: 'userId', select: 'username email' })
      .lean();

    return NextResponse.json(feedbacks);
  } catch (error) {
    console.error('Feedback GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve feedback' }, { status: 500 });
  }
}
