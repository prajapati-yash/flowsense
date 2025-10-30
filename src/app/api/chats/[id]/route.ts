import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { authenticateWallet, verifyWalletOwnership } from '@/lib/auth';
import Chat from '@/models/Chat';
import Message from '@/models/Message';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/chats/[id]
 * Fetch specific chat with all messages for authenticated user
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const walletAddress = authenticateWallet(request);
    const { id: chatId } = await params;

    await connectDB();

    // Find chat and verify ownership
    const chat = await Chat.findById(chatId).lean();

    if (!chat) {
      return Response.json(
        { success: false, error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Verify wallet ownership
    if (!verifyWalletOwnership(walletAddress, chat.walletAddress)) {
      return Response.json(
        { success: false, error: 'Unauthorized access to chat' },
        { status: 403 }
      );
    }

    // Fetch messages for this chat
    const messages = await Message.find({ chatId: chat._id })
      .sort({ createdAt: 1 })
      .select('_id text isUser type data createdAt updatedAt')
      .lean();

    return Response.json({
      success: true,
      chat: {
        id: chat._id.toString(),
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        lastMessageAt: chat.lastMessageAt,
        messages: messages.map(msg => ({
          id: msg._id.toString(),
          text: msg.text,
          isUser: msg.isUser,
          type: msg.type,
          data: msg.data,
          timestamp: msg.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('[GET /api/chats/[id]] Error:', error);

    if (error instanceof Error && error.message.includes('Wallet')) {
      return Response.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    return Response.json(
      { success: false, error: 'Failed to fetch chat' },
      { status: 500 }
    );
  }
}
