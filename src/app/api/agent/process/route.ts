/**
 * Agent Process API
 * Processes user messages using FlowSense AI Agent
 */

import { NextRequest } from 'next/server';
import { authenticateWallet } from '@/lib/auth';
import { createAgentFromEnv, Message } from '../../../../../agent';
import { connectDB } from '@/lib/mongodb';
import MessageModel from '@/models/Message';

/**
 * POST /api/agent/process
 * Process user message with AI agent
 */
export async function POST(request: NextRequest) {
  try {
    const walletAddress = authenticateWallet(request);
    const body = await request.json();

    const { message, chatId } = body;

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return Response.json(
        { success: false, error: 'Missing required field: message' },
        { status: 400 }
      );
    }

    // Validate message length
    if (message.length > 5000) {
      return Response.json(
        { success: false, error: 'Message too long (max 5000 characters)' },
        { status: 400 }
      );
    }

    // Load previous messages from database if chatId is provided
    let previousMessages: Message[] = [];
    if (chatId) {
      await connectDB();
      const dbMessages = await MessageModel.find({ chatId })
        .sort({ createdAt: 1 })
        .limit(10)
        .lean();

      // Convert database messages to agent Message format
      previousMessages = dbMessages.map(msg => ({
        role: msg.isUser ? ('user' as const) : ('assistant' as const),
        content: msg.text,
        timestamp: msg.createdAt.getTime(),
      }));
    }

    // Create agent instance
    const agent = createAgentFromEnv();

    // Process message with previous context
    const result = await agent.processMessage(
      message,
      walletAddress,
      undefined, // Don't use conversationId
      previousMessages // Pass previous messages for context
    );

    console.log('[POST /api/agent/process] Processed message:', {
      wallet: walletAddress,
      intent: result.intent.type,
      chatId,
      previousMessagesCount: previousMessages.length,
    });

    return Response.json({
      success: true,
      data: {
        intent: result.intent,
        response: result.response,
        toolCalls: result.toolCalls,
      }
    }, { status: 200 });

  } catch (error) {
    console.error('[POST /api/agent/process] Error:', error);

    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('Wallet')) {
        return Response.json(
          { success: false, error: error.message },
          { status: 401 }
        );
      }

      if (error.message.includes('API key')) {
        return Response.json(
          { success: false, error: 'AI service configuration error' },
          { status: 500 }
        );
      }

      if (error.message.includes('rate limit')) {
        return Response.json(
          { success: false, error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return Response.json(
      { success: false, error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
