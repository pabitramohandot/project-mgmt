const mongoose = require('mongoose');

const uri = 'mongodb+srv://admin:JC0v5e0s5gXxDEVr@cluster0.ehon8wm.mongodb.net/project_manager?retryWrites=true&w=majority&appName=Cluster0';

async function check() {
  await mongoose.connect(uri);
  const users = await mongoose.connection.db.collection('users').find().toArray();
  const companies = await mongoose.connection.db.collection('companies').find().toArray();
  
  console.log('--- USERS ---');
  users.forEach(u => {
    console.log(`User: ${u.username}, Role: ${u.role}, CompanyId: ${u.companyId}, isOnline: ${u.isOnline}, lastActive: ${u.lastActive}`);
  });
  
  console.log('--- COMPANIES ---');
  companies.forEach(c => {
    console.log(`Company: ${c.name}, Id: ${c._id}`);
  });
  
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
