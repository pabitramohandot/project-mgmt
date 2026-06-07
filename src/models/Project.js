import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
});

const CredentialSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Hosting', 'Domain', 'Other'],
    default: 'Other',
  },
  label: {
    type: String,
    trim: true,
  },
  username: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    trim: true,
  },
  loginUrl: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
});

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a project name'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    clientName: {
      type: String,
      required: [true, 'Please provide a client name'],
      trim: true,
    },
    clientEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
    },
    status: {
      type: String,
      enum: ['Planning', 'In Progress', 'Under Review', 'Completed', 'Pending'],
      default: 'Planning',
    },
    quotePrice: {
      type: Number,
      default: null,
    },
    finalPrice: {
      type: Number,
      default: null,
    },
    hostingPrice: {
      type: Number,
      default: null,
    },
    domainPrice: {
      type: Number,
      default: null,
    },
    budget: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    tasks: [TaskSchema],
    hostingExpiry: {
      type: Date,
    },
    domainExpiry: {
      type: Date,
    },
    credentials: [CredentialSchema],
    statusUpdates: [
      new mongoose.Schema({
        message: {
          type: String,
          required: true,
          trim: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      })
    ],
    quotation: {
      fileName: {
        type: String,
      },
      filePath: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.Project) {
  delete mongoose.models.Project;
}
export default mongoose.model('Project', ProjectSchema);
