import mongoose from 'mongoose';

const ClientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a client name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide a client email'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    whatsapp: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

ClientSchema.index({ companyId: 1, createdAt: -1 });
ClientSchema.index({ companyId: 1, email: 1 });
ClientSchema.index({ companyId: 1, status: 1 });

export default mongoose.models.Client || mongoose.model('Client', ClientSchema);

