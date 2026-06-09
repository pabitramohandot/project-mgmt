import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Please provide a username'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
    role: {
      type: String,
      enum: ['superadmin', 'company_admin', 'company_user'],
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    whatsapp: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.User) {
  delete mongoose.models.User;
}

export default mongoose.model('User', UserSchema);
