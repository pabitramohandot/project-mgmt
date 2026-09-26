import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a lead title or deal name'],
      trim: true,
    },
    contactName: {
      type: String,
      required: [true, 'Please provide contact person name'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    value: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    stage: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
      default: 'new',
      index: true,
    },
    source: {
      type: String,
      enum: ['Website', 'Referral', 'LinkedIn', 'WhatsApp', 'Cold Call', 'Event', 'Email Campaign', 'Other'],
      default: 'Website',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Active', 'Converted', 'Disqualified', 'Archived'],
      default: 'Active',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
    winProbability: {
      type: Number,
      min: 0,
      max: 100,
      default: 20,
    },
    expectedCloseDate: {
      type: Date,
    },
    lastContactedAt: {
      type: Date,
    },
    convertedToClientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
    },
    convertedToProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

LeadSchema.index({ companyId: 1, createdAt: -1 });
LeadSchema.index({ companyId: 1, stage: 1 });
LeadSchema.index({ companyId: 1, assignedTo: 1 });

export default mongoose.models.Lead || mongoose.model('Lead', LeadSchema);

