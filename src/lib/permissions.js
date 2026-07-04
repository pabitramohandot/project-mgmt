import dbConnect from './db';
import User from '@/models/User';
import Role from '@/models/Role';
import { getRequestSession } from './auth';

// Sensible fallback permissions for users without custom roles (Employee)
export const DEFAULT_USER_PERMISSIONS = {
  ai_agent: 'read',
  clients: 'none',
  invoices: 'none',
  credentials: 'read',
  pending_tasks: 'read',
  announcements: 'read',
  branding: 'none',
  reminders: 'read',
  google_meet: 'none',

  project_details: 'read',
  project_credential: 'read',
  project_links: 'read',
  project_pricing: 'none',
  project_invoice: 'none',
  project_status: 'read',
  project_tasks: 'write',
  project_calendar: 'write',
};

// Management default read-only permissions
export const MANAGEMENT_PERMISSIONS = {
  ai_agent: 'read',
  clients: 'read',
  invoices: 'read',
  credentials: 'read',
  pending_tasks: 'read',
  announcements: 'read',
  branding: 'read',
  reminders: 'read',
  google_meet: 'none',

  project_details: 'read',
  project_credential: 'read',
  project_links: 'read',
  project_pricing: 'read',
  project_invoice: 'read',
  project_status: 'read',
  project_tasks: 'read',
  project_calendar: 'read',
};

export const ADMIN_PERMISSIONS = {
  ai_agent: 'write',
  clients: 'write',
  invoices: 'write',
  credentials: 'write',
  pending_tasks: 'write',
  announcements: 'write',
  branding: 'write',
  reminders: 'write',
  google_meet: 'write',

  project_details: 'write',
  project_credential: 'write',
  project_links: 'write',
  project_pricing: 'write',
  project_invoice: 'write',
  project_status: 'write',
  project_tasks: 'write',
  project_calendar: 'write',
};

/**
 * Helper to ensure system roles exist in the database.
 */
export async function ensureSystemRoles() {
  await dbConnect();

  // 1. Company Admin Role
  const adminExists = await Role.findOne({ name: 'Company Admin' });
  if (!adminExists) {
    await Role.create({
      name: 'Company Admin',
      isSystem: true,
      category: 'Admin',
      permissions: ADMIN_PERMISSIONS,
    });
  } else if (!adminExists.category) {
    adminExists.category = 'Admin';
    await adminExists.save();
  }

  // 2. Company Management (Default) Role
  const mgmtExists = await Role.findOne({ name: 'Company Management (Default)' });
  if (!mgmtExists) {
    await Role.create({
      name: 'Company Management (Default)',
      isSystem: true,
      category: 'Management',
      permissions: MANAGEMENT_PERMISSIONS,
    });
  } else if (!mgmtExists.category) {
    mgmtExists.category = 'Management';
    await mgmtExists.save();
  }

  // 3. Company User (Default) Role
  const userExists = await Role.findOne({ name: 'Company User (Default)' });
  if (!userExists) {
    await Role.create({
      name: 'Company User (Default)',
      isSystem: true,
      category: 'Employee',
      permissions: DEFAULT_USER_PERMISSIONS,
    });
  } else if (!userExists.category) {
    userExists.category = 'Employee';
    await userExists.save();
  }
}

/**
 * Computes the permission mapping for a given user document (which may have populated customRole).
 */
