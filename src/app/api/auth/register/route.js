import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import RegisterRequest from '@/models/RegisterRequest';

export async function POST(request) {
  try {
    await dbConnect();
    const { name, email, mobile, companyName, employees, source } = await request.json();

    if (!name || !email || !mobile || !companyName || !employees || !source) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const requestDoc = await RegisterRequest.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
      companyName: companyName.trim(),
      employees: employees.trim(),
      source: source.trim(),
      status: 'pending'
    });

    return NextResponse.json({ success: true, data: requestDoc });
  } catch (error) {
    console.error('Register API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
