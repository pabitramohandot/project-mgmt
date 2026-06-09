const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://admin:JC0v5e0s5gXxDEVr@cluster0.ehon8wm.mongodb.net/project_manager?retryWrites=true&w=majority&appName=Cluster0";

// Define Schemas manually
const clientSchema = new mongoose.Schema({
  name: String,
  email: String,
  companyId: mongoose.Schema.Types.ObjectId,
  createdAt: Date
});

const Client = mongoose.models.Client || mongoose.model('Client', clientSchema);

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected");

  const clients = await Client.find().sort({ createdAt: -1 }).limit(5).lean();
  console.log("Latest 5 Clients:", clients);

  await mongoose.disconnect();
}

run();
