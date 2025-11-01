import mongoose, { Schema, Model, Types } from 'mongoose';

export interface IChat {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  walletAddress: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
}

const ChatSchema = new Schema<IChat>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    walletAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
      validate: {
        validator: function(v: string) {
          return /^0x[a-f0-9]+$/i.test(v);
        },
        message: 'Invalid Flow wallet address format'
      }
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      default: 'New Chat'
    },
    lastMessageAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'chats'
  }
);

// Compound indexes for efficient queries
ChatSchema.index({ walletAddress: 1, createdAt: -1 });
ChatSchema.index({ userId: 1, updatedAt: -1 });
ChatSchema.index({ walletAddress: 1, lastMessageAt: -1 });

// Delete existing model if it exists (for hot reload in development)
if (mongoose.models.Chat) {
  delete mongoose.models.Chat;
}

const Chat: Model<IChat> = mongoose.model<IChat>('Chat', ChatSchema);

export default Chat;
