import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { authenticateWallet, verifyWalletOwnership } from '@/lib/auth';
import Chat from '@/models/Chat';
import Message, { MessageType } from '@/models/Message';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/chats/[id]/messages
 * Add a new message to the chat
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const walletAddress = authenticateWallet(request);
    const { id: chatId } = await params;
    const body = await request.json();

    const { text, isUser, type = 'text', data = null } = body;

    // Validate required fields
    if (!text || typeof isUser !== 'boolean') {
      return Response.json(
        { success: false, error: 'Missing required fields: text, isUser' },
        { status: 400 }
      );
    }

    // Validate message type
    const validTypes: MessageType[] = ['text', 'transaction_preview', 'transaction_status', 'transaction_result', 'error'];
    if (!validTypes.includes(type)) {
      return Response.json(
        { success: false, error: 'Invalid message type' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find chat and verify ownership
    const chat = await Chat.findById(chatId);

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

    // Create message
    const message = await Message.create({
      chatId: chat._id,
      walletAddress,
      text: text.slice(0, 5000), // Limit text length
      isUser,
      type,
      data
    });

    // Update chat's lastMessageAt and title if first message
    chat.lastMessageAt = message.createdAt;

    // Update chat title from first user message
    const messageCount = await Message.countDocuments({ chatId: chat._id });
    if (messageCount === 1 && isUser) {
      chat.title = text.slice(0, 30) + (text.length > 30 ? '...' : '');
    }

    await chat.save();

    console.log('[POST /api/chats/[id]/messages] Added message to chat:', chatId);

    return Response.json({
      success: true,
      message: {
        id: message._id.toString(),
        text: message.text,
        isUser: message.isUser,
        type: message.type,
        data: message.data,
        timestamp: message.createdAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[POST /api/chats/[id]/messages] Error:', error);

    if (error instanceof Error && error.message.includes('Wallet')) {
      return Response.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    return Response.json(
      { success: false, error: 'Failed to add message' },
      { status: 500 }
    );
  }
}
