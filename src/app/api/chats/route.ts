import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { authenticateWallet } from '@/lib/auth';
import User from '@/models/User';
import Chat from '@/models/Chat';
import Message from '@/models/Message';

/**
 * GET /api/chats
 * Fetch all chats for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const walletAddress = authenticateWallet(request);

    await connectDB();

    // Find all chats for this wallet, sorted by most recent
    const chats = await Chat.find({ walletAddress })
      .sort({ updatedAt: -1 })
      .select('_id title createdAt updatedAt lastMessageAt')
      .lean();

    return Response.json({
      success: true,
      chats: chats.map(chat => ({
        id: chat._id.toString(),
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        lastMessageAt: chat.lastMessageAt
      }))
    });

  } catch (error) {
    console.error('[GET /api/chats] Error:', error);

    if (error instanceof Error && error.message.includes('Wallet')) {
      return Response.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    return Response.json(
      { success: false, error: 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chats
 * Create a new chat for authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const walletAddress = authenticateWallet(request);
    const body = await request.json();

    const { title = 'New Chat' } = body;

    await connectDB();

    // Find or create user
    let user = await User.findOne({ walletAddress });

    if (!user) {
      user = await User.create({
        walletAddress,
        lastLogin: new Date()
      });
      console.log('[POST /api/chats] Created new user:', walletAddress);
    } else {
      // Update last login
      user.lastLogin = new Date();
      await user.save();
    }

    // Create new chat
    const chat = await Chat.create({
      userId: user._id,
      walletAddress,
      title: title.slice(0, 200), // Limit title length
      lastMessageAt: null
    });

    console.log('[POST /api/chats] Created new chat:', chat._id);

    return Response.json({
      success: true,
      chat: {
        id: chat._id.toString(),
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        lastMessageAt: chat.lastMessageAt,
        messages: []
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[POST /api/chats] Error:', error);

    if (error instanceof Error && error.message.includes('Wallet')) {
      return Response.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    return Response.json(
      { success: false, error: 'Failed to create chat' },
      { status: 500 }
    );
  }
}
