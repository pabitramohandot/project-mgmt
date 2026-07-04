import mongoose from 'mongoose';

const ReminderSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
    },
    client: {
      type: String,
      default: 'No client (personal meeting)',
    },
    date: {
      type: Date,
      required: [true, 'Please provide a date'],
    },
    time: {
      type: String,
      required: [true, 'Please provide a trigger time'],
    },
    duration: {
      type: String,
      default: '1 hour',
    },
    attendees: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    addGoogleMeet: {
      type: Boolean,
      default: false,
    },
    meetingUrl: {
      type: String,
      trim: true,
    },
    meetingType: {
      type: String,
      enum: ['online', 'offline'],
      default: 'online',
    },
    location: {
      type: String,
      trim: true,
    },
    remindMe: {
      type: String,
      default: '15 minutes before',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    googleEventId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.Reminder) {
  delete mongoose.models.Reminder;
}

export default mongoose.model('Reminder', ReminderSchema);
