import mongoose from 'mongoose';

const CredentialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title or service name'],
      trim: true,
    },
    username: {
      type: String,
      trim: true,
      default: '',
    },
    password: {
      type: String,
      trim: true,
      default: '',
    },
    url: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

CredentialSchema.index({ companyId: 1, createdAt: -1 });

export default mongoose.models.Credential || mongoose.model('Credential', CredentialSchema);

