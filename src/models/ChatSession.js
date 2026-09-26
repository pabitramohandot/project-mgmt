import mongoose from 'mongoose';

const ChatMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const ChatSessionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      default: 'New Chat Session',
      trim: true,
    },
    messages: [ChatMessageSchema],
  },
  {
    timestamps: true,
  }
);

ChatSessionSchema.index({ companyId: 1, userId: 1, updatedAt: -1 });

export default mongoose.models.ChatSession || mongoose.model('ChatSession', ChatSessionSchema);

