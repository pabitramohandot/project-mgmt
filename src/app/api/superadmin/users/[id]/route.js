import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Feedback from '@/models/Feedback';
import Notification from '@/models/Notification';
import { getRequestSession, hashPassword } from '@/lib/auth';

export async function DELETE(request, context) {
  try {
    const { role, userId: currentUserId } = getRequestSession(request);
    if (role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const params = await context.params;
    const { id } = params;

    // Prevent deleting self
    if (id === currentUserId) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    // Verify user exists
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find and delete notifications linked to this user's feedback
    const feedbacks = await Feedback.find({ userId: id }).select('_id').lean();
    const feedbackIds = feedbacks.map(f => f._id);
    if (feedbackIds.length > 0) {
      await Notification.deleteMany({ feedbackId: { $in: feedbackIds } });
    }

    // Delete feedback from this user
    await Feedback.deleteMany({ userId: id });

    // Delete user
    await User.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Superadmin User detail DELETE API Error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const { role } = getRequestSession(request);
    if (role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dbConnect();
    const params = await context.params;
    const { id } = params;

    const body = await request.json();
    const { password } = body;

    if (!password || password.trim().length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters long' }, { status: 400 });
    }

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hashedPassword = await hashPassword(password);
    user.password = hashedPassword;
    await user.save();

    return NextResponse.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Superadmin User detail PATCH API Error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
