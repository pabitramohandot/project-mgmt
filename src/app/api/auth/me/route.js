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
    let companyUsers = [];
    if (user.companyId) {
      company = await Company.findById(user.companyId).lean();
      if (user.role === 'company_admin' || user.role === 'superadmin') {
        companyUsers = await User.find({ companyId: user.companyId }).select('username role email whatsapp createdAt').sort({ username: 1 }).lean();
      }
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
        brandColors: company.brandColors,
        emailSettings: {
          user: company.emailSettings?.user || '',
          hasPassword: !!company.emailSettings?.pass
        }
      } : null,
      companyUsers: companyUsers.map(u => ({
        id: u._id.toString(),
        username: u.username,
        role: u.role,
        email: u.email || '',
        whatsapp: u.whatsapp || '',
        createdAt: u.createdAt
      }))
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
    const { password, email, whatsapp, companyEmailUser, companyEmailPass } = data;

    if (email !== undefined) user.email = email.trim();
    if (whatsapp !== undefined) user.whatsapp = whatsapp.trim();
    
    if (password) {
      user.password = await hashPassword(password);
    }

    await user.save();

    // If company admin or super admin, save custom email settings
    if (user.companyId && (user.role === 'company_admin' || user.role === 'superadmin')) {
      const company = await Company.findById(user.companyId);
      if (company) {
        if (!company.emailSettings) {
          company.emailSettings = { user: '', pass: '' };
        }
        if (companyEmailUser !== undefined) {
          company.emailSettings.user = companyEmailUser.trim();
        }
        if (companyEmailPass !== undefined) {
          const trimmedPass = companyEmailPass.trim();
          if (trimmedPass !== '' && trimmedPass !== '••••••••') {
            company.emailSettings.pass = trimmedPass;
          }
        }
        await company.save();
      }
    }

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

