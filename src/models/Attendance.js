import mongoose from 'mongoose';

const BreakSchema = new mongoose.Schema({
  start: {
    type: Date,
    required: true,
  },
  end: {
    type: Date,
  },
  reason: {
    type: String,
    default: 'Lunch/Short Break',
  },
});

const AttendanceSchema = new mongoose.Schema(
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
    date: {
      type: String, // format: YYYY-MM-DD
      required: true,
    },
    clockIn: {
      type: Date,
      required: true,
    },
    clockOut: {
      type: Date,
      default: null,
    },
    breaks: [BreakSchema],
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Half-day', 'On Leave'],
      default: 'Present',
    },
    notes: {
      type: String,
      default: '',
    },
    totalWorkMinutes: {
      type: Number,
      default: 0,
    },
    totalBreakMinutes: {
      type: Number,
      default: 0,
    },
    location: {
      latitude: Number,
      longitude: Number,
      ip: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for querying user's attendance for a specific day
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

AttendanceSchema.index({ companyId: 1, date: -1 });
AttendanceSchema.index({ companyId: 1, clockIn: -1 });

export default mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);

