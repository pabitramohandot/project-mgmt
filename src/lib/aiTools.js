import dbConnect from './db';
import Project from '../models/Project';
import Invoice from '../models/Invoice';
import Client from '../models/Client';
import { sendInvoiceEmail } from './email';

/**
 * Retrieve status report of a project for the last X days.
 */
export async function getProjectStatusReport(projectName, daysCount = 30, companyId) {
  await dbConnect();

  if (!projectName) {
    return { error: 'Project name is required' };
  }

  // Find project under the current tenant company (fuzzy support)
  const project = await findProjectFuzzy(projectName, companyId);

  if (!project) {
    return { error: `No project found matching the name "${projectName}".` };
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - Number(daysCount));

  // Filter tasks completed and status updates within the timeframe
  const totalTasks = project.tasks?.length || 0;
  const completedTasks = project.tasks?.filter(t => t.completed) || [];
  const completedTasksCount = completedTasks.length;

  const recentUpdates = project.statusUpdates?.filter(update => new Date(update.date) >= cutoffDate) || [];

  return {
    projectName: project.name,
    clientName: project.clientName,
    status: project.status,
    budget: project.budget,
    startDate: project.startDate,
    endDate: project.endDate,
    hostingExpiry: project.hostingExpiry,
    domainExpiry: project.domainExpiry,
    totalTasks,
    completedTasksCount,
    recentUpdates: recentUpdates.map(u => ({
      message: u.message,
      date: new Date(u.date).toLocaleDateString('en-IN')
    }))
  };
}

/**
 * Query an invoice and email it to the client.
 */
export async function sendInvoiceToClient(clientNameOrEmail, invoiceNumber, companyId) {
  await dbConnect();

  let query = { companyId };

  if (invoiceNumber) {
    query.invoiceNumber = new RegExp(invoiceNumber, 'i');
  } else if (clientNameOrEmail) {
    query.$or = [
      { clientName: new RegExp(clientNameOrEmail, 'i') },
      { clientEmail: new RegExp(clientNameOrEmail, 'i') }
    ];
  } else {
    return { error: 'Please specify either a client name/email or an invoice number.' };
  }

  // Find invoice and populate project (fuzzy support)
  let invoice = await Invoice.findOne(query).sort({ createdAt: -1 }).populate('project');

  if (!invoice && clientNameOrEmail) {
    const client = await findClientFuzzy(clientNameOrEmail, companyId);
    if (client) {
      invoice = await Invoice.findOne({
        companyId,
        $or: [
          { clientName: client.name },
          { clientEmail: client.email }
        ]
      }).sort({ createdAt: -1 }).populate('project');
    }
  }

  if (!invoice) {
    return { error: 'No matching invoice was found in your workspace.' };
  }

  const clientEmail = invoice.clientEmail;
  if (!clientEmail) {
    return { error: `Invoice found (${invoice.invoiceNumber}), but client email address is missing. Please add an email address first.` };
  }

  try {
    const emailResult = await sendInvoiceEmail(invoice, invoice.project);
    if (emailResult.skipped) {
      return { error: `Email send skipped: ${emailResult.reason}` };
    }
    return {
      success: true,
      message: `Successfully emailed invoice ${invoice.invoiceNumber} to ${clientEmail}.`,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      clientEmail
    };
  } catch (err) {
    console.error('AI send invoice error:', err);
    return { error: `Failed to send email: ${err.message}` };
  }
}

/**
 * Retrieve a list of all projects in the workspace.
 */
export async function listWorkspaceProjects(companyId) {
  await dbConnect();
  
  const projects = await Project.find({
    companyId
  }).select('name clientName status budget endDate').sort({ updatedAt: -1 }).lean();

  return projects.map(p => ({
    name: p.name,
    clientName: p.clientName,
    status: p.status,
    budget: p.budget,
    endDate: p.endDate ? new Date(p.endDate).toLocaleDateString('en-IN') : 'N/A'
  }));
}

/**
 * Retrieve a list of all invoices in the workspace.
 */
export async function listWorkspaceInvoices(companyId) {
  await dbConnect();

  const invoices = await Invoice.find({
    companyId
  })
    .populate('project', 'name')
    .select('invoiceNumber clientName total status dueDate project')
    .sort({ createdAt: -1 })
    .lean();

  return invoices.map(i => ({
    invoiceNumber: i.invoiceNumber,
    clientName: i.clientName,
    projectName: i.project?.name || 'N/A',
    total: i.total,
    status: i.status,
    dueDate: i.dueDate ? new Date(i.dueDate).toLocaleDateString('en-IN') : 'Upon Receipt'
  }));
}

/**
 * Retrieve a list of domains or hosting plans expiring in the next 60 days.
 */
