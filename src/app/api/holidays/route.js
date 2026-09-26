import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Holiday from '@/models/Holiday';
import { getRequestSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, role } = session;
    const { searchParams } = new URL(request.url);
    const filterCompanyId = searchParams.get('companyId') || companyId;

    let query = {};
    if (filterCompanyId) {
      query = { companyId: filterCompanyId };
    }

    const holidays = await Holiday.find(query)
      .sort({ date: 1 })
      .lean();

    return NextResponse.json({ success: true, holidays });
  } catch (error) {
    console.error('Holidays GET error:', error);
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

    // Check if bulk array is provided
    const items = Array.isArray(body) ? body : (Array.isArray(body.holidays) ? body.holidays : null);

    if (items) {
      if (items.length === 0) {
        return NextResponse.json({ error: 'No holiday items provided for import' }, { status: 400 });
      }

      const validItems = items
        .filter(item => item && item.title && item.date)
        .map(item => ({
          companyId: session.companyId,
          title: String(item.title).trim(),
          date: String(item.date).trim(),
          type: item.type === 'Optional' || item.type === 'Floating' ? 'Optional' : 'Mandatory',
          description: item.description ? String(item.description).trim() : ''
        }));

      if (validItems.length === 0) {
        return NextResponse.json({ error: 'No valid holiday records found in file. Ensure Title and Date are present.' }, { status: 400 });
      }

      const inserted = await Holiday.insertMany(validItems);
      return NextResponse.json({ success: true, count: inserted.length, holidays: inserted });
    }

    const { title, date, type, description } = body;

    if (!title || !date) {
      return NextResponse.json({ error: 'Title and Date are required' }, { status: 400 });
    }

    const holiday = await Holiday.create({
      companyId: session.companyId,
      title: title.trim(),
      date: date.trim(),
      type: type || 'Mandatory',
      description: description || '',
    });

    return NextResponse.json({ success: true, holiday });
  } catch (error) {
    console.error('Holidays POST error:', error);
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
      return NextResponse.json({ error: 'Holiday ID required' }, { status: 400 });
    }

    await Holiday.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Holidays DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
