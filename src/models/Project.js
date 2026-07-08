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
  status: {
    type: String,
    enum: ['Todo', 'In Progress', 'Completed'],
    default: 'Todo',
  },
  assignedTo: {
    type: String,
    default: '',
  },
  dueDate: {
    type: Date,
    default: null,
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  notes: {
    type: String,
    default: '',
  },
  assignedBy: {
    type: String,
    default: '',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
});

const CredentialSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Hosting', 'Domain', 'Development', 'SEO', 'SMO', 'Design', 'Other'],
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
    default: '',
  },
});

const LinkSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  url: {
    type: String,
    required: true,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
});


const ContentCalendarSchema = new mongoose.Schema({
  month: {
    type: String,
    required: true,
  },
  scheduledDate: {
    type: Date,
    required: true,
  },
  postType: {
    type: String,
    enum: ['Static', 'Motion', 'Reel', 'Carousel', 'Motion Graphic Wish Post', 'Wish post'],
    default: 'Static',
  },
  topic: {
    type: String,
    trim: true,
  },
  content: {
    type: String,
    trim: true,
  },
  hashtags: {
    type: String,
    trim: true,
  },
  visual: {
    type: String,
    trim: true,
  },
  platforms: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ['Pending', 'Design Done', 'Design Approved', 'Posted', 'Draft', 'Approved'],
    default: 'Pending',
  },
  assignedTo: {
    type: String,
    default: '',
  },
  // Legacy fields for backward compatibility
  ideation: {
    type: String,
    trim: true,
  },
  caption: {
    type: String,
    trim: true,
  },
  description: {
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
    siteUrl: {
      type: String,
      trim: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    status: {
      type: String,
      enum: ['Planning', 'In Progress', 'Under Review', 'Completed', 'Pending'],
      default: 'Planning',
    },
    devStatus: {
      type: String,
      enum: ['Planning', 'In Progress', 'Under Review', 'Completed', 'Pending'],
      default: 'Planning',
    },
    marketingStatus: {
      type: String,
      enum: ['Planning', 'In Progress', 'Under Review', 'Completed', 'Pending'],
      default: 'Planning',
    },
    adsStatus: {
      type: String,
      enum: ['Planning', 'In Progress', 'Under Review', 'Completed', 'Pending'],
      default: 'Planning',
    },
    designStatus: {
      type: String,
      enum: ['Planning', 'In Progress', 'Under Review', 'Completed', 'Pending'],
      default: 'Planning',
    },
    projectType: {
      type: [String],
      default: [],
    },
    subcategories: {
      type: [String],
      default: [],
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
    devPrice: {
      type: Number,
      default: null,
    },
    marketingPrice: {
      type: Number,
      default: null,
    },
    adsPrice: {
      type: Number,
      default: null,
    },
    designPrice: {
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
    devStartDate: {
      type: Date,
    },
    devEndDate: {
      type: Date,
    },
    marketingStartDate: {
      type: Date,
    },
    marketingEndDate: {
      type: Date,
    },
    adsDate: {
      type: Date,
    },
    designStartDate: {
      type: Date,
    },
    designEndDate: {
      type: Date,
    },
    tasks: [TaskSchema],
    hostingExpiry: {
      type: Date,
    },
    domainExpiry: {
      type: Date,
    },
    hostingDiscontinued: {
      type: Boolean,
      default: false,
    },
    domainDiscontinued: {
      type: Boolean,
      default: false,
    },
    credentials: [CredentialSchema],
    links: [LinkSchema],
    contentCalendar: [ContentCalendarSchema],
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
    assignedEmployees: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
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
