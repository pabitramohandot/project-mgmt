import mongoose from 'mongoose';

const TaskItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, default: 'Pre-boarding' },
  completed: { type: Boolean, default: false },
  completedAt: Date,
});

const OnboardingSchema = new mongoose.Schema(
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
    jobTitle: { type: String, default: 'Software Engineer' },
    department: { type: String, default: 'Engineering' },
    startDate: { type: String, required: true }, // YYYY-MM-DD
    mentor: { type: String, default: 'HR Team' },
    status: { type: String, enum: ['In Progress', 'Completed'], default: 'In Progress' },
    progress: { type: Number, default: 0 }, // percentage 0 - 100
    tasks: [TaskItemSchema],
  },
  { timestamps: true }
);

OnboardingSchema.index({ companyId: 1, userId: 1 });

export default mongoose.models.Onboarding || mongoose.model('Onboarding', OnboardingSchema);

