import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Role from '@/models/Role';
import { getRequestSession } from '@/lib/auth';
import { ensureSystemRoles } from '@/lib/permissions';

export async function GET(request) {
  try {
    const { role } = getRequestSession(request);
    if (role !== 'superadmin' && role !== 'company_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    await ensureSystemRoles();
    
    let query = {};
    if (role === 'company_admin') {
      query = { isSystem: { $ne: true } };
    }
    
    const roles = await Role.find(query).sort({ name: 1 }).lean();
    return NextResponse.json(roles);
  } catch (error) {
    console.error('Superadmin Roles GET API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { role } = getRequestSession(request);
    if (role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const data = await request.json();
    const { name, permissions, category } = data;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    // Check unique name case-insensitively
    const existing = await Role.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) {
      return NextResponse.json({ error: 'A role with this name already exists' }, { status: 400 });
    }

    const newRole = await Role.create({
      name: name.trim(),
      category: category || 'Employee',
      permissions: permissions || {},
    });

    return NextResponse.json({ success: true, role: newRole }, { status: 201 });
  } catch (error) {
    console.error('Superadmin Roles POST API Error:', error);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}
