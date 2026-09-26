import mongoose from 'mongoose';

const LeadActivitySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['Call', 'Email', 'Meeting', 'Note', 'Status Change', 'Task'],
      default: 'Note',
    },
    title: {
      type: String,
      required: [true, 'Activity title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    scheduledAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    isDone: {
      type: Boolean,
      default: false,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

LeadActivitySchema.index({ leadId: 1, createdAt: -1 });

export default mongoose.models.LeadActivity || mongoose.model('LeadActivity', LeadActivitySchema);

