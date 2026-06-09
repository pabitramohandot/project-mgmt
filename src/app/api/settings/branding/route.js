import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Company from '@/models/Company';
import { getRequestSession } from '@/lib/auth';

export async function PUT(request) {
  try {
    const { companyId, role } = getRequestSession(request);
    if (!companyId || (role !== 'company_admin' && role !== 'superadmin')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    await dbConnect();
    const data = await request.json();

    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (data.logo !== undefined) company.logo = data.logo;
    if (data.brandColors !== undefined) {
      company.brandColors = {
        primary: data.brandColors.primary || company.brandColors.primary,
        secondary: data.brandColors.secondary || company.brandColors.secondary,
      };
    }

    const saved = await company.save();
    return NextResponse.json(saved);
  } catch (error) {
    console.error('Settings Branding PUT API Error:', error);
    return NextResponse.json({ error: 'Failed to update branding settings' }, { status: 500 });
  }
}
