// FlowSense Natural Language Parser
// Converts user inputs like "Transfer 10 FLOW to 0x123" into structured intents

export interface ParsedIntent {
  action: 'transfer' | 'schedule' | 'greeting' | 'help' | 'unknown';
  amount?: number;
  recipient?: string;
  timing?: 'immediate' | 'scheduled';
  scheduleTime?: Date;
  confidence: number;
  originalInput: string;
  errors: string[];
  greetingType?: 'help' | 'hello' | 'goodbye' | 'how_are_you' | 'general';
}

export class FlowSenseNLPParser {

  // Action keywords that indicate transfer intent
  private transferKeywords = [
    'transfer', 'send', 'pay', 'move', 'give', 'deposit'
  ];

  // Timing keywords for scheduling
  private immediateKeywords = [
    'now', 'immediately', 'right now', 'asap', 'instant'
  ];

  private scheduledKeywords = [
    'later', 'tomorrow', 'minute', 'hour', 'day', 'week'
  ];

  // Greeting keywords
  private helloKeywords = [
    'hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon',
    'good evening', 'good day', 'hola', 'howdy', 'sup', 'what\'s up'
  ];

  private goodbyeKeywords = [
    'goodbye', 'bye', 'see you', 'farewell', 'take care', 'catch you later',
    'later', 'peace', 'see ya', 'adios', 'ciao', 'cheerio'
  ];

  private howAreYouKeywords = [
    'how are you', 'how\'s it going', 'how do you do', 'what\'s up',
    'how have you been', 'how are things', 'what\'s new'
  ];

  private helpKeywords = [
    'help', 'how do i', 'what can you do', 'commands', 'instructions',
    'guide', 'tutorial', 'how to', 'what is', 'explain'
  ];

  public parseUserInput(input: string): ParsedIntent {
    const intent: ParsedIntent = {
      action: 'unknown',
      confidence: 0,
      originalInput: input,
      errors: []
    };

    try {
      const normalizedInput = input.toLowerCase().trim();

      // 1. Check for greetings first
      const greetingResult = this.detectGreeting(normalizedInput);
      if (greetingResult.isGreeting) {
        intent.action = greetingResult.type === 'help' ? 'help' : 'greeting';
        intent.greetingType = greetingResult.type;
        intent.confidence = 95;
        return intent;
      }

      // 2. Detect transfer action
      const hasTransferAction = this.detectTransferAction(normalizedInput);
      if (!hasTransferAction) {
        intent.errors.push("I don't understand this action. Try: 'Transfer 10 FLOW to 0x123'");
        return intent;
      }

      intent.action = 'transfer';

      // 2. Extract amount
      const amount = this.extractAmount(normalizedInput);
      if (amount) {
        intent.amount = amount;
      } else {
        intent.errors.push("Please specify an amount (e.g., '10 FLOW' or '5.5 FLOW')");
      }

      // 3. Extract recipient address
      const recipient = this.extractRecipient(normalizedInput);
      if (recipient) {
        intent.recipient = recipient;
      } else {
        intent.errors.push("Please provide a valid Flow address (e.g., '0x123abc...')");
      }

      // 4. Detect timing
      const timing = this.detectTiming(normalizedInput);
      intent.timing = timing.mode;
      intent.scheduleTime = timing.scheduleTime;

      // 5. Calculate confidence score
      intent.confidence = this.calculateConfidence(intent);

      // 6. Determine if this should be scheduled or immediate
      if (intent.timing === 'scheduled' || timing.scheduleTime) {
        intent.action = 'schedule';
      }

      return intent;

    } catch (error) {
      intent.errors.push("Sorry, I couldn't understand your request. Please try again.");
      return intent;
    }
  }

