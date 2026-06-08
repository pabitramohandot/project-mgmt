import dbConnect from '@/lib/db';
import Credential from '@/models/Credential';
import { NextResponse } from 'next/server';

function checkPasscode(request) {
  const passcode = request.headers.get('x-vault-passcode');
  const expectedPasscode = process.env.CREDENTIALS_SECRET_CODE || 'ABC012';
  return passcode === expectedPasscode;
}

export async function GET(request) {
  try {
    if (!checkPasscode(request)) {
      return NextResponse.json({ error: 'Unauthorized. Invalid vault passcode.' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const credentials = await Credential.find(query).sort({ title: 1 }).lean();
    return NextResponse.json(credentials);
  } catch (error) {
    console.error('Credentials GET API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!checkPasscode(request)) {
      return NextResponse.json({ error: 'Unauthorized. Invalid vault passcode.' }, { status: 401 });
    }

    await dbConnect();
    const data = await request.json();

    if (!data.title) {
      return NextResponse.json({ error: 'Credential title is required' }, { status: 400 });
    }

    const credential = await Credential.create({
      title: data.title.trim(),
      username: (data.username || '').trim(),
      password: data.password || '',
      url: (data.url || '').trim(),
      notes: (data.notes || '').trim(),
    });

    return NextResponse.json(credential, { status: 201 });
  } catch (error) {
    console.error('Credentials POST API Error:', error);
    return NextResponse.json({ error: 'Failed to create credential' }, { status: 500 });
  }
}
