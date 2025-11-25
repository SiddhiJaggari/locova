// utils/emailValidation.ts

/**
 * Comprehensive email validation utility to prevent bounces
 */
export class EmailValidator {
  // List of known disposable/temporary email domains
  private static readonly BLOCKED_DOMAINS = [
    'tempmail.org', '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
    'yopmail.com', 'throwaway.email', 'temp-mail.org', 'fakeemail.com',
    'maildrop.cc', 'ephemeral.email', 'discard.email', 'mailnull.com',
    'tempmailaddress.com', 'anonymbox.com', 'tempmail.plus', 'yopmail.fr'
  ];

  // Common typos in email domains
  private static readonly COMMON_TYPOS: { [key: string]: string } = {
    'gmial.com': 'gmail.com',
    'gamil.com': 'gmail.com',
    'gmail.co': 'gmail.com',
    'yahooo.com': 'yahoo.com',
    'yahho.com': 'yahoo.com',
    'outlok.com': 'outlook.com',
    'hotmial.com': 'hotmail.com',
    'hotmai.com': 'hotmail.com'
  };

  /**
   * Basic email format validation
   */
  private static isValidFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if email domain is blocked (disposable/temporary)
   */
  private static isDomainBlocked(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase() || '';
    return this.BLOCKED_DOMAINS.some(blocked => domain.includes(blocked));
  }

  /**
   * Suggest corrections for common typos
   */
  private static suggestCorrection(email: string): string | null {
    const domain = email.split('@')[1]?.toLowerCase() || '';
    return this.COMMON_TYPOS[domain] || null;
  }

  /**
   * Check if email has reasonable length and structure
   */
  private static hasValidStructure(email: string): boolean {
    const [localPart, domain] = email.split('@');
    
    if (!localPart || !domain) return false;
    if (localPart.length < 1 || localPart.length > 64) return false;
    if (domain.length < 4 || domain.length > 253) return false;
    if (email.length < 6 || email.length > 320) return false;
    
    return true;
  }

  /**
   * Comprehensive email validation
   */
  public static validate(email: string): {
    isValid: boolean;
    error?: string;
    suggestion?: string;
  } {
    if (!email || !email.trim()) {
      return { isValid: false, error: 'Email is required' };
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (!this.hasValidStructure(trimmedEmail)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    if (!this.isValidFormat(trimmedEmail)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    if (this.isDomainBlocked(trimmedEmail)) {
      return { 
        isValid: false, 
        error: 'Temporary or disposable email services are not allowed' 
      };
    }

    // Check for common typos and suggest corrections
    const suggestion = this.suggestCorrection(trimmedEmail);
    if (suggestion) {
      const [localPart] = trimmedEmail.split('@');
      return { 
        isValid: false, 
        error: 'Did you mean a different email domain?', 
        suggestion: `${localPart}@${suggestion}`
      };
    }

    return { isValid: true };
  }

  /**
   * Simple validation for less critical checks
   */
  public static isValid(email: string): boolean {
    return this.validate(email).isValid;
  }

  /**
   * Get list of blocked domains for documentation
   */
  public static getBlockedDomains(): string[] {
    return [...this.BLOCKED_DOMAINS];
  }
}
