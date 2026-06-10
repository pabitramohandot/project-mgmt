import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Invoice from '@/models/Invoice';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';

export async function GET(request) {
  try {
    await dbConnect();

    const { companyId } = getRequestSession(request);
    let projectQuery = { companyId };
    let invoiceQuery = { companyId };

    // Auto-update past-due projects to Pending in the background to avoid blocking the user request
    Project.updateMany(
      {
        ...projectQuery,
        endDate: { $lt: new Date() },
        status: { $nin: ['Completed', 'Pending'] }
      },
      { $set: { status: 'Pending' } }
    ).catch(err => console.error('Dashboard auto-update projects error:', err));

    // Fetch all projects and invoices in parallel using lean() for maximum performance
    const [allProjects, allInvoices] = await Promise.all([
      Project.find(projectQuery).sort({ createdAt: -1 }).lean(),
      Invoice.find(invoiceQuery).sort({ createdAt: -1 }).lean()
    ]);

    // Compute dynamic project status updates for current response (since DB update runs in background)
    const processedProjects = allProjects.map(proj => {
      if (proj.endDate && new Date(proj.endDate) < new Date() && proj.status !== 'Completed' && proj.status !== 'Pending') {
        return { ...proj, status: 'Pending' };
      }
      return proj;
    });

    // Project stats
    const totalProjects = processedProjects.length;
    const activeProjects = processedProjects.filter(p => 
      ['Planning', 'In Progress', 'Under Review', 'Pending'].includes(p.status)
    ).length;
    const completedProjects = processedProjects.filter(p => p.status === 'Completed').length;
    const totalBudget = processedProjects.reduce((sum, proj) => sum + (proj.budget || 0), 0);

    // Invoice stats
    const totalInvoices = allInvoices.length;
    const paidInvoices = allInvoices.filter(inv => inv.status === 'Paid');
    const pendingInvoicesCount = allInvoices.filter(inv => 
      ['Draft', 'Sent', 'Overdue'].includes(inv.status)
    ).length;
    
    const totalEarnings = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPendingAmount = allInvoices
      .filter(inv => inv.status !== 'Paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Recent activity (since arrays are sorted by createdAt desc by mongoose, we can just slice them!)
    const recentProjects = processedProjects.slice(0, 5);
    const recentInvoices = allInvoices.slice(0, 5);

    // Compile Pending Tasks / Action Required
    const pendingTasks = [];

    // 1. Invoice not sent (Drafts)
    const draftInvoices = allInvoices.filter(inv => inv.status === 'Draft');
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

    const expiringHostingProjects = processedProjects.filter(proj => 
      proj.hostingExpiry && new Date(proj.hostingExpiry) <= thirtySevenDaysFromNow
    );
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

    // 2.5. Domain expiring in less than 1 month and 7 days (37 days)
    const expiringDomainProjects = processedProjects.filter(proj => 
      proj.domainExpiry && new Date(proj.domainExpiry) <= thirtySevenDaysFromNow
    );
    for (const proj of expiringDomainProjects) {
      const remainingDays = Math.ceil((new Date(proj.domainExpiry) - new Date()) / (1000 * 60 * 60 * 24));
      const expStr = remainingDays < 0 ? 'Expired' : `expires in ${remainingDays} days`;
      pendingTasks.push({
        id: proj._id,
        type: 'domain_expiry',
        title: `Domain expiring: ${proj.name}`,
        description: `Domain for project ${proj.name} is ${expStr} (${new Date(proj.domainExpiry).toLocaleDateString()}).`,
        link: `/projects/${proj._id}`,
        date: proj.domainExpiry,
      });
    }

    // 3. Projects past due date (Pending status)
    const overdueProjectsList = processedProjects.filter(proj => 
      proj.endDate && new Date(proj.endDate) < new Date() && proj.status !== 'Completed'
    );
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
