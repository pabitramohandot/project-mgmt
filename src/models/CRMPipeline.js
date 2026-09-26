import mongoose from 'mongoose';

const CRMPipelineSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      unique: true,
    },
    stages: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        color: { type: String, default: '#6366f1' },
        order: { type: Number, default: 0 },
        probability: { type: Number, default: 20 },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.CRMPipeline || mongoose.model('CRMPipeline', CRMPipelineSchema);

