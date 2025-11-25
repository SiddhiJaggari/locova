// utils/passwordReset.ts
import { supabase } from '../lib/supabase';
import { EmailValidator } from './emailValidation';

/**
 * Comprehensive password reset utility with security measures
 */
export class PasswordResetService {
  // Rate limiting configuration
  private static readonly RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_ATTEMPTS_PER_WINDOW = 3;
  private static readonly RESET_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  
  // In-memory rate limiting (in production, use Redis or database)
  private static readonly resetAttempts = new Map<string, { count: number; lastAttempt: number }>();

  /**
   * Validates email and initiates password reset
   */
  public static async requestPasswordReset(email: string): Promise<{
    success: boolean;
    message: string;
    requiresAction?: boolean;
  }> {
    // 1. Input validation
    if (!email || !email.trim()) {
      return {
        success: false,
        message: 'Email address is required.'
      };
    }

    // 2. Advanced email validation
    const emailValidation = EmailValidator.validate(email);
    if (!emailValidation.isValid) {
      let message = emailValidation.error || 'Invalid email address';
      if (emailValidation.suggestion) {
        message += `\n\nDid you mean: ${emailValidation.suggestion}?`;
      }
      return {
        success: false,
        message
      };
    }

    // 3. Rate limiting check
    const normalizedEmail = email.trim().toLowerCase();
    if (this.isRateLimited(normalizedEmail)) {
      return {
        success: false,
        message: 'Too many reset attempts. Please wait a few minutes before trying again.'
      };
    }

    // 4. Record attempt for rate limiting
    this.recordAttempt(normalizedEmail);

    try {
      // 5. Initiate password reset with Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: undefined, // Manual handling for security
      });

      if (error) {
        // Handle specific Supabase errors
        if (error.message?.includes('over_email_rate_limit')) {
          return {
            success: false,
            message: 'Too many requests. Please wait a few minutes before trying again.'
          };
        } else if (error.message?.includes('User not found')) {
          // Security: Don't reveal if user exists
          console.log(`Password reset requested for non-existent email: ${normalizedEmail}`);
          return {
            success: true,
            message: 'If an account exists with this email, you will receive password reset instructions.'
          };
        } else {
          throw error;
        }
      }

