const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://admin:JC0v5e0s5gXxDEVr@cluster0.ehon8wm.mongodb.net/project_manager?retryWrites=true&w=majority&appName=Cluster0";

async function check() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB Atlas');
  
  const ProjectSchema = new mongoose.Schema({
    name: String,
    client: mongoose.Schema.Types.ObjectId,
    clientName: String,
    clientEmail: String
  }, { collection: 'projects' });

  const Project = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
  
  const projects = await Project.find({});
  console.log('Projects count:', projects.length);
  for (const p of projects) {
    console.log(`- PROJECT: id=${p._id}, name=${p.name}, clientRef=${p.client}, clientName=${p.clientName}, clientEmail=${p.clientEmail}`);
  }
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
