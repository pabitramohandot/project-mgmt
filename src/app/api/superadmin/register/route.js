import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import RegisterRequest from '@/models/RegisterRequest';
import Company from '@/models/Company';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';
import { sendOnboardingEmail } from '@/lib/email';

// GET all registration requests
export async function GET(request) {
  try {
    await dbConnect();
    const role = request.headers.get('x-user-role');
    if (role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
    }

    const requests = await RegisterRequest.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    console.error('Superadmin Register GET API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT to update request status
export async function PUT(request) {
  try {
    await dbConnect();
    const role = request.headers.get('x-user-role');
    if (role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
    }

    const { id, status } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'Request ID and status are required' }, { status: 400 });
    }

    const reqDoc = await RegisterRequest.findById(id);
    if (!reqDoc) {
      return NextResponse.json({ error: 'Registration request not found' }, { status: 404 });
    }

    // If changing to approved and it hasn't been approved yet
    if (status === 'approved' && reqDoc.status !== 'approved') {
      // 1. Create company slug
      let companySlug = reqDoc.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (!companySlug) companySlug = 'company';
      
      let baseSlug = companySlug;
      let isSlugUnique = false;
      let counter = 0;
      while (!isSlugUnique) {
        const existing = await Company.findOne({ slug: companySlug });
        if (!existing) {
          isSlugUnique = true;
        } else {
          counter++;
          companySlug = `${baseSlug}-${counter}`;
        }
      }

      // 2. Generate unique username
      let baseUsername = reqDoc.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!baseUsername) baseUsername = 'user';
      
      let username = baseUsername;
      let isUserUnique = false;
      while (!isUserUnique) {
        const existingUser = await User.findOne({ username });
        if (!existingUser) {
          isUserUnique = true;
        } else {
          username = `${baseUsername}${Math.floor(100 + Math.random() * 900)}`;
        }
      }

      // 3. Generate random temporary password
      const tempPassword = Math.random().toString(36).slice(-8) + Math.floor(10 + Math.random() * 90);

      // 4. Create Company
      const company = await Company.create({
        name: reqDoc.companyName,
        slug: companySlug,
        contactEmail: reqDoc.email
      });

      // 5. Create User
      const hashedPassword = await hashPassword(tempPassword);
      await User.create({
        username,
        password: hashedPassword,
        email: reqDoc.email,
        role: 'company_admin',
        companyId: company._id,
        needsPasswordChange: true
      });
      // 6. Send onboarding email
      const emailRes = await sendOnboardingEmail(reqDoc.email, reqDoc.name, username, tempPassword, reqDoc.companyName);
      if (emailRes && emailRes.success === false) {
        console.error('Onboarding email sending failed:', emailRes.error);
        reqDoc.status = status;
        await reqDoc.save();
        return NextResponse.json({ 
          success: true, 
          data: reqDoc, 
          emailError: `Onboarding email failed to send: ${emailRes.error?.message || 'SMTP Error'}` 
        });
      }
    }

    reqDoc.status = status;
    await reqDoc.save();

    return NextResponse.json({ success: true, data: reqDoc });
  } catch (error) {
    console.error('Superadmin Register PUT API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE a registration request
export async function DELETE(request) {
  try {
    await dbConnect();
    const role = request.headers.get('x-user-role');
    if (role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const deleted = await RegisterRequest.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Registration request not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Superadmin Register DELETE API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