      // 6. Success (always show success for security)
      console.log(`Password reset email sent to: ${normalizedEmail}`);
      return {
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.'
      };

    } catch (error: any) {
      console.error('Password reset error:', error);
      return {
        success: false,
        message: 'Unable to send reset email. Please check your email address and try again.',
        requiresAction: true
      };
    }
  }

  /**
   * Validates new password strength
   */
  public static validatePasswordStrength(password: string): {
    isValid: boolean;
    strength: 'weak' | 'medium' | 'strong';
    errors: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let strength: 'weak' | 'medium' | 'strong' = 'weak';

    // Length check
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
      suggestions.push('Use a longer password');
    } else if (password.length >= 12) {
      strength = 'medium';
      if (password.length >= 16) {
        strength = 'strong';
      }
    }

    // Character variety checks
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase) {
      errors.push('Include uppercase letters');
      suggestions.push('Add uppercase letters (A-Z)');
    }
    if (!hasLowerCase) {
      errors.push('Include lowercase letters');
      suggestions.push('Add lowercase letters (a-z)');
    }
    if (!hasNumbers) {
      errors.push('Include numbers');
      suggestions.push('Add numbers (0-9)');
    }
    if (!hasSpecialChar) {
      errors.push('Include special characters');
      suggestions.push('Add special characters (!@#$%^&*)');
    }

    // Common password check
    const commonPasswords = [
      'password', '123456', 'qwerty', 'abc123', 'password123',
      'admin', 'letmein', 'welcome', 'monkey', 'dragon'
    ];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common');
      suggestions.push('Choose a more unique password');
    }

    // Calculate final strength
    const characterVarietyScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
    if (characterVarietyScore >= 3 && password.length >= 12) {
      strength = 'strong';
    } else if (characterVarietyScore >= 2 && password.length >= 8) {
      strength = 'medium';
    }

    const isValid = errors.length === 0 && password.length >= 8;

    return {
      isValid,
      strength,
      errors,
      suggestions
    };
  }

  /**
   * Updates user password with validation
   */
  public static async updatePassword(newPassword: string): Promise<{
    success: boolean;
    message: string;
  }> {
    // 1. Validate password strength
    const passwordValidation = this.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        message: `Password requirements not met:\n${passwordValidation.errors.join('\n')}`
      };
    }

    try {
      // 2. Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        if (error.message?.includes('Invalid token')) {
          return {
            success: false,
            message: 'Reset link has expired or is invalid. Please request a new password reset.'
          };
        } else {
          throw error;
        }
      }

      console.log('Password successfully updated');
      return {
        success: true,
        message: 'Password updated successfully! You can now log in with your new password.'
      };

    } catch (error: any) {
      console.error('Password update error:', error);
      return {
        success: false,
        message: 'Failed to update password. Please try again or request a new reset link.'
      };
    }
  }

  /**
   * Checks if email is rate limited for password resets
   */
  private static isRateLimited(email: string): boolean {
    const attempts = this.resetAttempts.get(email);
    if (!attempts) return false;

    const now = Date.now();
    const timeSinceLastAttempt = now - attempts.lastAttempt;

    // Reset window if expired
    if (timeSinceLastAttempt > this.RATE_LIMIT_WINDOW) {
      this.resetAttempts.delete(email);
      return false;
    }

    // Check if exceeded max attempts
    return attempts.count >= this.MAX_ATTEMPTS_PER_WINDOW;
  }

  /**
   * Records a password reset attempt for rate limiting
   */
  private static recordAttempt(email: string): void {
    const now = Date.now();
    const attempts = this.resetAttempts.get(email);

    if (!attempts) {
      this.resetAttempts.set(email, { count: 1, lastAttempt: now });
    } else {
      const timeSinceLastAttempt = now - attempts.lastAttempt;
      
      // Reset count if window expired
      if (timeSinceLastAttempt > this.RATE_LIMIT_WINDOW) {
        this.resetAttempts.set(email, { count: 1, lastAttempt: now });
      } else {
        this.resetAttempts.set(email, {
          count: attempts.count + 1,
          lastAttempt: now
        });
      }
    }
  }

  /**
   * Clears rate limiting for an email (for testing)
   */
  public static clearRateLimit(email: string): void {
    this.resetAttempts.delete(email);
  }

  /**
   * Gets current rate limit status for an email
   */
  public static getRateLimitStatus(email: string): {
    isLimited: boolean;
    attemptsRemaining: number;
    resetTime: number | null;
  } {
    const attempts = this.resetAttempts.get(email);
    if (!attempts) {
      return {
        isLimited: false,
        attemptsRemaining: this.MAX_ATTEMPTS_PER_WINDOW,
        resetTime: null
      };
    }

    const now = Date.now();
    const timeSinceLastAttempt = now - attempts.lastAttempt;

    // Reset window if expired
    if (timeSinceLastAttempt > this.RATE_LIMIT_WINDOW) {
      this.resetAttempts.delete(email);
      return {
        isLimited: false,
        attemptsRemaining: this.MAX_ATTEMPTS_PER_WINDOW,
        resetTime: null
      };
    }

    const attemptsRemaining = Math.max(0, this.MAX_ATTEMPTS_PER_WINDOW - attempts.count);
    const resetTime = attempts.lastAttempt + this.RATE_LIMIT_WINDOW;

    return {
      isLimited: attemptsRemaining === 0,
      attemptsRemaining,
      resetTime
    };
  }

  /**
   * Validates password reset token (if needed)
   */
  public static async validateResetToken(token: string): Promise<{
    isValid: boolean;
    message: string;
  }> {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error) {
        return {
          isValid: false,
          message: 'Invalid or expired reset link. Please request a new password reset.'
        };
      }

      return {
        isValid: true,
        message: 'Reset token is valid.'
      };

    } catch (error: any) {
      console.error('Token validation error:', error);
      return {
        isValid: false,
        message: 'Unable to validate reset link. Please request a new password reset.'
      };
    }
  }
}
