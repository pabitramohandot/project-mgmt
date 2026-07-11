import mongoose from 'mongoose';

const RegisterRequestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    employees: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'contacted', 'approved', 'rejected'],
      default: 'pending',
    }
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.RegisterRequest) {
  delete mongoose.models.RegisterRequest;
}

export default mongoose.model('RegisterRequest', RegisterRequestSchema);
