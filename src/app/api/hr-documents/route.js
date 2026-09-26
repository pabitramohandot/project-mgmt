import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import HRDocument from '@/models/HRDocument';
import { getRequestSession } from '@/lib/auth';

import User from '@/models/User';
import { getCategoryForUser } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, role, userId } = session;
    const currentUser = await User.findById(userId).populate('customRole').lean();
    const category = await getCategoryForUser(currentUser);

    const { searchParams } = new URL(request.url);
    const filterCompanyId = searchParams.get('companyId') || companyId;

    let query = {};
    if (category === 'Employee' || (role !== 'superadmin' && role !== 'company_admin')) {
      // Employees see company policies or docs assigned to them
      query = {
        companyId: filterCompanyId || companyId,
        $or: [{ userId: null }, { userId }]
      };
    } else if (filterCompanyId) {
      query = { companyId: filterCompanyId };
    }

    const documents = await HRDocument.find(query)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, documents });
  } catch (error) {
    console.error('HR Documents GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || (session.role !== 'company_admin' && session.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, category, fileUrl, fileType, userId, notes } = body;

    if (!name || !fileUrl) {
      return NextResponse.json({ error: 'Document name and file URL are required' }, { status: 400 });
    }

    const doc = await HRDocument.create({
      companyId: session.companyId,
      userId: userId || null,
      name,
      category: category || 'Company Policy',
      fileUrl,
      fileType: fileType || 'PDF',
      notes: notes || '',
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    console.error('HR Documents POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || (session.role !== 'company_admin' && session.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    await HRDocument.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('HR Documents DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
