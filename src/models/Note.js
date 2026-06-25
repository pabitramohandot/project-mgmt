import mongoose from 'mongoose';

const NoteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: false,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    content: {
      type: String,
      required: true,
      default: '',
    },
    color: {
      type: String,
      default: '#ffffff', // Default white background
    },
    sharedWith: {
      type: [String], // Array of roles (e.g. 'company_admin', 'Employee') or User IDs
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.Note) {
  delete mongoose.models.Note;
}
export default mongoose.model('Note', NoteSchema);
