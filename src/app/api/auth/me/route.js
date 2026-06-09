import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Company from '@/models/Company';
import User from '@/models/User';
import { verifyToken, hashPassword } from '@/lib/auth';

export async function GET(request) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json({ loggedIn: false });
    }

    await dbConnect();
    const user = await User.findById(payload.userId).lean();
    if (!user) {
      return NextResponse.json({ loggedIn: false });
    }

    let company = null;
    if (user.companyId) {
      company = await Company.findById(user.companyId).lean();
    }

    return NextResponse.json({
      loggedIn: true,
      username: user.username,
      userId: user._id.toString(),
      companyId: user.companyId ? user.companyId.toString() : null,
      role: user.role,
      email: user.email || '',
      whatsapp: user.whatsapp || '',
      company: company ? {
        name: company.name,
        slug: company.slug,
        logo: company.logo,
        brandColors: company.brandColors
      } : null
    });
  } catch (error) {
    console.error('Me API Error:', error);
    return NextResponse.json({ loggedIn: false }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized: Login required' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data = await request.json();
    const { password, email, whatsapp } = data;

    if (email !== undefined) user.email = email.trim();
    if (whatsapp !== undefined) user.whatsapp = whatsapp.trim();
    
    if (password) {
      user.password = await hashPassword(password);
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Account settings updated successfully',
      user: {
        username: user.username,
        email: user.email,
        whatsapp: user.whatsapp
      }
    });
  } catch (error) {
    console.error('Me PUT API Error:', error);
    return NextResponse.json({ error: 'Failed to update account settings' }, { status: 500 });
  }
}