export async function getPermissionsForUser(user) {
  if (!user) return null;

  // Superadmin gets full write access to everything
  if (user.role === 'superadmin') {
    return ADMIN_PERMISSIONS;
  }

  // If company_user has a custom role, use its permissions
  if (user.role === 'company_user' && user.customRole) {
    const roleDoc = typeof user.customRole === 'object' 
      ? user.customRole 
      : await Role.findById(user.customRole).lean();
    if (roleDoc) {
      const p = roleDoc.permissions || {};
      return {
        ai_agent: p.ai_agent || 'none',
        clients: p.clients || 'none',
        invoices: p.invoices || 'none',
        credentials: p.credentials || 'none',
        pending_tasks: p.pending_tasks || 'none',
        announcements: p.announcements || 'none',
        branding: p.branding || 'none',
        reminders: p.reminders || 'none',
        google_meet: p.google_meet || 'none',
        project_details: p.project_details || 'none',
        project_credential: p.project_credential || 'none',
        project_links: p.project_links || 'none',
        project_pricing: p.project_pricing || 'none',
        project_invoice: p.project_invoice || 'none',
        project_status: p.project_status || 'none',
        project_tasks: p.project_tasks || 'none',
        project_calendar: p.project_calendar || 'none',
      };
    }
  }

  // Otherwise check database for seeded system roles: "Company Admin" or "Company User (Default)"
  const systemRoleName = user.role === 'company_admin' ? 'Company Admin' : 'Company User (Default)';
  let dbRole = await Role.findOne({ name: systemRoleName }).lean();
  if (!dbRole) {
    await ensureSystemRoles();
    dbRole = await Role.findOne({ name: systemRoleName }).lean();
  }

  if (dbRole) {
    const p = dbRole.permissions || {};
    return {
      ai_agent: p.ai_agent || 'none',
      clients: p.clients || 'none',
      invoices: p.invoices || 'none',
      credentials: p.credentials || 'none',
      pending_tasks: p.pending_tasks || 'none',
      announcements: p.announcements || 'none',
      branding: p.branding || 'none',
      reminders: p.reminders || 'none',
      google_meet: p.google_meet || 'none',
      project_details: p.project_details || 'none',
      project_credential: p.project_credential || 'none',
      project_links: p.project_links || 'none',
      project_pricing: p.project_pricing || 'none',
      project_invoice: p.project_invoice || 'none',
      project_status: p.project_status || 'none',
      project_tasks: p.project_tasks || 'none',
      project_calendar: p.project_calendar || 'none',
    };
  }

  // Fallback default permissions
  return user.role === 'company_admin' ? ADMIN_PERMISSIONS : DEFAULT_USER_PERMISSIONS;
}

/**
 * Resolves the role category ('Admin', 'Management', or 'Employee') for a user.
 */
export async function getCategoryForUser(user) {
  if (!user) return 'Employee';
  if (user.role === 'superadmin') return 'Admin';

  if (user.role === 'company_user' && user.customRole) {
    const roleDoc = typeof user.customRole === 'object'
      ? user.customRole
      : await Role.findById(user.customRole).lean();
    if (roleDoc && roleDoc.category) {
      return roleDoc.category;
    }
  }

  // Fallback defaults based on user.role
  if (user.role === 'company_admin') return 'Admin';
  
  // Look up seeded role for default category in DB if needed, or return Employee
  const systemRoleName = user.role === 'company_admin' ? 'Company Admin' : 'Company User (Default)';
  const dbRole = await Role.findOne({ name: systemRoleName }).lean();
  if (dbRole && dbRole.category) {
    return dbRole.category;
  }

  return user.role === 'company_admin' ? 'Admin' : 'Employee';
}

/**
 * Server-side helper to check if the current request session user has required permissions.
 */
export async function hasPermission(request, resource, requiredLevel = 'read') {
  const { role, userId } = getRequestSession(request);
  if (!role || !userId) return false;

  // Superadmins bypass all checks
  if (role === 'superadmin') return true;

  await dbConnect();
  // Retrieve user and populate custom role
  const user = await User.findById(userId).populate('customRole').lean();
  if (!user) return false;

  const permissions = await getPermissionsForUser(user);
  if (!permissions) return false;

  const level = permissions[resource] || 'none';

  if (requiredLevel === 'write') {
    return level === 'write';
  }
  if (requiredLevel === 'read') {
    return level === 'read' || level === 'write';
  }

  return false;
}
