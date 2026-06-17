const mongoose = require('mongoose');
const MONGODB_URI = "mongodb+srv://admin:JC0v5e0s5gXxDEVr@cluster0.ehon8wm.mongodb.net/project_manager?retryWrites=true&w=majority&appName=Cluster0";

const TaskSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  completed: { type: Boolean, default: false }
});

const CredentialSchema = new mongoose.Schema({
  type: { type: String, enum: ['Hosting', 'Domain', 'Other'], default: 'Other' },
  label: { type: String, trim: true },
  username: { type: String, trim: true },
  password: { type: String, trim: true },
  loginUrl: { type: String, trim: true },
  notes: { type: String, trim: true }
});

const ContentCalendarSchema = new mongoose.Schema({
  month: { type: String, required: true },
  scheduledDate: { type: Date, required: true },
  postType: { type: String, enum: ['Static', 'Motion', 'Reel', 'Carousel', 'Motion Graphic Wish Post', 'Wish post'], default: 'Static' },
  topic: { type: String, trim: true },
  content: { type: String, trim: true },
  hashtags: { type: String, trim: true },
  visual: { type: String, trim: true },
  platforms: { type: [String], default: [] },
  status: { type: String, enum: ['Pending', 'Design Done', 'Design Approved', 'Posted', 'Draft', 'Approved'], default: 'Pending' },
  ideation: { type: String, trim: true },
  caption: { type: String, trim: true },
  description: { type: String, trim: true }
});

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Please provide a project name'], trim: true },
  description: { type: String, trim: true },
  clientName: { type: String, required: [true, 'Please provide a client name'], trim: true },
  clientEmail: { type: String, trim: true, lowercase: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  status: { type: String, enum: ['Planning', 'In Progress', 'Under Review', 'Completed', 'Pending'], default: 'Planning' },
  projectType: { type: [String], default: [] },
  subcategories: { type: [String], default: [] },
  quotePrice: { type: Number, default: null },
  finalPrice: { type: Number, default: null },
  hostingPrice: { type: Number, default: null },
  domainPrice: { type: Number, default: null },
  budget: { type: Number, default: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
  tasks: [TaskSchema],
  hostingExpiry: { type: Date },
  domainExpiry: { type: Date },
  credentials: [CredentialSchema],
  contentCalendar: [ContentCalendarSchema],
  statusUpdates: [
    new mongoose.Schema({
      message: { type: String, required: true, trim: true },
      date: { type: Date, default: Date.now }
    })
  ],
  quotation: {
    fileName: { type: String },
    filePath: { type: String }
  }
}, { collection: 'projects', timestamps: true });

async function run() {
  await mongoose.connect(MONGODB_URI);
  const Project = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
  const projects = await Project.find({});
  console.log('Verifying validation for all projects:');
  for (const p of projects) {
    const err = p.validateSync();
    if (err) {
      console.log(`❌ Project ID ${p._id} ("${p.name}") has validation errors:`, err.message);
    } else {
      console.log(`✅ Project ID ${p._id} ("${p.name}") is VALID`);
    }
  }
  process.exit(0);
}

run().catch(console.error);
