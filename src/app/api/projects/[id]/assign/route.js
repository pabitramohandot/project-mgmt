import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';
import { getCategoryForUser } from '@/lib/permissions';

// GET: fetch assigned employees for a project
export async function GET(request, context) {
  try {
    await dbConnect();
    const params = await context.params;
    const { id } = params;
    const { companyId } = getRequestSession(request);

    const project = await Project.findOne({ _id: id, companyId })
      .select('assignedEmployees')
      .populate('assignedEmployees', 'username email role')
      .lean();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ assignedEmployees: project.assignedEmployees || [] });
  } catch (error) {
    console.error('Project assign GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch assigned employees' }, { status: 500 });
  }
}

// PUT: set/update the full list of assigned employees
export async function PUT(request, context) {
  try {
    await dbConnect();
    const params = await context.params;
    const { id } = params;
    const { companyId, userId } = getRequestSession(request);

    // Only admin or management can assign employees
    const userDoc = await User.findById(userId).populate('customRole').lean();
    const category = await getCategoryForUser(userDoc);

    if (
      userDoc.role !== 'superadmin' &&
      userDoc.role !== 'company_admin' &&
      category !== 'Management'
    ) {
      return NextResponse.json({ error: 'Forbidden: Only Admin or Management can assign employees' }, { status: 403 });
    }

    const { employeeIds } = await request.json();

    if (!Array.isArray(employeeIds)) {
      return NextResponse.json({ error: 'employeeIds must be an array' }, { status: 400 });
    }

    const project = await Project.findOne({ _id: id, companyId });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Validate that all IDs belong to the same company
    if (employeeIds.length > 0) {
      const validUsers = await User.find({ _id: { $in: employeeIds }, companyId }).select('_id').lean();
      const validIds = validUsers.map(u => u._id.toString());
      const invalidIds = employeeIds.filter(eid => !validIds.includes(eid));
      if (invalidIds.length > 0) {
        return NextResponse.json({ error: 'Some employee IDs are invalid or not in this company' }, { status: 400 });
      }
    }

    project.assignedEmployees = employeeIds;
    await project.save();

    const updated = await Project.findById(id)
      .select('assignedEmployees')
      .populate('assignedEmployees', 'username email role')
      .lean();

    return NextResponse.json({ assignedEmployees: updated.assignedEmployees || [] });
  } catch (error) {
    console.error('Project assign PUT error:', error);
    return NextResponse.json({ error: 'Failed to update assigned employees' }, { status: 500 });
  }
}
