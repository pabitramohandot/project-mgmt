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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.Company) {
  delete mongoose.models.Company;
}

export default mongoose.model('Company', CompanySchema);
