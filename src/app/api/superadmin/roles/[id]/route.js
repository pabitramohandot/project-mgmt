import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Role from '@/models/Role';
import User from '@/models/User';
import { getRequestSession } from '@/lib/auth';

export async function GET(request, context) {
  try {
    const { role } = getRequestSession(request);
    if (role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const params = await context.params;
    const { id } = params;

    const singleRole = await Role.findById(id).lean();
    if (!singleRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json(singleRole);
  } catch (error) {
    console.error('Superadmin Role details GET API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch role details' }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    const { role } = getRequestSession(request);
    if (role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const params = await context.params;
    const { id } = params;
    const data = await request.json();
    const { name, permissions, category } = data;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const existingRole = await Role.findById(id);
    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (existingRole.isSystem && name.trim() !== existingRole.name) {
      return NextResponse.json({ error: 'System role names cannot be modified' }, { status: 400 });
    }

    if (existingRole.isSystem && category && category !== existingRole.category) {
      return NextResponse.json({ error: 'System role categories cannot be modified' }, { status: 400 });
    }

    // Check unique name if name changed
    const existingNameMatch = await Role.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });
    if (existingNameMatch) {
      return NextResponse.json({ error: 'Another role with this name already exists' }, { status: 400 });
    }

    const updateData = { name: name.trim(), permissions };
    if (!existingRole.isSystem && category) {
      updateData.category = category;
    }

    const updatedRole = await Role.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, role: updatedRole });
  } catch (error) {
    console.error('Superadmin Role detail PUT API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update role' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const { role } = getRequestSession(request);
    if (role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const params = await context.params;
    const { id } = params;

    const singleRole = await Role.findById(id);
    if (!singleRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (singleRole.isSystem) {
      return NextResponse.json({ error: 'System roles cannot be deleted' }, { status: 400 });
    }

    // Remove the role
    await Role.findByIdAndDelete(id);

    // Reset any users referencing this deleted custom role back to null
    await User.updateMany({ customRole: id }, { customRole: null });

    return NextResponse.json({ success: true, message: 'Role deleted successfully and assigned users reset' });
  } catch (error) {
    console.error('Superadmin Role detail DELETE API Error:', error);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}
