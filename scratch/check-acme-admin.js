const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://admin:JC0v5e0s5gXxDEVr@cluster0.ehon8wm.mongodb.net/project_manager?retryWrites=true&w=majority&appName=Cluster0";

// Define Schemas manually
const companySchema = new mongoose.Schema({
  name: String,
  slug: String,
  isActive: Boolean
});

const userSchema = new mongoose.Schema({
  username: String,
  role: String,
  companyId: mongoose.Schema.Types.ObjectId
});

const Company = mongoose.models.Company || mongoose.model('Company', companySchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected");

  const companies = await Company.find();
  console.log("Companies in DB:", companies.map(c => ({ _id: c._id, name: c.name, slug: c.slug })));

  const users = await User.find();
  console.log("Users in DB:", users.map(u => ({ _id: u._id, username: u.username, role: u.role, companyId: u.companyId })));

  await mongoose.disconnect();
}

run();
