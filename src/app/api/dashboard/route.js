import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Invoice from '@/models/Invoice';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await dbConnect();

    // Auto update past-due projects to Pending
    await Project.updateMany(
      {
        endDate: { $lt: new Date() },
        status: { $nin: ['Completed', 'Pending'] }
      },
      { $set: { status: 'Pending' } }
    );

    // Project stats
    const totalProjects = await Project.countDocuments();
    const activeProjects = await Project.countDocuments({
      status: { $in: ['Planning', 'In Progress', 'Under Review', 'Pending'] },
    });
    const completedProjects = await Project.countDocuments({ status: 'Completed' });

    const allProjects = await Project.find({});
    const totalBudget = allProjects.reduce((sum, proj) => sum + (proj.budget || 0), 0);

    // Invoice stats
    const totalInvoices = await Invoice.countDocuments();
    const paidInvoices = await Invoice.find({ status: 'Paid' });
    const pendingInvoicesCount = await Invoice.countDocuments({ status: { $in: ['Draft', 'Sent', 'Overdue'] } });
    
    const totalEarnings = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    const invoices = await Invoice.find({});
    const totalPendingAmount = invoices
      .filter(inv => inv.status !== 'Paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Recent activity
    const recentProjects = await Project.find({}).sort({ createdAt: -1 }).limit(5);
    const recentInvoices = await Invoice.find({}).sort({ createdAt: -1 }).limit(5);

    // Compile Pending Tasks / Action Required
    const pendingTasks = [];

    // 1. Invoice not sent (Drafts)
    const draftInvoices = await Invoice.find({ status: 'Draft' });
    for (const inv of draftInvoices) {
      pendingTasks.push({
        id: inv._id,
        type: 'invoice_draft',
        title: `Invoice ${inv.invoiceNumber} not sent`,
        description: `Draft invoice for client ${inv.clientName} is pending delivery.`,
        link: `/invoices`,
        date: inv.createdAt,
      });
    }

    // 2. Hosting expiring in less than 1 month and 1 week (37 days)
    const thirtySevenDaysFromNow = new Date();
    thirtySevenDaysFromNow.setDate(thirtySevenDaysFromNow.getDate() + 37);

    const expiringHostingProjects = await Project.find({
      hostingExpiry: { $ne: null, $lte: thirtySevenDaysFromNow }
    });
    for (const proj of expiringHostingProjects) {
      const remainingDays = Math.ceil((new Date(proj.hostingExpiry) - new Date()) / (1000 * 60 * 60 * 24));
      const expStr = remainingDays < 0 ? 'Expired' : `expires in ${remainingDays} days`;
      pendingTasks.push({
        id: proj._id,
        type: 'hosting_expiry',
        title: `Hosting expiring: ${proj.name}`,
        description: `Hosting for project ${proj.name} is ${expStr} (${new Date(proj.hostingExpiry).toLocaleDateString()}).`,
        link: `/projects/${proj._id}`,
        date: proj.hostingExpiry,
      });
    }

    // 3. Projects past due date (Pending status)
    const overdueProjectsList = await Project.find({
      endDate: { $lt: new Date() },
      status: { $ne: 'Completed' }
    });
    for (const proj of overdueProjectsList) {
      pendingTasks.push({
        id: proj._id,
        type: 'project_pending',
        title: `Project past due: ${proj.name}`,
        description: `Project is past its due date (${new Date(proj.endDate).toLocaleDateString()}) and status is Pending.`,
        link: `/projects/${proj._id}`,
        date: proj.endDate,
      });
    }

    return NextResponse.json({
      projects: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        totalBudget,
      },
      invoices: {
        total: totalInvoices,
        pendingCount: pendingInvoicesCount,
        totalEarnings,
        totalPendingAmount,
      },
      recentProjects,
      recentInvoices,
      pendingTasks,
    });
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
