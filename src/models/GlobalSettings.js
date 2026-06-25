import mongoose from 'mongoose';

/**
 * Singleton document (key = "platform") that holds the platform-wide AI config.
 * Only the superadmin can read or write this document.
 */
const GlobalSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'platform',
      unique: true,
    },
    // Which provider is currently active for all companies
    activeProvider: {
      type: String,
      enum: ['gemini', 'openai', 'claude', 'nvidia', 'grok'],
      default: 'gemini',
    },
    // API keys for each provider (stored server-side only)
    aiKeys: {
      gemini: { type: String, trim: true, default: '' },
      openai: { type: String, trim: true, default: '' },
      claude: { type: String, trim: true, default: '' },
      nvidia: { type: String, trim: true, default: '' },
      grok: { type: String, trim: true, default: '' },
    },
    // Code to access uploading platform
    uploadCode: {
      type: String,
      default: 'ABC012',
      trim: true,
    },
  },
  { timestamps: true }
);

if (mongoose.models.GlobalSettings) {
  delete mongoose.models.GlobalSettings;
}

export default mongoose.model('GlobalSettings', GlobalSettingsSchema);
