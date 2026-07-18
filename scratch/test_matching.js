const mongoose = require('mongoose');

const uri = 'mongodb+srv://admin:JC0v5e0s5gXxDEVr@cluster0.ehon8wm.mongodb.net/project_manager?retryWrites=true&w=majority&appName=Cluster0';

async function test() {
  await mongoose.connect(uri);
  
  const CompanySchema = new mongoose.Schema({}, { strict: false });
  const Company = mongoose.models.Company || mongoose.model('Company', CompanySchema);
  
  const UserSchema = new mongoose.Schema({}, { strict: false });
  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  const companies = await Company.find().sort({ createdAt: -1 }).lean();
  const allUsers = await User.find().select("username companyId isOnline lastActive").lean();

  companies.forEach(comp => {
    const companyUsers = allUsers.filter(
      (u) => u.companyId && u.companyId.toString() === comp._id.toString()
    );
    const isLive = companyUsers.some(
      (u) => u.isOnline && u.lastActive && (Date.now() - new Date(u.lastActive).getTime() < 5 * 60 * 1000)
    );

    console.log(`Company: ${comp.name} (${comp._id})`);
    console.log(`- Users count: ${companyUsers.length}`);
    console.log(`- isLive: ${isLive}`);
    companyUsers.forEach(u => {
      console.log(`  * User: ${u.username}, isOnline: ${u.isOnline}, lastActive: ${u.lastActive}, Diff (min): ${u.lastActive ? (Date.now() - new Date(u.lastActive).getTime()) / 60000 : 'N/A'}`);
    });
  });

  process.exit(0);
}

test().catch(console.error);
