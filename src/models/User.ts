import mongoose, { Schema, Model } from 'mongoose';

export interface IUser {
  walletAddress: string;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      validate: {
        validator: function(v: string) {
          // Validate Flow wallet address format (0x followed by hex)
          return /^0x[a-f0-9]+$/i.test(v);
        },
        message: 'Invalid Flow wallet address format'
      }
    },
    lastLogin: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'users'
  }
);

// Indexes for performance
UserSchema.index({ walletAddress: 1 });
UserSchema.index({ createdAt: -1 });

// Delete existing model if it exists (for hot reload in development)
if (mongoose.models.User) {
  delete mongoose.models.User;
}

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export default User;
