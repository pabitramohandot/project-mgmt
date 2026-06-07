const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://admin:JC0v5e0s5gXxDEVr@cluster0.ehon8wm.mongodb.net/project_manager?retryWrites=true&w=majority&appName=Cluster0";

const ClientSchema = new mongoose.Schema({
  name: String,
  email: String,
  company: String,
  phone: String,
});

const Client = mongoose.models.Client || mongoose.model('Client', ClientSchema);

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const targetEmail = "creative.souravdesigns@gmail.com";
  console.log(`Checking for email: ${targetEmail}`);

  const matchExact = await Client.findOne({ email: targetEmail.toLowerCase().trim() });
  console.log("Exact match result:", matchExact);

  const allClients = await Client.find().select('name email');
  console.log("\nAll clients currently in database:");
  allClients.forEach(c => {
    console.log(`- ${c.name}: ${c.email}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
