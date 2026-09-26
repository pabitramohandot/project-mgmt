import mongoose from 'mongoose';

const PayrollSchema = new mongoose.Schema(
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
    month: {
      type: String, // format e.g. "2026-07"
      required: true,
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
    effectiveWorkDays: { type: Number, default: 30 },
    lopDays: { type: Number, default: 0 },
    basicSalary: {
      type: Number,
      default: 0,
    },
    allowances: {
      type: Number,
      default: 0,
    },
    deductions: {
      type: Number,
      default: 0,
    },
    netSalary: {
      type: Number,
      default: 0,
    },
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
    status: {
      type: String,
      enum: ['Paid', 'Pending', 'Processing'],
      default: 'Pending',
    },
    paymentDate: Date,
    notes: String,
  },
  { timestamps: true }
);

PayrollSchema.index({ companyId: 1, month: -1 });
PayrollSchema.index({ userId: 1, month: -1 });

export default mongoose.models.Payroll || mongoose.model('Payroll', PayrollSchema);