  private detectGreeting(input: string): { isGreeting: boolean; type?: 'hello' | 'goodbye' | 'how_are_you' | 'help' | 'general' } {
    // Check for help requests
    if (this.helpKeywords.some(keyword => input.includes(keyword))) {
      return { isGreeting: true, type: 'help' };
    }

    // Check for "how are you" patterns
    if (this.howAreYouKeywords.some(keyword => input.includes(keyword))) {
      return { isGreeting: true, type: 'how_are_you' };
    }

    // Check for hello greetings
    if (this.helloKeywords.some(keyword => input.includes(keyword))) {
      return { isGreeting: true, type: 'hello' };
    }

    // Check for goodbye greetings
    if (this.goodbyeKeywords.some(keyword => input.includes(keyword))) {
      return { isGreeting: true, type: 'goodbye' };
    }

    // Check for general conversational inputs (short, no transfer keywords)
    if (input.length < 20 && !this.transferKeywords.some(keyword => input.includes(keyword))) {
      const commonGreetings = ['thanks', 'thank you', 'ok', 'okay', 'cool', 'nice', 'awesome', 'great'];
      if (commonGreetings.some(keyword => input.includes(keyword))) {
        return { isGreeting: true, type: 'general' };
      }
    }

    return { isGreeting: false };
  }

  private detectTransferAction(input: string): boolean {
    return this.transferKeywords.some(keyword =>
      input.includes(keyword)
    );
  }

  private extractAmount(input: string): number | undefined {
    // Patterns: "10 FLOW", "5.5 flow", "100 Flow", "0.1FLOW"
    const amountPatterns = [
      /(\d+\.?\d*)\s*flow/i,
      /(\d+\.?\d*)\s*FLOW/,
      /flow\s*(\d+\.?\d*)/i,
      /(\d+\.?\d*)/  // fallback for just numbers
    ];

    for (const pattern of amountPatterns) {
      const match = input.match(pattern);
      if (match) {
        const amount = parseFloat(match[1]);

        // Enhanced validation
        if (isNaN(amount)) {
          continue; // Skip invalid numbers
        }

        if (amount <= 0) {
          continue; // Skip zero or negative amounts
        }

        // Temporarily disabled for testing
        // if (amount > 10000000) {
        //   continue; // Skip amounts exceeding maximum (10M FLOW)
        // }

        // Check for reasonable decimal precision (Flow supports up to 8 decimal places)
        const decimalPlaces = (amount.toString().split('.')[1] || '').length;
        if (decimalPlaces > 8) {
          continue; // Skip amounts with too many decimal places
        }

        return amount;
      }
    }

    return undefined;
  }

  private extractRecipient(input: string): string | undefined {
    // Flow address patterns: 0x followed by hex characters
    const addressPatterns = [
      /0x[a-fA-F0-9]{16}/g,  // Standard Flow address (16 hex chars)
      /0x[a-fA-F0-9]{8,}/g   // Flexible length for partial addresses
    ];

    for (const pattern of addressPatterns) {
      const matches = input.match(pattern);
      if (matches && matches.length > 0) {
        const address = matches[0];

        // Validate address format
        if (this.isValidFlowAddress(address)) {
          return address;
        }
      }
    }

    return undefined;
  }

  private isValidFlowAddress(address: string): boolean {
    // Basic Flow address validation
    if (!address || typeof address !== 'string') {
      return false;
    }

    // Must start with 0x
    if (!address.startsWith('0x')) {
      return false;
    }

    // Remove 0x prefix for validation
    const hexPart = address.slice(2);

    // Must be valid hexadecimal
    if (!/^[a-fA-F0-9]+$/.test(hexPart)) {
      return false;
    }

    // Flow addresses should be 8 bytes (16 hex characters) for mainnet/testnet
    // But we allow flexibility for development
    if (hexPart.length < 8 || hexPart.length > 16) {
      return false;
    }

    return true;
  }

  private detectTiming(input: string): { mode: 'immediate' | 'scheduled', scheduleTime?: Date } {
    // Check for immediate keywords
    const hasImmediate = this.immediateKeywords.some(keyword =>
      input.includes(keyword)
    );

    if (hasImmediate) {
      return { mode: 'immediate' };
    }

    // Check for scheduled keywords and extract timing
    const scheduleTime = this.extractScheduleTime(input);
    if (scheduleTime) {
      return { mode: 'scheduled', scheduleTime };
    }

    // Default to immediate if no timing specified
    return { mode: 'immediate' };
  }