export async function listExpiringServices(companyId) {
  await dbConnect();

  const sixtyDaysFromNow = new Date();
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

  const projects = await Project.find({
    companyId,
    status: { $ne: 'Completed' },
    $or: [
      { hostingExpiry: { $ne: null } },
      { domainExpiry: { $ne: null } }
    ]
  }).select('name hostingExpiry domainExpiry').lean();

  const expiringList = [];

  for (const p of projects) {
    const now = new Date();
    
    if (p.hostingExpiry && new Date(p.hostingExpiry) <= sixtyDaysFromNow) {
      expiringList.push({
        project: p.name,
        type: 'Hosting',
        expiryDate: new Date(p.hostingExpiry).toLocaleDateString('en-IN'),
        daysRemaining: Math.ceil((new Date(p.hostingExpiry) - now) / (1000 * 60 * 60 * 24))
      });
    }

    if (p.domainExpiry && new Date(p.domainExpiry) <= sixtyDaysFromNow) {
      expiringList.push({
        project: p.name,
        type: 'Domain',
        expiryDate: new Date(p.domainExpiry).toLocaleDateString('en-IN'),
        daysRemaining: Math.ceil((new Date(p.domainExpiry) - now) / (1000 * 60 * 60 * 24))
      });
    }
  }

  return expiringList.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Register a new client profile.
 */
export async function createNewClient(name, email, phone, company, address, companyId) {
  await dbConnect();

  if (!name || !email) {
    return { error: 'Client name and email are required.' };
  }

  const existingClient = await Client.findOne({ email: email.toLowerCase(), companyId });
  if (existingClient) {
    return { error: `A client with the email ${email} already exists in this workspace.` };
  }

  const client = await Client.create({
    name,
    email: email.toLowerCase(),
    phone: phone || '',
    company: company || '',
    address: address || '',
    companyId
  });

  return {
    success: true,
    message: `Successfully created client profile for ${client.name}.`,
    client: {
      id: client._id,
      name: client.name,
      email: client.email
    }
  };
}

/**
 * Create a new project in the workspace.
 */
export async function createNewProject(name, description, clientEmail, clientName, budget = 0, startDate, endDate, companyId) {
  await dbConnect();

  if (!name || !clientName) {
    return { error: 'Project name and client name are required.' };
  }

  // Find or create client link
  let clientObj = null;
  if (clientEmail) {
    clientObj = await Client.findOne({ email: clientEmail.toLowerCase(), companyId });
    if (!clientObj) {
      clientObj = await Client.create({
        name: clientName,
        email: clientEmail.toLowerCase(),
        companyId
      });
    }
  }

  const project = await Project.create({
    name,
    description: description || '',
    clientName,
    clientEmail: clientEmail ? clientEmail.toLowerCase() : '',
    client: clientObj ? clientObj._id : undefined,
    budget: Number(budget),
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    status: 'Planning',
    companyId
  });

  return {
    success: true,
    message: `Successfully created project "${project.name}" linked to client "${clientName}".`,
    project: {
      id: project._id,
      name: project.name,
      status: project.status
    }
  };
}

/**
 * Add a new task item to a project.
 */
export async function addProjectTask(projectName, taskName, companyId) {
  await dbConnect();

  if (!projectName || !taskName) {
    return { error: 'Project name and task name are required.' };
  }

  const project = await findProjectFuzzy(projectName, companyId);
  if (!project) {
    return { error: `Project "${projectName}" was not found.` };
  }

  project.tasks.push({ name: taskName, completed: false });
  await project.save();

  return {
    success: true,
    message: `Added task "${taskName}" to project "${project.name}".`,
    totalTasks: project.tasks.length
  };
}

/**
 * Complete a task item in a project.
 */
export async function completeProjectTask(projectName, taskName, companyId) {
  await dbConnect();

  if (!projectName || !taskName) {
    return { error: 'Project name and task name are required.' };
  }

  const project = await findProjectFuzzy(projectName, companyId);
  if (!project) {
    return { error: `Project "${projectName}" was not found.` };
  }

  const task = project.tasks.find(t => t.name.toLowerCase() === taskName.toLowerCase() || t.name.toLowerCase().includes(taskName.toLowerCase()));
  if (!task) {
    return { error: `Task "${taskName}" was not found in project "${project.name}".` };
  }

  task.completed = true;
  await project.save();

  return {
    success: true,
    message: `Marked task "${task.name}" as completed in project "${project.name}".`
  };
}

/**
 * Update project status and message timeline.
 */
export async function updateProjectStatus(projectName, newStatus, updateMessage, companyId) {
  await dbConnect();

  const validStatuses = ['Planning', 'In Progress', 'Under Review', 'Completed', 'Pending'];
  if (!validStatuses.includes(newStatus)) {
    return { error: `Invalid status "${newStatus}". Must be one of: ${validStatuses.join(', ')}` };
  }

  const project = await findProjectFuzzy(projectName, companyId);
  if (!project) {
    return { error: `Project "${projectName}" was not found.` };
  }

  project.status = newStatus;
  if (updateMessage) {
    project.statusUpdates.push({ message: updateMessage, date: new Date() });
  }

  await project.save();

  return {
    success: true,
    message: `Updated project "${project.name}" status to "${newStatus}".`,
    projectName: project.name,
    status: project.status
  };
}

/**
 * Generate a new invoice draft in the workspace.
 */
export async function createNewInvoice(projectNameOrClientName, items, taxRate = 0, discountRate = 0, dueDate, notes, companyId) {
  await dbConnect();

  if (!projectNameOrClientName || !items || !Array.isArray(items) || items.length === 0) {
    return { error: 'Project/Client name and a non-empty list of invoice items are required.' };
  }

  // Find linked Project or Client
  let projectId = undefined;
  let clientId = undefined;
  let clientName = '';
  let clientEmail = '';
  let clientCompany = '';
  let clientAddress = '';

  const project = await findProjectFuzzy(projectNameOrClientName, companyId);
  if (project) {
    projectId = project._id;
    clientName = project.clientName;
    clientEmail = project.clientEmail || '';
    clientId = project.client || undefined;
    
    if (clientId) {
      const clientObj = await Client.findOne({ _id: clientId, companyId });
      if (clientObj) {
        clientCompany = clientObj.company || '';
        clientAddress = clientObj.address || '';
      }
    }
  } else {
    // Try finding by Client Name directly (fuzzy support)
    const clientObj = await findClientFuzzy(projectNameOrClientName, companyId);
    if (clientObj) {
      clientId = clientObj._id;
      clientName = clientObj.name;
      clientEmail = clientObj.email || '';
      clientCompany = clientObj.company || '';
      clientAddress = clientObj.address || '';
    } else {
      // Fallback fallback: use input string as client name
      clientName = projectNameOrClientName;
    }
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity || 1) * Number(item.rate || 0)), 0);
  const taxAmount = subtotal * (Number(taxRate) / 100);
  const discountAmount = subtotal * (Number(discountRate) / 100);
  const total = subtotal + taxAmount - discountAmount;

  // Generate unique invoice number: INV-XXXX
  const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
  let nextNum = 1001;
  if (lastInvoice && lastInvoice.invoiceNumber) {
    const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  const invoiceNumber = `INV-${nextNum}`;

  const invoice = await Invoice.create({
    invoiceNumber,
    project: projectId,
    client: clientId,
    clientName,
    clientEmail,
    clientCompany,
    clientAddress,
    items,
    taxRate: Number(taxRate),
    discountRate: Number(discountRate),
    subtotal,
    total,
    status: 'Draft',
    dueDate: dueDate ? new Date(dueDate) : undefined,
    notes: notes || '',
    companyId
  });

  return {
    success: true,
    message: `Draft invoice ${invoice.invoiceNumber} created successfully.`,
    invoiceNumber: invoice.invoiceNumber,
    total: invoice.total
  };
}

