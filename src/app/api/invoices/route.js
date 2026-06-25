import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import Project from '@/models/Project';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET(request) {
  try {
    const isAllowed = await hasPermission(request, 'invoices', 'read');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view invoices' }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const { companyId } = getRequestSession(request);
    let query = { companyId };

    if (status) {
      query.status = status;
    }

    const invoices = await Invoice.find(query)
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Invoices GET API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const isAllowed = await hasPermission(request, 'invoices', 'write');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to create invoices' }, { status: 403 });
    }

    await dbConnect();
    const { companyId } = getRequestSession(request);
    const data = await request.json();

    const { project: projectId, client: clientId, items, taxRate = 0, discountRate = 0, status, dueDate, notes } = data;

    if ((!projectId && !clientId) || !items || items.length === 0) {
      return NextResponse.json({ error: 'Project or Client, and at least one item are required' }, { status: 400 });
    }

    const targetCompanyId = companyId;

    let clientName = '';
    let clientEmail = '';
    let clientCompany = '';
    let clientAddress = '';
    let clientVal = null;

    if (projectId) {
      // Fetch project to get client details
      const projectQuery = { _id: projectId, companyId };
      const project = await Project.findOne(projectQuery);
      if (!project) {
        return NextResponse.json({ error: 'Linked project not found' }, { status: 404 });
      }
      clientName = project.clientName;
      clientEmail = project.clientEmail || '';
      clientVal = project.client || null;

      if (clientVal) {
        const Client = (await import('@/models/Client')).default;
        const clientQuery = { _id: clientVal, companyId };
        const clientObj = await Client.findOne(clientQuery);
        if (clientObj) {
          clientCompany = clientObj.company || '';
          clientAddress = clientObj.address || '';
        }
      }
    } else if (clientId) {
      const Client = (await import('@/models/Client')).default;
      const clientQuery = { _id: clientId, companyId };
      const clientObj = await Client.findOne(clientQuery);
      if (!clientObj) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }
      clientName = clientObj.name;
      clientEmail = clientObj.email || '';
      clientCompany = clientObj.company || '';
      clientAddress = clientObj.address || '';
      clientVal = clientObj._id;
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const taxAmount = subtotal * (taxRate / 100);
    const discountAmount = subtotal * (discountRate / 100);
    const total = subtotal + taxAmount - discountAmount;

    // Generate unique invoice number: INV-XXXX
    // Find the latest invoice
    const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
    let nextNum = 1001;
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const invoiceNumber = `INV-${nextNum}`;

    const invoiceData = {
      invoiceNumber,
      project: projectId || undefined,
      client: clientVal || undefined,
      clientName,
      clientEmail,
      clientCompany,
      clientAddress,
      items,
      taxRate,
      discountRate,
      subtotal,
      total,
      status: status || 'Draft',
      dueDate,
      notes,
      companyId: targetCompanyId
    };

    const invoice = await Invoice.create(invoiceData);
    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Invoices POST API Error:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}
