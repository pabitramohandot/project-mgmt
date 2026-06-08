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
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Credential || mongoose.model('Credential', CredentialSchema);
