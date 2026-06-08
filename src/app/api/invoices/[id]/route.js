import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import { NextResponse } from 'next/server';

export async function GET(request, context) {
  try {
    await dbConnect();
    const params = await context.params;
    const { id } = params;

    const invoice = await Invoice.findById(id)
      .populate('project', 'name description status clientName clientEmail client')
      .populate('client', 'name email company phone address')
      .lean();
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if ((!invoice.clientCompany || !invoice.clientAddress) || !invoice.client) {
      try {
        const Client = (await import('@/models/Client')).default;
        let clientObj = null;

        if (invoice.client) {
          clientObj = await Client.findById(invoice.client).lean();
        } else if (invoice.project?.client) {
          clientObj = await Client.findById(invoice.project.client).lean();
        } else {
          // Fallback to name/email matching
          clientObj = await Client.findOne({
            $or: [
              { name: { $regex: new RegExp(`^${invoice.clientName}$`, 'i') } },
              { email: invoice.clientEmail?.toLowerCase().trim() }
            ]
          }).lean();
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
    await dbConnect();
    const params = await context.params;
    const { id } = params;
    const data = await request.json();

    const { pdfBase64, ...updateData } = data;

    const invoice = await Invoice.findById(id);
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

    const isChangingToSent = updateData.status === 'Sent' && invoice.status !== 'Sent';

    const updatedInvoice = await Invoice.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('project', 'name').populate('client', 'name email company phone address');

    if (!updatedInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (isChangingToSent) {
      try {
        const Project = (await import('@/models/Project')).default;
        const project = await Project.findById(updatedInvoice.project);
        const { sendInvoiceEmail } = await import('@/lib/email');
        await sendInvoiceEmail(updatedInvoice, project, pdfBase64);
      } catch (emailErr) {
        console.error('Error sending invoice email:', emailErr);
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
    await dbConnect();
    const params = await context.params;
    const { id } = params;

    const invoice = await Invoice.findByIdAndDelete(id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Invoice DELETE API Error:', error);
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
}
