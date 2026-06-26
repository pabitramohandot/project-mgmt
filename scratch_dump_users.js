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
    permissions: Object
}, { strict: false });

const Role = mongoose.models.Role || mongoose.model('Role', RoleSchema);

async function run() {
    await mongoose.connect(uri);
    const result = await Role.updateOne(
        { name: 'Designer' },
        {
            $set: {
                permissions: {
                    ai_agent: 'read',
                    clients: 'none',
                    invoices: 'none',
                    credentials: 'read',
                    pending_tasks: 'read',
                    announcements: 'read',
                    branding: 'none',
                    project_details: 'read',
                    project_credential: 'read',
                    project_links: 'read',
                    project_pricing: 'none',
                    project_invoice: 'none',
                    project_status: 'read',
                    project_tasks: 'write',
                    project_calendar: 'write'
                }
            }
        }
    );
    console.log("UPDATE RESULT:", result);
    process.exit(0);
}
run();
