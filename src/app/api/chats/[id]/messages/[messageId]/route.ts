/**
 * Update Message API
 * Updates a specific message in a chat
 */

import { NextRequest } from 'next/server';
import { authenticateWallet } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Message from '@/models/Message';

/**
 * PATCH /api/chats/[id]/messages/[messageId]
 * Update a message
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const walletAddress = authenticateWallet(request);
    const { id: chatId, messageId } = await context.params;
    const body = await request.json();
    const { text, data } = body;

    // Validate at least one field to update
    if (!text && !data) {
      return Response.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find and update the message
    const updateFields: { text?: string; data?: unknown } = {};
    if (text !== undefined) updateFields.text = text;
    if (data !== undefined) updateFields.data = data;

    const updatedMessage = await Message.findOneAndUpdate(
      {
        _id: messageId,
        chatId,
        walletAddress: walletAddress.toLowerCase(),
      },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedMessage) {
      return Response.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: {
        id: updatedMessage._id.toString(),
        text: updatedMessage.text,
        isUser: updatedMessage.isUser,
        timestamp: updatedMessage.createdAt,
        type: updatedMessage.type,
        data: updatedMessage.data,
      }
    });

  } catch (error) {
    console.error('[PATCH /api/chats/[id]/messages/[messageId]] Error:', error);

    if (error instanceof Error && error.message.includes('Wallet')) {
      return Response.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    return Response.json(
      { success: false, error: 'Failed to update message' },
      { status: 500 }
    );
  }
}
