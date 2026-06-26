const mongoose = require('mongoose');
const fs = require('fs');

let uri = 'mongodb://localhost:27017/ionet';
try {
    const envStr = fs.readFileSync('.env.local', 'utf8');
    const match = envStr.match(/MONGODB_URI=(.*)/);
    if (match) uri = match[1].trim();
} catch(e) {}

const RoleSchema = new mongoose.Schema({
    name: String,
    isSystem: Boolean,
    category: String,
}, { strict: false });

const Role = mongoose.models.Role || mongoose.model('Role', RoleSchema);

async function run() {
    await mongoose.connect(uri);
    const allRoles = await Role.find({});
    console.log("ALL ROLES:", JSON.stringify(allRoles, null, 2));
    process.exit(0);
}
run();
