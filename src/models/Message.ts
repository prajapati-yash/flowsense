import mongoose, { Schema, Model, Types } from 'mongoose';

export type MessageType = 'text' | 'transaction_preview' | 'transaction_status' | 'transaction_result' | 'error';

export interface IMessage {
  _id: Types.ObjectId;
  chatId: Types.ObjectId;
  walletAddress: string;
  text: string;
  isUser: boolean;
  type: MessageType;
  data?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
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
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },
    isUser: {
      type: Boolean,
      required: true,
      default: false
    },
    type: {
      type: String,
      enum: ['text', 'transaction_preview', 'transaction_status', 'transaction_result', 'error'],
      default: 'text',
      required: true
    },
    data: {
      type: Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'messages'
  }
);

// Indexes for efficient queries
MessageSchema.index({ chatId: 1, createdAt: 1 });
MessageSchema.index({ walletAddress: 1, createdAt: -1 });
MessageSchema.index({ chatId: 1, walletAddress: 1, createdAt: 1 });

// Delete existing model if it exists (for hot reload in development)
if (mongoose.models.Message) {
  delete mongoose.models.Message;
}

const Message: Model<IMessage> = mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
