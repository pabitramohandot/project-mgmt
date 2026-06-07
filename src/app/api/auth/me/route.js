import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json({ loggedIn: false });
    }

    return NextResponse.json({ loggedIn: true, username: payload.username });
  } catch (error) {
    console.error('Me API Error:', error);
    return NextResponse.json({ loggedIn: false }, { status: 500 });
  }
}
