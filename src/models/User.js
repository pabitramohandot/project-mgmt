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
    customRole: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      default: null,
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
    googleAccessToken: {
      type: String,
      default: null,
    },
    googleRefreshToken: {
      type: String,
      default: null,
    },
    googleTokenExpiry: {
      type: Date,
      default: null,
    },
    googleCalendarEmail: {
      type: String,
      default: null,
    },
    needsPasswordChange: {
      type: Boolean,
      default: false,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastActive: {
      type: Date,
      default: null,
    },
    employeeNo: { type: String, default: '' },
    designation: { type: String, default: '' },
    department: { type: String, default: '' },
    location: { type: String, default: '' },
    bankName: { type: String, default: '' },
    bankAccountNo: { type: String, default: '' },
    panNumber: { type: String, default: '' },
    pfUan: { type: String, default: '' },
    joiningDate: { type: String, default: '' },
    salary: {
      basicSalary: { type: Number, default: 0 },
      allowances: { type: Number, default: 0 },
      deductions: { type: Number, default: 0 },
      netSalary: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' },
      customEarnings: [
        {
          label: { type: String, default: '' },
          amount: { type: Number, default: 0 },
        },
      ],
      customDeductions: [
        {
          label: { type: String, default: '' },
          amount: { type: Number, default: 0 },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ companyId: 1, role: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ companyId: 1, username: 1 });

export default mongoose.models.User || mongoose.model('User', UserSchema);

