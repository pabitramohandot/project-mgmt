import dbConnect from '@/lib/db';
import Credential from '@/models/Credential';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';
import { hasPermission, getCategoryForUser } from '@/lib/permissions';

function checkPasscode(request) {
  const passcode = request.headers.get('x-vault-passcode');
  const expectedPasscode = process.env.CREDENTIALS_SECRET_CODE || 'ABC012';
  return passcode === expectedPasscode;
}

export async function PUT(request, context) {
  try {
    const isAllowed = await hasPermission(request, 'credentials', 'write');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to modify credentials' }, { status: 403 });
    }

    if (!checkPasscode(request)) {
      return NextResponse.json({ error: 'Unauthorized. Invalid vault passcode.' }, { status: 401 });
    }

    await dbConnect();
    const params = await context.params;
    const { id } = params;
    const data = await request.json();

    const { companyId, userId } = getRequestSession(request);
    const user = await User.findById(userId).populate('customRole').lean();
    const category = await getCategoryForUser(user);

    let query = { _id: id, companyId };

    // Employees can only edit credentials they created
    if (category === 'Employee') {
      query.createdBy = userId;
    }

    const credential = await Credential.findOne(query);
    if (!credential) {
      return NextResponse.json({ error: 'Credential not found or access denied' }, { status: 404 });
    }

    if (data.title !== undefined) credential.title = data.title.trim();
    if (data.username !== undefined) credential.username = data.username.trim();
    if (data.password !== undefined) credential.password = data.password;
    if (data.url !== undefined) credential.url = data.url.trim();
    if (data.notes !== undefined) credential.notes = data.notes.trim();

    const saved = await credential.save();
    return NextResponse.json(saved);
  } catch (error) {
    console.error('Credential PUT API Error:', error);
    return NextResponse.json({ error: 'Failed to update credential' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const isAllowed = await hasPermission(request, 'credentials', 'write');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to delete credentials' }, { status: 403 });
    }

    if (!checkPasscode(request)) {
      return NextResponse.json({ error: 'Unauthorized. Invalid vault passcode.' }, { status: 401 });
    }

    await dbConnect();
    const params = await context.params;
    const { id } = params;

    const { companyId, userId } = getRequestSession(request);
    const user = await User.findById(userId).populate('customRole').lean();
    const category = await getCategoryForUser(user);

    let query = { _id: id, companyId };

    // Employees can only delete credentials they created
    if (category === 'Employee') {
      query.createdBy = userId;
    }

    const credential = await Credential.findOne(query);
    if (!credential) {
      return NextResponse.json({ error: 'Credential not found or access denied' }, { status: 404 });
    }

    await Credential.deleteOne({ _id: id });

    return NextResponse.json({ message: 'Credential deleted successfully' });
  } catch (error) {
    console.error('Credential DELETE API Error:', error);
    return NextResponse.json({ error: 'Failed to delete credential' }, { status: 500 });
  }
}
