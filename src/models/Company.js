import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a company name'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Please provide a company slug'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    logo: {
      type: String,
      trim: true,
      default: '',
    },
    brandColors: {
      primary: {
        type: String,
        default: '#00aeef',
      },
      secondary: {
        type: String,
        default: '#f26522',
      },
    },
    tagline: {
      type: String,
      trim: true,
      default: 'Development & Consulting Services',
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    emailSettings: {
      user: {
        type: String,
        trim: true,
        lowercase: true,
        default: '',
      },
      pass: {
        type: String,
        trim: true,
        default: '',
      },
      host: {
        type: String,
        trim: true,
        default: '',
      },
      port: {
        type: Number,
        default: 465,
      },
      secure: {
        type: Boolean,
        default: true,
      },
      providerType: {
        type: String,
        enum: ['gmail', 'custom'],
        default: 'gmail',
      },
    },
    aiKeys: {
      gemini: { type: String, trim: true, default: '' },
      openai: { type: String, trim: true, default: '' },
      claude: { type: String, trim: true, default: '' },
      nvidia: { type: String, trim: true, default: '' },
      grok: { type: String, trim: true, default: '' },
    },
    bankDetails: {
      type: String,
      trim: true,
      default: '',
    },
    bankQrCode: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    projectLimit: {
      type: Number,
      default: 0, // 0 = unlimited
    },
    clientLimit: {
      type: Number,
      default: 0, // 0 = unlimited
    },
    employeeLimit: {
      type: Number,
      default: 0, // 0 = unlimited
    },
    timetable: {
      clockInTime: {
        type: String,
        default: '09:00',
        trim: true,
      },
      clockOutTime: {
        type: String,
        default: '18:00',
        trim: true,
      },
      halfDayThresholdHours: {
        type: Number,
        default: 4,
      },
      halfDayClockOutTime: {
        type: String,
        default: '14:00',
        trim: true,
      },
      breaks: [
        {
          name: { type: String, default: 'Lunch Break', trim: true },
          startTime: { type: String, default: '13:00', trim: true },
          endTime: { type: String, default: '14:00', trim: true },
        },
      ],
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);

