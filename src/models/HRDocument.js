import mongoose from 'mongoose';

const HRDocumentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // null if company-wide policy doc
      default: null,
    },
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['Offer Letter', 'Contract', 'Tax Form', 'Company Policy', 'ID Proof', 'Other'],
      default: 'Company Policy',
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      default: 'PDF',
    },
    notes: String,
  },
  { timestamps: true }
);

HRDocumentSchema.index({ companyId: 1, userId: 1 });

export default mongoose.models.HRDocument || mongoose.model('HRDocument', HRDocumentSchema);

