import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Invoice from '@/models/Invoice';
import User from '@/models/User';
import Role from '@/models/Role';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';
import { processProjectStatus } from '@/lib/projectUtils';
import { getPermissionsForUser, getCategoryForUser } from '@/lib/permissions';

export async function GET(request, context) {
  try {
    await dbConnect();
    const params = await context.params;
    const { id } = params;

    const { companyId, userId } = getRequestSession(request);

    // Retrieve permissions
    const userDoc = await User.findById(userId).populate('customRole').lean();
    const permissions = await getPermissionsForUser(userDoc);
    
    const hasAnyProjectPermission = permissions && (
      permissions.project_details !== 'none' ||
      permissions.project_credential !== 'none' ||
      permissions.project_links !== 'none' ||
      permissions.project_pricing !== 'none' ||
      permissions.project_invoice !== 'none' ||
      permissions.project_status !== 'none' ||
      permissions.project_tasks !== 'none' ||
      permissions.project_calendar !== 'none'
    );

    if (!hasAnyProjectPermission) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view this project' }, { status: 403 });
    }

    let query = { _id: id, companyId };

    const project = await Project.findOne(query)
      .populate('assignedEmployees', 'username email role')
      .lean();
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch invoices in parallel with checking/updating project overdue status
    const invoicesQuery = { project: id, companyId };
    const invoicesPromise = Invoice.find(invoicesQuery).sort({ createdAt: -1 }).lean();

    const finalProject = processProjectStatus(project);
    const invoices = await invoicesPromise;

    // Fetch all users belonging to the project's company to support task assignment
    const projectCompanyUsers = await User.find({ companyId: project.companyId })
      .select('username role email whatsapp createdAt')
      .sort({ username: 1 })
      .lean();

    return NextResponse.json({ 
      project: finalProject, 
      invoices, 
      companyUsers: projectCompanyUsers 
    });
  } catch (error) {
    console.error('Project GET API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch project details' }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    await dbConnect();
    const params = await context.params;
    const { id } = params;
    const data = await request.json();
    console.log("PUT API data received:", JSON.stringify(data, null, 2));

    const { companyId, userId } = getRequestSession(request);

    // Retrieve permissions
    const userDoc = await User.findById(userId).populate('customRole').lean();
    const permissions = await getPermissionsForUser(userDoc);

    let query = { _id: id, companyId };

    const project = await Project.findOne(query);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (permissions) {
      const payloadKeys = Object.keys(data);
      
      for (const key of payloadKeys) {
        if (key === 'tasks') {
          if (permissions.project_tasks !== 'write') {
            return NextResponse.json({ error: 'Forbidden: You do not have permission to modify tasks' }, { status: 403 });
          }
          const category = await getCategoryForUser(userDoc);
          if (category === 'Employee') {
            const existingTaskIds = (project.tasks || []).map(t => t._id.toString());
            const newPayloadTaskIds = (data.tasks || []).map(t => t._id ? t._id.toString() : '');
            const anyDeleted = existingTaskIds.some(id => !newPayloadTaskIds.includes(id));
            if (anyDeleted) {
              return NextResponse.json({ error: 'Forbidden: Employees cannot delete tasks' }, { status: 403 });
            }
            
            // Validate that only completed/status fields were modified for existing tasks
            for (const newTask of (data.tasks || [])) {
              if (newTask._id) {
                const existingTask = (project.tasks || []).find(t => t._id.toString() === newTask._id.toString());
                if (existingTask) {
                  const existingDateStr = existingTask.dueDate ? new Date(existingTask.dueDate).toISOString() : null;
                  const newDateStr = newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null;
                  
                  if (
                    existingTask.name !== newTask.name ||
                    existingTask.assignedTo !== newTask.assignedTo ||
                    existingDateStr !== newDateStr ||
                    existingTask.priority !== newTask.priority ||
                    existingTask.notes !== newTask.notes
                  ) {
                    return NextResponse.json({ error: 'Forbidden: Employees can only change task status or mark it as read' }, { status: 403 });
                  }
                }
              }
            }
          }
        } else if (key === 'statusUpdates') {
          if (permissions.project_status !== 'write') {
            return NextResponse.json({ error: 'Forbidden: You do not have permission to modify status updates' }, { status: 403 });
          }
        } else if (key === 'contentCalendar') {
          if (permissions.project_calendar !== 'write') {
            return NextResponse.json({ error: 'Forbidden: You do not have permission to modify the content calendar' }, { status: 403 });
          }
        } else if (key === 'credentials') {
          if (permissions.project_credential !== 'write') {
            return NextResponse.json({ error: 'Forbidden: You do not have permission to modify credentials' }, { status: 403 });
          }
        } else if (key === 'links') {
          if (permissions.project_links !== 'write') {
            return NextResponse.json({ error: 'Forbidden: You do not have permission to modify links' }, { status: 403 });
          }
        } else {
          // All other fields (e.g. name, description, dates, pricing, category etc.) fall under project_details
          if (permissions.project_details !== 'write') {
            return NextResponse.json({ error: 'Forbidden: You do not have permission to modify project details' }, { status: 403 });
          }
        }
      }
    }

    // Convert empty string client to null to avoid Mongoose ObjectId CastErrors
    if (data.client === '') {
      data.client = null;
    }

    // Assign data to the live Mongoose document to trigger state tracking
    Object.assign(project, data);

    const savedProject = await project.save();
    return NextResponse.json(savedProject);
  } catch (error) {
    console.error('Project PUT API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    await dbConnect();
    const params = await context.params;
    const { id } = params;

    const { companyId, userId } = getRequestSession(request);
    
    // Retrieve permissions
    const userDoc = await User.findById(userId).populate('customRole').lean();
    const permissions = await getPermissionsForUser(userDoc);
    
    if (!permissions || permissions.project_details !== 'write') {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to delete projects' }, { status: 403 });
    }
    
    let query = { _id: id, companyId };

    const project = await Project.findOne(query);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await Project.deleteOne({ _id: id, companyId });

    // Delete associated invoices
    const invoicesDeleteQuery = { project: id, companyId };
    await Invoice.deleteMany(invoicesDeleteQuery);

    return NextResponse.json({ message: 'Project and associated invoices deleted successfully' });
  } catch (error) {
    console.error('Project DELETE API Error:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