  private extractScheduleTime(input: string): Date | undefined {
    const now = new Date();

    // Tomorrow
    if (input.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow
      return tomorrow;
    }

    // Enhanced patterns for minutes - handles both "in X minutes" and "after X minutes"
    const minuteMatch = input.match(/(in|after)\s+(\d+)\s+(minutes?|mins?)/i);
    if (minuteMatch) {
      const minutes = parseInt(minuteMatch[2]);
      const futureTime = new Date(now.getTime() + minutes * 60 * 1000);
      return futureTime;
    }

    // Enhanced patterns for hours - handles both "in X hours" and "after X hours"
    const hourMatch = input.match(/(in|after)\s+(\d+)\s+(hours?|hrs?)/i);
    if (hourMatch) {
      const hours = parseInt(hourMatch[2]);
      const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
      return futureTime;
    }

    // Enhanced patterns for days - handles both "in X days" and "after X days"
    const dayMatch = input.match(/(in|after)\s+(\d+)\s+days?/i);
    if (dayMatch) {
      const days = parseInt(dayMatch[2]);
      const futureTime = new Date(now);
      futureTime.setDate(futureTime.getDate() + days);
      return futureTime;
    }

    // Handle "X minutes" or "X mins" without "in/after" prefix
    const simpleMinuteMatch = input.match(/(\d+)\s+(minutes?|mins?)/i);
    if (simpleMinuteMatch && !input.includes('in') && !input.includes('after')) {
      const minutes = parseInt(simpleMinuteMatch[1]);
      const futureTime = new Date(now.getTime() + minutes * 60 * 1000);
      return futureTime;
    }

    // General "later" keyword - defaults to 1 hour from now
    if (input.includes('later') && !minuteMatch && !hourMatch && !dayMatch) {
      const futureTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
      return futureTime;
    }

    return undefined;
  }

  private calculateConfidence(intent: ParsedIntent): number {
    let confidence = 0;

    // Base confidence for recognized action
    if (intent.action !== 'unknown') confidence += 30;

    // Amount confidence
    if (intent.amount && intent.amount > 0) confidence += 25;

    // Recipient confidence
    if (intent.recipient && this.isValidFlowAddress(intent.recipient)) confidence += 25;

    // Timing confidence
    if (intent.timing) confidence += 20;

    // Reduce confidence for errors
    confidence -= intent.errors.length * 15;

    return Math.max(0, Math.min(100, confidence));
  }


  // Helper method to suggest improvements for low-confidence intents
  public getSuggestions(intent: ParsedIntent): string[] {
    const suggestions: string[] = [];

    if (intent.confidence < 50) {
      suggestions.push("💡 Try: 'Transfer 10 FLOW to 0x123abc456def7890'");
      suggestions.push("💡 Try: 'Send 5.5 FLOW to 0xa1f95a488eb7e202 immediately'");
      suggestions.push("💡 Try: 'Pay 100 FLOW to 0x456 in 5 minutes'");
    }

    if (!intent.amount) {
      suggestions.push("📝 Please specify an amount like '10 FLOW'");
    }

    if (!intent.recipient) {
      suggestions.push("📝 Please provide a Flow address like '0x123abc...'");
    }

    return suggestions;
  }

  // Test method for debugging
  public testParser(): void {
    const testInputs = [
      "Transfer 10 FLOW to 0x123abc456def7890",
      "Send 5.5 FLOW to 0xa1f95a488eb7e202 immediately",
      "Pay 100 FLOW to 0x456 in 5 minutes",
      "Move 50 FLOW to 0x789 tomorrow",
      "Give 1.5 flow to 0x9c23faae746705fe now",
      "invalid input test"
    ];

    console.log("🧪 Testing FlowSense NLP Parser:");
    testInputs.forEach(input => {
      const result = this.parseUserInput(input);
      console.log(`Input: "${input}"`);
      console.log(`Result:`, result);
      console.log('---');
    });
  }
}

// Export singleton instance
export const flowSenseParser = new FlowSenseNLPParser();