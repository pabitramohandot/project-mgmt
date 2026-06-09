import mongoose from 'mongoose';

const FeedbackSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['bug', 'feature'],
      required: true,
    },
    page: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
      trim: true,
    },
    screenshot: {
      type: String,
      default: '',
    },
    referenceUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'resolved', 'rejected'],
      default: 'pending',
    },
    adminNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.Feedback) {
  delete mongoose.models.Feedback;
}

export default mongoose.model('Feedback', FeedbackSchema);
