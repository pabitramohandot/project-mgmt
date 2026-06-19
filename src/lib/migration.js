import Client from '@/models/Client';
import Project from '@/models/Project';
import Invoice from '@/models/Invoice';
import Credential from '@/models/Credential';
import Company from '@/models/Company';
import User from '@/models/User';

export async function runClientMigration() {
  try {
    // Check if we have clients already
    const clientCount = await Client.countDocuments();
    if (clientCount > 0) {
      return; // Already migrated or clients exist
    }

    console.log("Starting Client Migration...");
    
    // Find all projects
    const projects = await Project.find();
    if (projects.length === 0) {
      console.log("No projects found to migrate.");
      return;
    }

    // Map unique clients by name + email combination
    const uniqueClientsMap = new Map();
    for (const project of projects) {
      if (project.clientName) {
        const emailKey = (project.clientEmail || '').trim().toLowerCase();
        const key = `${project.clientName.trim().toLowerCase()}_${emailKey}`;
        if (!uniqueClientsMap.has(key)) {
          uniqueClientsMap.set(key, {
            name: project.clientName.trim(),
            email: emailKey || `${project.clientName.toLowerCase().replace(/\s+/g, '')}@example.com`,
            projects: []
          });
        }
        uniqueClientsMap.get(key).projects.push(project);
      }
    }

    console.log(`Found ${uniqueClientsMap.size} unique clients to create.`);

    for (const [key, clientData] of uniqueClientsMap.entries()) {
      let client = await Client.findOne({ email: clientData.email });
      if (!client) {
        client = await Client.create({
          name: clientData.name,
          email: clientData.email,
        });
        console.log(`Created Client Profile: ${client.name} (${client.email})`);
      }

      // Link projects to this client
      for (const project of clientData.projects) {
        project.client = client._id;
        await project.save();
        console.log(`Linked Project "${project.name}" to Client "${client.name}"`);
      }

      // Link invoices of these projects to this client
      for (const project of clientData.projects) {
        const invoices = await Invoice.find({ project: project._id });
        for (const invoice of invoices) {
          invoice.client = client._id;
          await invoice.save();
          console.log(`Linked Invoice "${invoice.invoiceNumber}" to Client "${client.name}"`);
        }
      }
    }

    console.log("Client Migration completed successfully!");
  } catch (error) {
    console.error("Error running client migration:", error);
  }
}

export async function runMultiTenancyMigration() {
  try {
    console.log("Starting Multi-Tenancy Migration...");

    // 1. Seed Company
    let company = await Company.findOne({ slug: 'ionetweb' });
    if (!company) {
      company = await Company.create({
        name: 'IONETWEB',
        slug: 'ionetweb',
        logo: '',
        tagline: 'Development & Consulting Services',
        brandColors: {
          primary: '#00aeef',
          secondary: '#f26522',
        },
        contactEmail: 'admin@ionetweb.com',
        isActive: true
      });
      console.log('Seeded IONETWEB company document');
    }

    // 2. Seed Super Admin User
    let adminUser = await User.findOne({ role: 'superadmin' });
    if (!adminUser) {
      const { hashPassword } = await import('./auth');
      const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
      const expectedPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const hashedPassword = await hashPassword(expectedPassword);

      adminUser = await User.create({
        username: expectedUsername.trim().toLowerCase(),
        password: hashedPassword,
        role: 'superadmin',
        companyId: company._id
      });
      console.log('Seeded Super Admin user in DB:', adminUser.username);
    }

    // 3. Backfill companyId to existing documents
    const projectRes = await Project.updateMany({ companyId: { $exists: false } }, { $set: { companyId: company._id } });
    console.log(`Backfilled companyId for ${projectRes.modifiedCount || 0} projects`);

    const clientRes = await Client.updateMany({ companyId: { $exists: false } }, { $set: { companyId: company._id } });
    console.log(`Backfilled companyId for ${clientRes.modifiedCount || 0} clients`);

    const invoiceRes = await Invoice.updateMany({ companyId: { $exists: false } }, { $set: { companyId: company._id } });
    console.log(`Backfilled companyId for ${invoiceRes.modifiedCount || 0} invoices`);

    const credentialRes = await Credential.updateMany({ companyId: { $exists: false } }, { $set: { companyId: company._id } });
    console.log(`Backfilled companyId for ${credentialRes.modifiedCount || 0} credentials`);

    console.log("Multi-Tenancy Migration completed successfully!");
  } catch (error) {
    console.error("Error running multi-tenancy migration:", error);
  }
}
