import dbConnect from "@/lib/db";
import Project from "@/models/Project";
import Invoice from "@/models/Invoice";
import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth";
import { processProjectStatus } from "@/lib/projectUtils";

import User from "@/models/User";
import { getCategoryForUser } from "@/lib/permissions";

export async function GET(request) {
  try {
    await dbConnect();

    const { companyId, userId } = getRequestSession(request);
    if (!companyId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(userId).populate("customRole").lean();
    const category = await getCategoryForUser(user);

    if (category === "Employee") {
      const allProjects = await Project.find({ companyId }).lean();

      const employeeProjects = [];
      const employeeTasks = [];
      const overdueTasks = [];
      const calendarPosts = [];
      const credentials = [];
      const pendingTasks = [];

      const empNow = new Date();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      for (const proj of allProjects) {
        const processedProj = processProjectStatus(proj);

        // Determine if employee is assigned to this project (has tasks or posts assigned, or has credentials)
        const hasAssignedTasks = (proj.tasks || []).some(
          (t) => t.assignedTo === user.username,
        );
        const hasAssignedPosts = (proj.contentCalendar || []).some(
          (p) => p.assignedTo === user.username,
        );

        const assignedTasks = (proj.tasks || [])
          .filter((t) => t.assignedTo === user.username)
          .map((t) => ({
            ...t,
            projectId: proj._id,
            projectName: proj.name,
          }));

        employeeTasks.push(...assignedTasks);

        // Check overdue tasks
        for (const t of assignedTasks) {
          if (!t.completed && t.dueDate && new Date(t.dueDate) < empNow) {
            overdueTasks.push(t);
            pendingTasks.push({
              id: t._id,
              type: "project_pending",
              title: `Overdue Task: ${t.name}`,
              description: `Task in project "${proj.name}" is overdue (due ${new Date(t.dueDate).toLocaleDateString("en-IN")}). Please complete it.`,
              link: `/projects/${proj._id}`,
              date: t.dueDate,
            });
          }
        }

        // Filter calendar posts
        const assignedPosts = (proj.contentCalendar || [])
          .filter((p) => p.assignedTo === user.username)
          .map((p) => ({
            ...p,
            projectId: proj._id,
            projectName: proj.name,
          }));
        calendarPosts.push(...assignedPosts);

        // Check pending calendar posts
        for (const post of assignedPosts) {
          if (!post.scheduledDate) continue;
          const postDate = new Date(post.scheduledDate);
          const postDateStart = new Date(postDate);
          postDateStart.setHours(0, 0, 0, 0);

          if (postDateStart <= todayStart && post.status !== "Posted") {
            pendingTasks.push({
              id: `${proj._id}-${post._id}`,
              type: "calendar_pending",
              title: `Post Content Pending: ${proj.name}`,
              description: `Scheduled post for "${post.topic || "Untitled"}" (${post.postType || "Static"}) on ${postDate.toLocaleDateString("en-IN")} has status "${post.status}".`,
              link: `/projects/${proj._id}`,
              date: post.scheduledDate,
            });
          }
        }

        if (hasAssignedTasks || hasAssignedPosts) {
          const cleanProj = {
            _id: proj._id,
            name: proj.name,
            description: proj.description,
            clientName: proj.clientName,
            status: processedProj.status,
            devStatus: processedProj.devStatus,
            marketingStatus: processedProj.marketingStatus,
            adsStatus: processedProj.adsStatus,
            designStatus: processedProj.designStatus,
            projectType: proj.projectType,
            subcategories: proj.subcategories,
            startDate: proj.startDate,
            endDate: proj.endDate,
          };
          employeeProjects.push(cleanProj);

          if (proj.credentials && proj.credentials.length > 0) {
            credentials.push({
              projectId: proj._id,
              projectName: proj.name,
              credentials: proj.credentials,
            });
          }
        }
      }

      pendingTasks.sort((a, b) => new Date(a.date) - new Date(b.date));

      return NextResponse.json({
        category: "Employee",
        username: user.username,
        projects: employeeProjects,
        tasks: employeeTasks,
        overdueTasks,
        calendarPosts,
        credentials,
        pendingTasks,
      });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "all";

    let projectQuery = { companyId };
    let invoiceQuery = { companyId };

    const now = new Date();
    if (timeframe === "monthly") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      projectQuery.createdAt = { $gte: startOfMonth };
      invoiceQuery.createdAt = { $gte: startOfMonth };
    } else if (timeframe === "yearly") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      projectQuery.createdAt = { $gte: startOfYear };
      invoiceQuery.createdAt = { $gte: startOfYear };
    }

    // Background update category statuses to Pending if overdue
    Project.updateMany(
      {
        companyId,
        projectType: "Development",
        devEndDate: { $lt: now },
        devStatus: { $nin: ["Completed", "Pending"] },
      },
      { $set: { devStatus: "Pending", status: "Pending" } },
    ).catch((err) =>
      console.error("Error auto-updating devStatus in dashboard:", err),
    );

    Project.updateMany(
      {
        companyId,
        projectType: "360 Deg Digital Marketing",
        marketingEndDate: { $lt: now },
        marketingStatus: { $nin: ["Completed", "Pending"] },
      },
      { $set: { marketingStatus: "Pending", status: "Pending" } },
    ).catch((err) =>
      console.error("Error auto-updating marketingStatus in dashboard:", err),
    );

    Project.updateMany(
      {
        companyId,
        projectType: "Meta / Google Ads",
        adsDate: { $lt: now },
        adsStatus: { $nin: ["Completed", "Pending"] },
      },
      { $set: { adsStatus: "Pending", status: "Pending" } },
    ).catch((err) =>
      console.error("Error auto-updating adsStatus in dashboard:", err),
    );

    Project.updateMany(
      {
        companyId,
        projectType: "Design",
        designEndDate: { $lt: now },
        designStatus: { $nin: ["Completed", "Pending"] },
      },
      { $set: { designStatus: "Pending", status: "Pending" } },
    ).catch((err) =>
      console.error("Error auto-updating designStatus in dashboard:", err),
    );

    // Fetch all projects and invoices in parallel using lean() for maximum performance
    const [allProjects, allInvoices] = await Promise.all([
      Project.find(projectQuery).sort({ createdAt: -1 }).lean(),
      Invoice.find(invoiceQuery).sort({ createdAt: -1 }).lean(),
    ]);

    // Compute dynamic project status updates for current response (since DB update runs in background)
    const processedProjects = allProjects.map((proj) =>
      processProjectStatus(proj),
    );

    // Project stats
    const totalProjects = processedProjects.length;
    const activeProjects = processedProjects.filter((p) =>
      ["Planning", "In Progress", "Under Review", "Pending"].includes(p.status),
    ).length;
    const completedProjects = processedProjects.filter(
      (p) => p.status === "Completed",
    ).length;
    const totalBudget = processedProjects.reduce(
      (sum, proj) => sum + (proj.budget || 0),
      0,
    );

    // Invoice stats
    const totalInvoices = allInvoices.length;
    const paidInvoices = allInvoices.filter((inv) => inv.status === "Paid");
    const pendingInvoicesCount = allInvoices.filter((inv) =>
      ["Draft", "Sent", "Overdue"].includes(inv.status),
    ).length;

    const totalEarnings = paidInvoices.reduce(
      (sum, inv) => sum + (inv.total || 0),
      0,
    );
    const totalPendingAmount = allInvoices
      .filter((inv) => inv.status !== "Paid")
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    // Recent activity (since arrays are sorted by createdAt desc by mongoose, we can just slice them!)
    const recentProjects = processedProjects.slice(0, 5);
    const recentInvoices = allInvoices.slice(0, 5);

    // Compile Pending Tasks / Action Required
    const pendingTasks = [];

    // 1. Invoice not sent (Drafts)
    const draftInvoices = allInvoices.filter((inv) => inv.status === "Draft");
    for (const inv of draftInvoices) {
      pendingTasks.push({
        id: inv._id,
        type: "invoice_draft",
        title: `Send Draft Invoice: ${inv.invoiceNumber}`,
        description: `Draft invoice for ${inv.clientName} has not been sent. Review and email this invoice to collect payment.`,
        link: `/invoices/${inv._id}`,
        date: inv.createdAt,
      });
    }

    // 2. Hosting expiring in less than 1 month and 1 week (37 days)
    const thirtySevenDaysFromNow = new Date();
    thirtySevenDaysFromNow.setDate(thirtySevenDaysFromNow.getDate() + 37);

    const expiringHostingProjects = processedProjects.filter(
      (proj) =>
        proj.hostingExpiry &&
        new Date(proj.hostingExpiry) <= thirtySevenDaysFromNow,
    );
    for (const proj of expiringHostingProjects) {
      const remainingDays = Math.ceil(
        (new Date(proj.hostingExpiry) - new Date()) / (1000 * 60 * 60 * 24),
      );
      const expStr =
        remainingDays < 0 ? "has expired" : `expires in ${remainingDays} days`;
      pendingTasks.push({
        id: proj._id,
        type: "hosting_expiry",
        title: `Renew Hosting: ${proj.name}`,
        description: `Hosting for project ${proj.name} ${expStr} (${new Date(proj.hostingExpiry).toLocaleDateString("en-IN")}). Renew hosting to prevent website downtime.`,
        link: `/projects/${proj._id}`,
        date: proj.hostingExpiry,
      });
    }

    // 2.5. Domain expiring in less than 1 month and 7 days (37 days)
    const expiringDomainProjects = processedProjects.filter(
      (proj) =>
        proj.domainExpiry &&
        new Date(proj.domainExpiry) <= thirtySevenDaysFromNow,
    );
    for (const proj of expiringDomainProjects) {
      const remainingDays = Math.ceil(
        (new Date(proj.domainExpiry) - new Date()) / (1000 * 60 * 60 * 24),
      );
      const expStr =
        remainingDays < 0 ? "has expired" : `expires in ${remainingDays} days`;
      pendingTasks.push({
        id: proj._id,
        type: "domain_expiry",
        title: `Renew Domain: ${proj.name}`,
        description: `Domain registration for project ${proj.name} ${expStr} (${new Date(proj.domainExpiry).toLocaleDateString("en-IN")}). Renew domain registration to keep website online.`,
        link: `/projects/${proj._id}`,
        date: proj.domainExpiry,
      });
    }

    // 3. Projects past due date (Pending status per category)
    for (const proj of processedProjects) {
      const overdueCategories = [];

      if (
        proj.projectType?.includes("Development") &&
        proj.devEndDate &&
        new Date(proj.devEndDate) < now &&
        proj.devStatus !== "Completed"
      ) {
        overdueCategories.push({
          name: "Development",
          dueDate: new Date(proj.devEndDate),
        });
      }
      if (
        proj.projectType?.includes("360 Deg Digital Marketing") &&
        proj.marketingEndDate &&
        new Date(proj.marketingEndDate) < now &&
        proj.marketingStatus !== "Completed"
      ) {
        overdueCategories.push({
          name: "360 Deg Digital Marketing",
          dueDate: new Date(proj.marketingEndDate),
        });
      }
      if (
        proj.projectType?.includes("Meta / Google Ads") &&
        proj.adsDate &&
        new Date(proj.adsDate) < now &&
        proj.adsStatus !== "Completed"
      ) {
        overdueCategories.push({
          name: "Meta / Google Ads",
          dueDate: new Date(proj.adsDate),
        });
      }
      if (
        proj.projectType?.includes("Design") &&
        proj.designEndDate &&
        new Date(proj.designEndDate) < now &&
        proj.designStatus !== "Completed"
      ) {
        overdueCategories.push({
          name: "Design",
          dueDate: new Date(proj.designEndDate),
        });
      }

      if (overdueCategories.length > 0) {
        const categoriesLabel = overdueCategories
          .map((c) => c.name)
          .join(" & ");
        const oldestOverdueDate = new Date(
          Math.min(...overdueCategories.map((c) => c.dueDate)),
        );
        const detailsStr = overdueCategories
          .map(
            (c) => `${c.name} (due ${c.dueDate.toLocaleDateString("en-IN")})`,
          )
          .join(", ");

        pendingTasks.push({
          id: proj._id,
          type: "project_pending",
          title: `Resolve Overdue Service: ${proj.name} (${categoriesLabel})`,
          description: `Timeline has expired for: ${detailsStr}. Please complete the deliverables and mark the category status as Completed in the project details.`,
          link: `/projects/${proj._id}`,
          date: oldestOverdueDate,
        });
      }
    }

    // 4. Content Calendar Posts scheduled for today or in the past that are not posted
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (const proj of processedProjects) {
      if (proj.status === "Completed") continue;
      if (!proj.contentCalendar || !Array.isArray(proj.contentCalendar))
        continue;

      for (const post of proj.contentCalendar) {
        if (!post.scheduledDate) continue;
        const postDate = new Date(post.scheduledDate);
        const postDateStart = new Date(postDate);
        postDateStart.setHours(0, 0, 0, 0);

        if (postDateStart <= todayStart && post.status !== "Posted") {
          pendingTasks.push({
            id: `${proj._id}-${post._id}`,
            type: "calendar_pending",
            title: `Post Content Pending: ${proj.name}`,
            description: `Scheduled post for "${post.topic || "Untitled"}" (${post.postType || "Static"}) on ${postDate.toLocaleDateString("en-IN")} has status "${post.status}".`,
            link: `/projects/${proj._id}`,
            date: post.scheduledDate,
          });
        }
      }
    }

    // 5. Overdue individual employee tasks
    for (const proj of processedProjects) {
      if (!proj.tasks || !Array.isArray(proj.tasks)) continue;
      for (const t of proj.tasks) {
        if (!t.completed && t.dueDate && new Date(t.dueDate) < now) {
          pendingTasks.push({
            id: t._id,
            type: "project_pending",
            title: `Overdue Task: ${t.name} (${t.assignedTo || "Unassigned"})`,
            description: `Task in project "${proj.name}" assigned to ${t.assignedTo || "unassigned"} is overdue (due ${new Date(t.dueDate).toLocaleDateString("en-IN")}).`,
            link: `/projects/${proj._id}`,
            date: t.dueDate,
          });
        }
      }
    }

    // Sort pending tasks by date ascending (oldest/most urgent first)
    pendingTasks.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate actual billing performance data
    const chartInvoices = await Invoice.find({
      companyId,
      status: "Paid",
    }).lean();

    // 1. Monthly (last 7 months up to current month)
    const monthlyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "short" });
      const year = d.getFullYear();
      const month = d.getMonth();

      let value = 0;
      for (const inv of chartInvoices) {
        const invDate = new Date(inv.issueDate || inv.createdAt);
        if (invDate.getFullYear() === year && invDate.getMonth() === month) {
          value += inv.total || 0;
        }
      }
      monthlyData.push({ label, value });
    }

    // 2. Weekly (last 4 weeks)
    const weeklyData = [];
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    for (let i = 3; i >= 0; i--) {
      const start = new Date(now.getTime() - (i + 1) * oneWeekMs);
      const end = new Date(now.getTime() - i * oneWeekMs);
      const label = `Week ${4 - i}`;

      let value = 0;
      for (const inv of chartInvoices) {
        const invDate = new Date(inv.issueDate || inv.createdAt);
        if (invDate >= start && invDate < end) {
          value += inv.total || 0;
        }
      }
      weeklyData.push({ label, value });
    }

    // 3. Quarterly (last 4 quarters)
    const quarterlyData = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
      const quarter = Math.floor(d.getMonth() / 3) + 1;
      const label = `Q${quarter}`;
      const year = d.getFullYear();

      let value = 0;
      for (const inv of chartInvoices) {
        const invDate = new Date(inv.issueDate || inv.createdAt);
        const invQuarter = Math.floor(invDate.getMonth() / 3) + 1;
        const invYear = invDate.getFullYear();
        if (invYear === year && invQuarter === quarter) {
          value += inv.total || 0;
        }
      }
      quarterlyData.push({ label, value });
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
      billingPerformance: {
        weekly: weeklyData,
        monthly: monthlyData,
        quarterly: quarterlyData,
      },
      recentProjects,
      recentInvoices,
      pendingTasks,
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 },
    );
  }
}