/**
 * Update the payment status of an invoice.
 */
export async function updateInvoiceStatus(invoiceNumber, newStatus, companyId) {
  await dbConnect();

  const validStatuses = ['Draft', 'Sent', 'Paid', 'Overdue'];
  if (!validStatuses.includes(newStatus)) {
    return { error: `Invalid status "${newStatus}". Must be one of: ${validStatuses.join(', ')}` };
  }

  const invoice = await Invoice.findOne({ invoiceNumber: new RegExp(invoiceNumber, 'i'), companyId });
  if (!invoice) {
    return { error: `Invoice "${invoiceNumber}" was not found.` };
  }

  invoice.status = newStatus;
  await invoice.save();

  return {
    success: true,
    message: `Updated invoice ${invoice.invoiceNumber} status to "${newStatus}".`,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status
  };
}

/**
 * Broadcast an announcement message to client lists.
 */
export async function broadcastAnnouncement(subject, message, recipientType = 'all', companyId) {
  await dbConnect();

  if (!subject || !message) {
    return { error: 'Announcement subject and message content are required.' };
  }

  const query = { companyId };
  const targetedClients = await Client.find(query);

  if (targetedClients.length === 0) {
    return { error: 'No clients found in your workspace to broadcast this announcement to.' };
  }

  let sentCount = 0;
  for (const client of targetedClients) {
    if (client.email) {
      try {
        await sendAnnouncementEmail(client.email, client.name, subject, message, companyId);
        sentCount++;
      } catch (err) {
        console.error(`Broadcast skip for ${client.name}:`, err);
      }
    }
  }

  return {
    success: true,
    message: `Successfully broadcasted announcement "${subject}" to ${sentCount} clients out of ${targetedClients.length} total contacts.`
  };
}

