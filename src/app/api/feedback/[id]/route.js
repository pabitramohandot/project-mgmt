import dbConnect from '@/lib/db';
import Feedback from '@/models/Feedback';
import Notification from '@/models/Notification';
// Register referenced schemas to avoid Mongoose schema compilation errors during populate
import User from '@/models/User';
import Company from '@/models/Company';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';

export async function GET(request, context) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;
    const feedback = await Feedback.findById(id)
      .populate({ path: 'companyId', select: 'name logo' })
      .populate({ path: 'userId', select: 'username email' })
      .lean();

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    // Superadmin can see anything, users see only their company's feedback
    if (session.role !== 'superadmin' && feedback.companyId._id.toString() !== session.companyId.toString()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(feedback);
  } catch (error) {
    console.error('Feedback detail GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve feedback details' }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    
    // Only superadmin can update feedback status/notes
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const { id } = params;
    const body = await request.json();
    const { status, adminNotes } = body;

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    const oldStatus = feedback.status;
    
    if (status) {
      if (!['pending', 'in-progress', 'resolved', 'rejected'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      feedback.status = status;
    }

    if (adminNotes !== undefined) {
      feedback.adminNotes = adminNotes;
    }

    await feedback.save();

    // Create a notification for the company if status changed
    if (status && oldStatus !== status) {
      const typeLabel = feedback.type === 'bug' ? 'bug report' : 'feature request';
      const cleanDesc = feedback.description.length > 40 ? `${feedback.description.substring(0, 40)}...` : feedback.description;
      const statusLabel = status.toUpperCase().replace('-', ' ');
      
      let message = '';
      const notesSnippet = feedback.adminNotes && feedback.adminNotes.trim()
        ? ` Note: "${feedback.adminNotes.trim()}"`
        : '';

      if (status === 'resolved') {
        message = `Your ${typeLabel} ("${cleanDesc}") has been RESOLVED! 👏${notesSnippet}`;
      } else {
        message = `Your ${typeLabel} ("${cleanDesc}") status has been updated to "${statusLabel}".${notesSnippet}`;
      }
      
      await Notification.create({
        companyId: feedback.companyId,
        feedbackId: feedback._id,
        message,
        isRead: false
      });
    }

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error('Feedback PUT Error:', error);
    return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    
    // Only superadmin can delete feedback
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const { id } = params;

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    // Cascade delete any notifications linked to this feedback
    await Notification.deleteMany({ feedbackId: id });

    // Delete feedback
    await Feedback.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Feedback and all related notifications deleted successfully' });
  } catch (error) {
    console.error('Feedback DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
  }
}

