import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import Company from '@/models/Company';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET(request, context) {
  try {
    const isAllowed = await hasPermission(request, 'invoices', 'read');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view invoice details' }, { status: 403 });
    }

    await dbConnect();
    const params = await context.params;
    const { id } = params;

    const { companyId, role } = getRequestSession(request);
    let query = { _id: id };
    if (role) {
      query.companyId = companyId;
    }

    const invoice = await Invoice.findOne(query)
      .populate('project', 'name description status clientName clientEmail client')
      .populate('client', 'name email company phone address')
      .populate('companyId')
      .lean();
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if ((!invoice.clientCompany || !invoice.clientAddress) || !invoice.client) {
      try {
        const Client = (await import('@/models/Client')).default;
        let clientObj = null;

        if (invoice.client) {
          const clientQuery = { _id: invoice.client };
          if (role) {
            clientQuery.companyId = companyId;
          }
          clientObj = await Client.findOne(clientQuery).lean();
        } else if (invoice.project?.client) {
          const clientQuery = { _id: invoice.project.client };
          if (role) {
            clientQuery.companyId = companyId;
          }
          clientObj = await Client.findOne(clientQuery).lean();
        } else {
          // Fallback to name/email matching
          const clientQuery = {
            $or: [
              { name: { $regex: new RegExp(`^${invoice.clientName}$`, 'i') } },
              { email: invoice.clientEmail?.toLowerCase().trim() }
            ]
          };
          if (role) {
            clientQuery.companyId = companyId;
          }
          clientObj = await Client.findOne(clientQuery).lean();
        }

        if (clientObj) {
          if (!invoice.client) invoice.client = clientObj;
          if (!invoice.clientCompany) invoice.clientCompany = clientObj.company || '';
          if (!invoice.clientAddress) invoice.clientAddress = clientObj.address || '';
        }
      } catch (clientErr) {
        console.error('Failed to resolve client details:', clientErr);
      }
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Invoice GET API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice details' }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    const isAllowed = await hasPermission(request, 'invoices', 'write');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to edit invoices' }, { status: 403 });
    }

    await dbConnect();
    const params = await context.params;
    const { id } = params;
    const data = await request.json();

    const { pdfBase64, ...updateData } = data;

    const { companyId, role } = getRequestSession(request);
    let query = { _id: id, companyId };

    const invoice = await Invoice.findOne(query);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // If items, taxRate, or discountRate are in the update, recalculate totals
    if (updateData.items || updateData.taxRate !== undefined || updateData.discountRate !== undefined) {
      const items = updateData.items || invoice.items;
      const taxRate = updateData.taxRate !== undefined ? updateData.taxRate : invoice.taxRate;
      const discountRate = updateData.discountRate !== undefined ? updateData.discountRate : invoice.discountRate;

      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
      const taxAmount = subtotal * (taxRate / 100);
      const discountAmount = subtotal * (discountRate / 100);
      const total = subtotal + taxAmount - discountAmount;

      updateData.subtotal = subtotal;
      updateData.total = total;
    }

    const isSendingEmail = updateData.status === 'Sent' && !!pdfBase64;

    const updatedInvoice = await Invoice.findOneAndUpdate(query, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('project', 'name')
      .populate('client', 'name email company phone address')
      .populate('companyId');

    if (!updatedInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (isSendingEmail) {
      try {
        const projectId = updatedInvoice.project?._id || updatedInvoice.project;
        let project = null;
        if (projectId) {
          const Project = (await import('@/models/Project')).default;
          const projectQuery = { _id: projectId, companyId };
          project = await Project.findOne(projectQuery);
        }
        const { sendInvoiceEmail } = await import('@/lib/email');
        const emailResult = await sendInvoiceEmail(updatedInvoice, project, pdfBase64);
        if (emailResult && emailResult.skipped) {
          return NextResponse.json({ error: `Invoice updated, but email skipped: ${emailResult.reason}` }, { status: 400 });
        }
      } catch (emailErr) {
        console.error('Error sending invoice email:', emailErr);
        return NextResponse.json({ error: `Invoice updated, but failed to send email: ${emailErr.message}` }, { status: 500 });
      }
    }

    return NextResponse.json(updatedInvoice);
  } catch (error) {
    console.error('Invoice PUT API Error:', error);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const isAllowed = await hasPermission(request, 'invoices', 'write');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to delete invoices' }, { status: 403 });
    }

    await dbConnect();
    const params = await context.params;
    const { id } = params;

    const { companyId } = getRequestSession(request);
    let query = { _id: id, companyId };

    const invoice = await Invoice.findOne(query);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    await Invoice.deleteOne({ _id: id });

    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Invoice DELETE API Error:', error);
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
}