/**
 * Submit user feedback directly.
 */
export async function submitUserFeedback(type, description, pageUrl = '', companyId, userId) {
  await dbConnect();

  if (!type || !description) {
    return { error: 'Feedback type and description are required.' };
  }

  const Feedback = (await import('../models/Feedback')).default;
  const feedback = await Feedback.create({
    companyId,
    userId,
    type,
    description,
    page: pageUrl,
    status: 'pending'
  });

  return {
    success: true,
    message: `Feedback submitted successfully as pending ticket (ID: ${feedback._id}).`
  };
}

/**
 * List all submitted user feedbacks.
 */
export async function listAllFeedbacks(companyId) {
  await dbConnect();

  const Feedback = (await import('../models/Feedback')).default;
  const feedbacks = await Feedback.find({ companyId }).sort({ createdAt: -1 }).lean();

  return feedbacks.map(f => ({
    id: f._id,
    type: f.type,
    description: f.description,
    status: f.status,
    pageUrl: f.page,
    submittedAt: new Date(f.createdAt).toLocaleDateString('en-IN')
  }));
}

/**
 * List all client profile contacts.
 */
export async function listAllClients(companyId) {
  await dbConnect();

  const clients = await Client.find({ companyId }).sort({ name: 1 }).lean();
  return clients.map(c => ({
    name: c.name,
    email: c.email,
    company: c.company || 'N/A',
    phone: c.phone || 'N/A'
  }));
}

/**
 * Fuzzy search for a Project by name (handles typos and substrings)
 */
async function findProjectFuzzy(projectName, companyId) {
  if (!projectName) return null;

  // 1. Direct Regex match (case-insensitive substring)
  let project = await Project.findOne({
    name: new RegExp(projectName, 'i'),
    companyId
  });

  if (!project) {
    const allProjects = await Project.find({ companyId }).select('name').lean();
    const query = projectName.toLowerCase();

    // 2. Contains matching (either query contains project name, or project name contains query)
    let match = allProjects.find(p => p.name.toLowerCase().includes(query) || query.includes(p.name.toLowerCase()));

    // 3. Levenshtein distance matching (fuzzy distance threshold <= 3)
    if (!match && allProjects.length > 0) {
      const getLevenshteinDistance = (a, b) => {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
          for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              matrix[i][j] = Math.min(
                matrix[i - 1][j - 1] + 1, // substitution
                matrix[i][j - 1] + 1,     // insertion
                matrix[i - 1][j] + 1      // deletion
              );
            }
          }
        }
        return matrix[b.length][a.length];
      };

      let bestMatch = null;
      let minDistance = 4; // Allow up to 3 edits
      for (const p of allProjects) {
        const dist = getLevenshteinDistance(query, p.name.toLowerCase());
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = p;
        }
      }
      match = bestMatch;
    }

    if (match) {
      project = await Project.findOne({ _id: match._id, companyId });
    }
  }

  return project;
}

/**
 * Fuzzy search for a Client contact by name/email (handles typos and substrings)
 */
async function findClientFuzzy(clientNameOrEmail, companyId) {
  if (!clientNameOrEmail) return null;

  // 1. Direct Regex match
  let client = await Client.findOne({
    $or: [
      { name: new RegExp(clientNameOrEmail, 'i') },
      { email: new RegExp(clientNameOrEmail, 'i') }
    ],
    companyId
  });

  if (!client) {
    const allClients = await Client.find({ companyId }).select('name email').lean();
    const query = clientNameOrEmail.toLowerCase();

    // 2. Contains matching
    let match = allClients.find(c => c.name.toLowerCase().includes(query) || query.includes(c.name.toLowerCase()));

    // 3. Levenshtein distance matching
    if (!match && allClients.length > 0) {
      const getLevenshteinDistance = (a, b) => {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
          for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              matrix[i][j] = Math.min(
                matrix[i - 1][j - 1] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j] + 1
              );
            }
          }
        }
        return matrix[b.length][a.length];
      };

      let bestMatch = null;
      let minDistance = 4;
      for (const c of allClients) {
        const dist = getLevenshteinDistance(query, c.name.toLowerCase());
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = c;
        }
      }
      match = bestMatch;
    }

    if (match) {
      client = await Client.findOne({ _id: match._id, companyId });
    }
  }

  return client;
}


