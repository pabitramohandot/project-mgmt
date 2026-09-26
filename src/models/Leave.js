import mongoose from 'mongoose';

const LeaveSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    leaveType: {
      type: String,
      enum: ['Casual Leave', 'Sick Leave', 'Annual Leave', 'Maternity Leave', 'Unpaid Leave'],
      default: 'Casual Leave',
    },
    startDate: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    endDate: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    adminNote: {
      type: String,
      default: '',
    },
    appliedBy: {
      type: String, // Username
    },
  },
  { timestamps: true }
);

LeaveSchema.index({ companyId: 1, createdAt: -1 });
LeaveSchema.index({ userId: 1 });

export default mongoose.models.Leave || mongoose.model('Leave', LeaveSchema);

