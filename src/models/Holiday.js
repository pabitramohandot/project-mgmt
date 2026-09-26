import mongoose from 'mongoose';

const HolidaySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    type: {
      type: String,
      enum: ['Mandatory', 'Optional'],
      default: 'Mandatory',
    },
    description: String,
  },
  { timestamps: true }
);

HolidaySchema.index({ companyId: 1, date: 1 });

export default mongoose.models.Holiday || mongoose.model('Holiday', HolidaySchema);

