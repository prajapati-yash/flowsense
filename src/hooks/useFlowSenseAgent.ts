// FlowSense AI Agent Hook
// React hook for AI agent functionality

import { useState, useCallback } from 'react';
import { flowSenseParser, ParsedIntent } from '@/services/nlp-parser';
import { flowSenseRouter, TransactionPlan, RoutingResult } from '@/services/transaction-router';
import { flowTransactionService, TransactionResult, TransactionStatus } from '@/services/flow-transactions';

export interface AgentState {
  isProcessing: boolean;
  currentStep: 'idle' | 'parsing' | 'routing' | 'previewing' | 'executing' | 'completed';
  parsedIntent?: ParsedIntent;
  transactionPlan?: TransactionPlan;
  transactionResult?: TransactionResult;
  transactionStatus?: TransactionStatus;
  error?: string;
}

export interface AgentResponse {
  type: 'text' | 'transaction_preview' | 'transaction_status' | 'transaction_result' | 'error';
  content: string;
  data?: TransactionPlan | TransactionResult | unknown;
  timestamp: Date;
}

export const useFlowSenseAgent = () => {
  const [agentState, setAgentState] = useState<AgentState>({
    isProcessing: false,
    currentStep: 'idle'
  });

  const resetAgent = useCallback(() => {
    setAgentState({
      isProcessing: false,
      currentStep: 'idle'
    });
  }, []);

  const generateGreetingResponse = useCallback((intent: ParsedIntent): AgentResponse => {
    const responses = {
      hello: [
        "👋 Hello there! I'm your FlowSense AI assistant.",
        "",
        "I'm here to help you with Flow blockchain transactions using natural language.",
        "",
        "✨ **What I can do:**",
        "• Transfer FLOW tokens to any address",
        "• Schedule payments for later execution",
        "• Understand requests like 'Send 10 FLOW to 0x123abc...'",
        "• Help with immediate or scheduled transactions",
        "",
        "🚀 **Try saying:**",
        "• 'Transfer 5 FLOW to 0x123abc456def7890'",
        "• 'Send 10 FLOW to Alice in 30 minutes'",
        "• 'Pay 50 FLOW to 0x456def immediately'",
        "",
        "How can I help you today?"
      ],

      goodbye: [
        "👋 Goodbye! Thanks for using FlowSense.",
        "",
        "Remember, I'm always here when you need help with Flow transactions.",
        "",
        "Have a great day! 🌟"
      ],

      how_are_you: [
        "😊 I'm doing great, thank you for asking!",
        "",
        "I'm ready and excited to help you with Flow blockchain transactions.",
        "",
        "💪 **I'm currently:**",
        "• Connected to Flow Testnet",
        "• Ready to process FLOW transfers",
        "• Monitoring transaction status in real-time",
        "• Learning from every interaction",
        "",
        "How are you doing? What can I help you with today?"
      ],

      help: [
        "🤖 **FlowSense AI Assistant Help**",
        "",
        "I'm your intelligent assistant for Flow blockchain transactions. Here's how I work:",
        "",
        "📝 **Natural Language Commands:**",
        "• 'Transfer [amount] FLOW to [address]'",
        "• 'Send [amount] to [address] [timing]'",
        "• 'Pay [amount] FLOW to [address]'",
        "",
        "⏰ **Timing Options:**",
        "• Immediate: 'now', 'immediately', 'right now'",
        "• Scheduled: 'in 5 minutes', 'tomorrow', 'later'",
        "",
        "💡 **Examples:**",
        "• 'Transfer 10 FLOW to 0x123abc456def7890'",
        "• 'Send 5.5 FLOW to 0xa1f95a488eb7e202 immediately'",
        "• 'Pay 100 FLOW to 0x456def in 30 minutes'",
        "",
        "🔧 **Features:**",
        "• Transaction previews before execution",
        "• Real-time status updates",
        "• Flow blockchain explorer links",
        "• Comprehensive error handling",
        "",
        "Just type what you want to do in plain English!"
      ],

      general: [
        "😊 Thank you!",
        "",
        "Is there anything else I can help you with?",
        "",
        "I'm here to assist with Flow blockchain transactions whenever you need!"
      ]
    };

    const greetingType = intent.greetingType || 'hello';
    const responseContent = responses[greetingType] || responses.hello;

    return {
      type: 'text',
      content: responseContent.join('\n'),
      timestamp: new Date()
    };
  }, []);

  const processUserInput = useCallback(async (input: string): Promise<AgentResponse> => {
    try {
      setAgentState(prev => ({
        ...prev,
        isProcessing: true,
        currentStep: 'parsing',
        error: undefined
      }));

      // Step 1: Parse natural language
      const parsedIntent = flowSenseParser.parseUserInput(input);

      setAgentState(prev => ({
        ...prev,
        parsedIntent,
        currentStep: 'routing'
      }));

      // Check if intent is valid enough
      if (parsedIntent.confidence < 50 || parsedIntent.errors.length > 0) {
        setAgentState(prev => ({
          ...prev,
          isProcessing: false,
          currentStep: 'idle',
          error: 'Low confidence parsing'
        }));

        const suggestions = flowSenseParser.getSuggestions(parsedIntent);
        return {
          type: 'error',
          content: [
            "I'm having trouble understanding your request. Here's what I noticed:",
            '',
            ...parsedIntent.errors,
            '',
            "Here are some examples:",
            ...suggestions
          ].join('\n'),
          timestamp: new Date()
        };
      }

      // Step 2: Handle greetings and help requests
      if (parsedIntent.action === 'greeting' || parsedIntent.action === 'help') {
        setAgentState(prev => ({
          ...prev,
          isProcessing: false,
          currentStep: 'idle'
        }));

        return generateGreetingResponse(parsedIntent);
      }

      // Step 3: Route to transaction plan
      const routingResult: RoutingResult = flowSenseRouter.routeIntent(parsedIntent);

      if (!routingResult.success || !routingResult.plan) {
        setAgentState(prev => ({
          ...prev,
          isProcessing: false,
          currentStep: 'idle',
          error: 'Routing failed'
        }));

        return {
          type: 'error',
          content: [
            "I couldn't create a transaction plan:",
            '',
            ...routingResult.errors,
            '',
            "Please check your input and try again."
          ].join('\n'),
          timestamp: new Date()
        };
      }

      setAgentState(prev => ({
        ...prev,
        transactionPlan: routingResult.plan,
        currentStep: 'previewing',
        isProcessing: false
      }));

      // Step 3: Return transaction preview
      const warningText = routingResult.warnings.length > 0
        ? '\n\n⚠️ Warnings:\n' + routingResult.warnings.join('\n')
        : '';

      return {
        type: 'transaction_preview',
        content: [
          "I've analyzed your request and prepared a transaction:",
          '',
          flowSenseRouter.formatTransactionPreview(routingResult.plan!),
          warningText,
          '',
          "Please review the details and confirm to proceed."
        ].join('\n'),
        data: routingResult.plan,
        timestamp: new Date()
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setAgentState(prev => ({
        ...prev,
        isProcessing: false,
        currentStep: 'idle',
        error: errorMessage
      }));

      return {
        type: 'error',
        content: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date()
      };
    }
  }, [generateGreetingResponse]);

  const executeTransaction = useCallback(async (plan: TransactionPlan): Promise<AgentResponse> => {
    try {
      setAgentState(prev => ({
        ...prev,
        isProcessing: true,
        currentStep: 'executing'
      }));

      // Start transaction execution
      const result = await flowTransactionService.executeTransaction(plan);

      setAgentState(prev => ({
        ...prev,
        transactionResult: result,
        currentStep: 'completed',
        isProcessing: false
      }));

      if (result.success) {
        return {
          type: 'transaction_result',
          content: [
            "🎉 Transaction completed successfully!",
            '',
            result.message,
            '',
            result.explorerUrl ? `🔗 View on Explorer: ${result.explorerUrl}` : ''
          ].join('\n'),
          data: result,
          timestamp: new Date()
        };
      } else {
        return {
          type: 'transaction_result',
          content: [
            "❌ Transaction failed:",
            '',
            result.message,
            '',
            "Please check your wallet and try again."
          ].join('\n'),
          data: result,
          timestamp: new Date()
        };
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setAgentState(prev => ({
        ...prev,
        isProcessing: false,
        currentStep: 'idle',
        error: errorMessage
      }));

      return {
        type: 'error',
        content: `Transaction execution failed: ${errorMessage}`,
        timestamp: new Date()
      };
    }
  }, []);

  const getAgentIntroduction = useCallback((): AgentResponse => {
    return {
      type: 'text',
      content: [
        "👋 Hi! I'm your FlowSense AI agent.",
        '',
        "I can help you transfer FLOW tokens using natural language. Just tell me what you want to do!",
        '',
        "Examples:",
        "• 'Transfer 10 FLOW to 0x123abc456def7890'",
        "• 'Send 5.5 FLOW to 0xa1f95a488eb7e202 immediately'",
        "• 'Pay 100 FLOW to 0x456 in 5 minutes'",
        '',
        "I'll understand your intent, validate it, and help you execute the transaction safely."
      ].join('\n'),
      timestamp: new Date()
    };
  }, []);

  const getCurrentStatus = useCallback((): string => {
    switch (agentState.currentStep) {
      case 'parsing':
        return 'Understanding your request...';
      case 'routing':
        return 'Creating transaction plan...';
      case 'previewing':
        return 'Ready for review';
      case 'executing':
        return 'Executing transaction...';
      case 'completed':
        return 'Complete';
      default:
        return 'Ready';
    }
  }, [agentState.currentStep]);

  const getStepProgress = useCallback((): number => {
    switch (agentState.currentStep) {
      case 'parsing': return 20;
      case 'routing': return 40;
      case 'previewing': return 60;
      case 'executing': return 80;
      case 'completed': return 100;
      default: return 0;
    }
  }, [agentState.currentStep]);

  // Helper function to validate user wallet connection
  const validateWalletConnection = useCallback(async (): Promise<{ connected: boolean; message?: string }> => {
    try {
      const balance = await flowTransactionService.getUserBalance();

      if (balance === null) {
        return {
          connected: false,
          message: "Please connect your wallet to continue"
        };
      }

      if (parseFloat(balance) < 0.1) {
        return {
          connected: true,
          message: "⚠️ Low FLOW balance. You may need more FLOW for transactions and gas fees."
        };
      }

      return { connected: true };
    } catch {
      return {
        connected: false,
        message: "Unable to verify wallet connection"
      };
    }
  }, []);

  return {
    agentState,
    processUserInput,
    executeTransaction,
    resetAgent,
    getAgentIntroduction,
    getCurrentStatus,
    getStepProgress,
    validateWalletConnection
  };
};