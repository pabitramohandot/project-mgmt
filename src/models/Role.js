import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a role name'],
      unique: true,
      trim: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      enum: ['Admin', 'Management', 'Employee'],
      default: 'Employee',
    },
    permissions: {
      // Global Sidebar Modules
      ai_agent: { type: String, enum: ['none', 'read', 'write'], default: 'none' },
      crm: { type: String, enum: ['none', 'read', 'write'], default: 'write' },
      clients: { type: String, enum: ['none', 'read', 'write'], default: 'none' },
      invoices: { type: String, enum: ['none', 'read', 'write'], default: 'none' },
      credentials: { type: String, enum: ['none', 'read', 'write'], default: 'none' },
      pending_tasks: { type: String, enum: ['none', 'read', 'write'], default: 'none' },
      announcements: { type: String, enum: ['none', 'read', 'write'], default: 'none' },
      branding: { type: String, enum: ['none', 'read', 'write'], default: 'none' },
      reminders: { type: String, enum: ['none', 'read', 'write'], default: 'none' },
      google_meet: { type: String, enum: ['none', 'read', 'write'], default: 'none' },

      // Inside Project Tabs
      project_details: { type: String, enum: ['none', 'read', 'write'], default: 'none' },
      project_credential: { type: String, enum: ['none', 'read', 'write'], default: 'none' },
      project_links: { type: String, enum: ['none', 'read', 'write'], default: 'none' },
      project_pricing: { type: String, enum: ['none', 'read', 'write'], default: 'none' },
      project_invoice: { type: String, enum: ['none', 'read', 'write'], default: 'none' },
      project_status: { type: String, enum: ['none', 'read', 'write'], default: 'none' },
      project_tasks: { type: String, enum: ['none', 'read', 'write'], default: 'none' },
      project_calendar: { type: String, enum: ['none', 'read', 'write'], default: 'none' },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Role || mongoose.model('Role', RoleSchema);

