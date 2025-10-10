/**
 * Chat API Client
 * Handles all database operations for chats and messages
 * Requires wallet address for authenticated requests
 */

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'text' | 'transaction_preview' | 'transaction_status' | 'transaction_result' | 'error';
  data?: unknown;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt?: Date;
  lastMessageAt?: Date;
}

export interface ChatListItem {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt?: Date;
  lastMessageAt?: Date;
}

class ChatAPIService {
  /**
   * Make authenticated API request
   */
  private async authenticatedFetch(
    url: string,
    options: RequestInit = {},
    walletAddress?: string
  ): Promise<Response> {
    // Get wallet address from parameter or throw error
    if (!walletAddress) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': walletAddress,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response;
  }

  /**
   * Fetch all chats for current user
   */
  async fetchChats(walletAddress: string): Promise<ChatListItem[]> {
    try {
      const response = await this.authenticatedFetch('/api/chats', {}, walletAddress);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch chats');
      }

      return data.chats.map((chat: ChatListItem) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
        updatedAt: chat.updatedAt ? new Date(chat.updatedAt) : undefined,
        lastMessageAt: chat.lastMessageAt ? new Date(chat.lastMessageAt) : undefined
      }));
    } catch (error) {
      console.error('[ChatAPI] Fetch chats failed:', error);
      throw error;
    }
  }

  /**
   * Create a new chat
   */
  async createChat(walletAddress: string, title: string = 'New Chat'): Promise<Chat> {
    try {
      const response = await this.authenticatedFetch('/api/chats', {
        method: 'POST',
        body: JSON.stringify({ title }),
      }, walletAddress);

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create chat');
      }

      return {
        ...data.chat,
        createdAt: new Date(data.chat.createdAt),
        updatedAt: data.chat.updatedAt ? new Date(data.chat.updatedAt) : undefined,
        lastMessageAt: data.chat.lastMessageAt ? new Date(data.chat.lastMessageAt) : undefined
      };
    } catch (error) {
      console.error('[ChatAPI] Create chat failed:', error);
      throw error;
    }
  }

  /**
   * Fetch specific chat with messages
   */
  async fetchChat(walletAddress: string, chatId: string): Promise<Chat> {
    try {
      const response = await this.authenticatedFetch(`/api/chats/${chatId}`, {}, walletAddress);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch chat');
      }

      return {
        ...data.chat,
        createdAt: new Date(data.chat.createdAt),
        updatedAt: data.chat.updatedAt ? new Date(data.chat.updatedAt) : undefined,
        lastMessageAt: data.chat.lastMessageAt ? new Date(data.chat.lastMessageAt) : undefined,
        messages: data.chat.messages.map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      };
    } catch (error) {
      console.error('[ChatAPI] Fetch chat failed:', error);
      throw error;
    }
  }

  /**
   * Add message to chat
   */
  async addMessage(
    walletAddress: string,
    chatId: string,
    text: string,
    isUser: boolean,
    type: Message['type'] = 'text',
    data: unknown = null
  ): Promise<Message> {
    try {
      const response = await this.authenticatedFetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text, isUser, type, data }),
      }, walletAddress);

      const responseData = await response.json();

      if (!responseData.success) {
        throw new Error(responseData.error || 'Failed to add message');
      }

      return {
        ...responseData.message,
        timestamp: new Date(responseData.message.timestamp)
      };
    } catch (error) {
      console.error('[ChatAPI] Add message failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const chatAPI = new ChatAPIService();
