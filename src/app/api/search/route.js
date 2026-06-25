import dbConnect from "@/lib/db";
import Project from "@/models/Project";
import Client from "@/models/Client";
import Invoice from "@/models/Invoice";
import User from "@/models/User";
import Note from "@/models/Note";
import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth";

export async function GET(request) {
  try {
    await dbConnect();

    const { companyId, userId, role } = getRequestSession(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Build base query
    const baseQuery = {};
    if (role !== 'superadmin') {
      if (!companyId) {
        return NextResponse.json({ error: "Unauthorized: Missing companyId" }, { status: 401 });
      }
      baseQuery.companyId = companyId;
    } else if (companyId) {
      baseQuery.companyId = companyId;
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const regex = new RegExp(q, "i");
    const results = [];

    // Projects
    const projects = await Project.find({ ...baseQuery, name: { $regex: q, $options: 'i' } })
      .select('_id name status')
      .limit(5)
      .lean();
    
    projects.forEach(p => {
      results.push({
        id: `proj_${p._id.toString()}`,
        type: 'project',
        title: p.name,
        subtitle: `Project • Status: ${p.status || 'Active'}`,
        link: `/projects/${p._id}`,
        breadcrumbs: ['Projects', p.name]
      });
    });

    // Menus & Tabs
    const MENU_ROUTES = [
      { name: 'Dashboard', path: '/' },
      { name: 'Notes', path: '/notes' },
      { name: 'AI Agent', path: '/ai-agents' },
      { name: 'Projects', path: '/projects' },
      { name: 'Clients', path: '/clients' },
      { name: 'Invoices', path: '/invoices' },
      { name: 'Credentials', path: '/credentials' },
      { name: 'Pending Tasks', path: '/tasks' },
      { name: 'Announcements', path: '/announcements' },
      { name: 'Branding', path: '/settings/branding' },
      { name: 'Account Settings', path: '/settings/profile' },
      { name: 'Account Details', path: '/settings/profile' },
      { name: 'SMTP Integrations', path: '/settings/profile' },
      { name: 'Employees', path: '/settings/profile' },
      { name: 'Team Members', path: '/settings/profile' },
      { name: 'Team', path: '/settings/profile' },
      { name: 'Companies', path: '/superadmin/companies' },
      { name: 'Roles', path: '/superadmin/roles' },
      { name: 'Users', path: '/superadmin/users' },
      { name: 'Feedback', path: '/superadmin/feedback' },
      { name: 'AI Settings', path: '/superadmin/ai-settings' }
    ];

    MENU_ROUTES.filter(m => regex.test(m.name)).forEach(m => {
      // Very basic role check for superadmin menus to avoid confusion for normal users
      if (m.path.includes('/superadmin') && role !== 'superadmin') return;
      
      results.push({
        id: `menu_${m.name}`,
        type: 'menu',
        title: m.name,
        subtitle: `Navigation Menu`,
        link: m.path,
        breadcrumbs: ['Menu', m.name]
      });
    });

    // Clients
    const clients = await Client.find({ ...baseQuery, name: { $regex: q, $options: 'i' } })
      .select('_id name email')
      .limit(5)
      .lean();
      
    clients.forEach(c => {
      results.push({
        id: `client_${c._id.toString()}`,
        type: 'client',
        title: c.name,
        subtitle: `Client • ${c.email || ''}`,
        link: `/clients`,
        breadcrumbs: ['Clients', c.name]
      });
    });

    // Invoices
    const invoices = await Invoice.find({ ...baseQuery, invoiceNumber: { $regex: q, $options: 'i' } })
      .select('_id invoiceNumber totalAmount')
      .limit(5)
      .lean();
      
    invoices.forEach(i => {
      results.push({
        id: `invoice_${i._id.toString()}`,
        type: 'invoice',
        title: i.invoiceNumber,
        subtitle: `Invoice • Amount: $${i.totalAmount}`,
        link: `/invoices`,
        breadcrumbs: ['Invoices', i.invoiceNumber]
      });
    });

    // Team Members
    const users = await User.find({ ...baseQuery, username: { $regex: q, $options: 'i' } })
      .select('_id username email role')
      .limit(5)
      .lean();
      
    users.forEach(u => {
      results.push({
        id: `user_${u._id.toString()}`,
        type: 'client',
        title: u.username,
        subtitle: `Team Member • ${u.role}`,
        link: `/settings/profile`,
        breadcrumbs: ['Team', u.username]
      });
    });

    // Notes
    const notes = await Note.find({ 
      ...baseQuery, 
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } }
      ]
    })
      .select('_id title content')
      .limit(5)
      .lean();
      
    notes.forEach(n => {
      const rawText = n.content ? n.content.replace(/<[^>]+>/g, ' ').trim() : '';
      const snippet = rawText.length > 40 ? rawText.substring(0, 40) + '...' : rawText;
      const displayTitle = n.title || 'Untitled Note';
      
      results.push({
        id: `note_${n._id.toString()}`,
        type: 'note',
        title: displayTitle,
        subtitle: `Note • ${snippet}`,
        link: `/notes`, 
        breadcrumbs: ['Notes', displayTitle]
      });
    });

    return NextResponse.json({ results: results.slice(0, 15) });
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
