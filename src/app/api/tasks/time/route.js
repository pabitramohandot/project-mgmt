import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import { getRequestSession } from '@/lib/auth';

export async function POST(request) {
  try {
    await dbConnect();
    const session = getRequestSession(request);
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, taskId, duration, description } = body;

    if (!projectId || !taskId || !duration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const parsedDuration = parseInt(duration);
    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
    }

    // Find project
    const project = await Project.findOne({
      _id: projectId,
      companyId: session.companyId,
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Find task
    const task = project.tasks.id(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Push new log entry
    task.timeLogs.push({
      userId: session.userId,
      username: session.username || 'User',
      duration: parsedDuration,
      description: description || '',
      date: new Date(),
    });

    // Update total time spent
    task.totalTimeSpent = task.timeLogs.reduce((sum, log) => sum + log.duration, 0);

    // If the task is not already in progress or completed, we can change its status to 'In Progress'
    if (task.status === 'Todo') {
      task.status = 'In Progress';
    }

    await project.save();

    return NextResponse.json({
      success: true,
      message: 'Time logged successfully',
      task,
    });
  } catch (error) {
    console.error('Task Time Logging error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
