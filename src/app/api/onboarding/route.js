import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Onboarding from '@/models/Onboarding';
import User from '@/models/User';
import Company from '@/models/Company';
import Role from '@/models/Role';
import { getRequestSession, hashPassword } from '@/lib/auth';
import { sendOnboardingEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const DEFAULT_ONBOARDING_TASKS = [
  { title: 'Submit signed employment contract & offer letter', category: 'Pre-boarding', completed: false },
  { title: 'Upload ID proof and tax declaration forms', category: 'Pre-boarding', completed: false },
  { title: 'Corporate email & Slack/Teams workspace setup', category: 'Pre-boarding', completed: false },
  { title: 'Welcome call & IT hardware setup (Laptop/Workstation)', category: 'Day 1', completed: false },
  { title: 'Company orientation & code of conduct review', category: 'Day 1', completed: false },
  { title: 'Introduction to assigned buddy / team lead', category: 'Day 1', completed: false },
  { title: 'Complete security compliance & data privacy training', category: 'Week 1', completed: false },
  { title: 'First project onboarding & codebase walkthrough', category: 'Week 1', completed: false },
  { title: '30-Day initial performance & feedback check-in', category: 'Month 1', completed: false },
];

export async function GET(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, role, userId } = session;
    const { searchParams } = new URL(request.url);
    const filterCompanyId = searchParams.get('companyId') || companyId;

    let query = {};
    if (role !== 'superadmin' && role !== 'company_admin') {
      query = { userId };
    } else if (filterCompanyId) {
      query = { companyId: filterCompanyId };
    }

    const onboardings = await Onboarding.find(query)
      .populate({
        path: 'userId',
        select: 'username email role whatsapp customRole category',
        populate: { path: 'customRole', select: 'name permissions' }
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, onboardings });
  } catch (error) {
    console.error('Onboarding GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || (session.role !== 'company_admin' && session.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }

    const body = await request.json();
    const { targetUserId, createAccount, newEmployee, jobTitle, department, startDate, mentor, customTasks } = body;

    let targetUser = null;
    let companyNameStr = 'IONETWEB';

    if (session.companyId) {
      const comp = await Company.findById(session.companyId).lean();
      if (comp) companyNameStr = comp.name;
    }

    if (createAccount && newEmployee) {
      const { username, email, whatsapp, password, customRoleId, category } = newEmployee;
      if (!username || !password) {
        return NextResponse.json({ error: 'Username and password are required for new employee account' }, { status: 400 });
      }

      // Check Superadmin Employee Limit for Company
      if (session.role === 'company_admin' && session.companyId) {
        const company = await Company.findById(session.companyId).lean();
        if (company && company.employeeLimit > 0) {
          const currentEmpCount = await User.countDocuments({ companyId: session.companyId });
          if (currentEmpCount >= company.employeeLimit) {
            return NextResponse.json({
              error: `Employee creation limit reached (${currentEmpCount}/${company.employeeLimit} max). Please contact Superadmin to increase your employee quota.`
            }, { status: 403 });
          }
        }
      }

      const existing = await User.findOne({
        $or: [
          { username: username.trim() },
          ...(email ? [{ email: email.trim().toLowerCase() }] : [])
        ]
      });

      if (existing) {
        return NextResponse.json({ error: 'Employee with this username or email already exists' }, { status: 400 });
      }

      let assignedCategory = category || 'Employee';
      let roleIdToSave = null;

      if (customRoleId) {
        const roleObj = await Role.findById(customRoleId).lean();
        if (roleObj) {
          roleIdToSave = roleObj._id;
          assignedCategory = roleObj.name;
        }
      }

      const hashedPassword = await hashPassword(password);
      targetUser = await User.create({
        username: username.trim(),
        email: email ? email.trim().toLowerCase() : '',
        whatsapp: whatsapp ? whatsapp.trim() : '',
        password: hashedPassword,
        companyId: session.companyId,
        role: 'company_user',
        customRole: roleIdToSave,
        category: assignedCategory
      });

      // Send login info email to the employee if email is provided
      if (email && email.trim()) {
        try {
          await sendOnboardingEmail(
            email.trim().toLowerCase(),
            username.trim(),
            username.trim(),
            password,
            companyNameStr
          );
        } catch (emailErr) {
          console.error('Failed to send onboarding credentials email:', emailErr);
        }
      }
    } else {
      if (!targetUserId) {
        return NextResponse.json({ error: 'Target employee ID or new account details are required' }, { status: 400 });
      }
      targetUser = await User.findById(targetUserId).lean();
      if (!targetUser) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }
    }

    const tasks = customTasks && customTasks.length > 0 ? customTasks : DEFAULT_ONBOARDING_TASKS;

    const onboarding = await Onboarding.create({
      userId: targetUser._id,
      companyId: targetUser.companyId || session.companyId,
      jobTitle: jobTitle || 'Employee',
      department: department || 'General',
      startDate: startDate || new Date().toISOString().split('T')[0],
      mentor: mentor || 'HR Team',
      status: 'In Progress',
      progress: 0,
      tasks,
    });

    return NextResponse.json({ success: true, onboarding, createdUser: targetUser });
  } catch (error) {
    console.error('Onboarding POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, onboardingId, taskId, title, category, completed, jobTitle, department, startDate, mentor } = body;

    if (!onboardingId) {
      return NextResponse.json({ error: 'Onboarding ID is required' }, { status: 400 });
    }

    const onboarding = await Onboarding.findById(onboardingId);
    if (!onboarding) {
      return NextResponse.json({ error: 'Onboarding record not found' }, { status: 404 });
    }

    const isAdmin = session.role === 'company_admin' || session.role === 'superadmin';

    if (action === 'add_task') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
      }
      if (!title || !title.trim()) {
        return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
      }
      onboarding.tasks.push({
        title: title.trim(),
        category: category || 'Pre-boarding',
        completed: false
      });
    } else if (action === 'edit_task') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
      }
      if (!taskId || !title || !title.trim()) {
        return NextResponse.json({ error: 'Task ID and title required' }, { status: 400 });
      }
      const task = onboarding.tasks.id(taskId);
      if (task) {
        task.title = title.trim();
        if (category) task.category = category;
      }
    } else if (action === 'delete_task') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
      }
      if (!taskId) {
        return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
      }
      onboarding.tasks.pull({ _id: taskId });
    } else if (action === 'edit_info') {
      if (!isAdmin) {
        return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
      }
      if (jobTitle) onboarding.jobTitle = jobTitle;
      if (department) onboarding.department = department;
      if (startDate) onboarding.startDate = startDate;
      if (mentor) onboarding.mentor = mentor;
    } else {
      // Default / Toggle task completion
      if (!taskId) {
        return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
      }
      if (!isAdmin && onboarding.userId.toString() !== session.userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      const task = onboarding.tasks.id(taskId);
      if (task) {
        task.completed = completed;
        task.completedAt = completed ? new Date() : null;
      }
    }

    // Recalculate progress percentage
    const completedCount = onboarding.tasks.filter(t => t.completed).length;
    const totalCount = onboarding.tasks.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    onboarding.progress = progress;
    onboarding.status = progress === 100 && totalCount > 0 ? 'Completed' : 'In Progress';
    await onboarding.save();

    const populatedOnboarding = await Onboarding.findById(onboarding._id)
      .populate({
        path: 'userId',
        select: 'username email role whatsapp customRole category',
        populate: { path: 'customRole', select: 'name permissions' }
      })
      .lean();

    return NextResponse.json({ success: true, onboarding: populatedOnboarding });
  } catch (error) {
    console.error('Onboarding PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || (session.role !== 'company_admin' && session.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Onboarding ID required' }, { status: 400 });
    }

    await Onboarding.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
