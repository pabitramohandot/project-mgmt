import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import Project from '@/models/Project';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = {};
    if (status) {
      query.status = status;
    }

    const invoices = await Invoice.find(query)
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Invoices GET API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const data = await request.json();

    const { project: projectId, client: clientId, items, taxRate = 0, discountRate = 0, status, dueDate, notes } = data;

    if ((!projectId && !clientId) || !items || items.length === 0) {
      return NextResponse.json({ error: 'Project or Client, and at least one item are required' }, { status: 400 });
    }

    let clientName = '';
    let clientEmail = '';
    let clientCompany = '';
    let clientAddress = '';
    let clientVal = null;

    if (projectId) {
      // Fetch project to get client details
      const project = await Project.findById(projectId);
      if (!project) {
        return NextResponse.json({ error: 'Linked project not found' }, { status: 404 });
      }
      clientName = project.clientName;
      clientEmail = project.clientEmail || '';
      clientVal = project.client || null;

      if (clientVal) {
        const Client = (await import('@/models/Client')).default;
        const clientObj = await Client.findById(clientVal);
        if (clientObj) {
          clientCompany = clientObj.company || '';
          clientAddress = clientObj.address || '';
        }
      }
    } else if (clientId) {
      const Client = (await import('@/models/Client')).default;
      const clientObj = await Client.findById(clientId);
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
    };

    const invoice = await Invoice.create(invoiceData);
    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Invoices POST API Error:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}
