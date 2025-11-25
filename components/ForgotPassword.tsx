// components/ForgotPassword.tsx
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { EmailValidator } from '../utils/emailValidation';

type Props = {
  colors: any;
  onClose: () => void;
  onSuccess: (email: string) => void;
};

export default function ForgotPassword({ colors, onClose, onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const validateEmail = useCallback((email: string): { isValid: boolean; error?: string; suggestion?: string } => {
    const validation = EmailValidator.validate(email);
    return validation;
  }, []);

  const handleSendResetEmail = useCallback(async () => {
    // Basic validation
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    // Advanced email validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      let message = emailValidation.error || 'Invalid email address';
      if (emailValidation.suggestion) {
        message += `\n\nDid you mean: ${emailValidation.suggestion}?`;
      }
      Alert.alert('Invalid Email', message);
      return;
    }

    try {
      setIsLoading(true);
      
      // Import supabase dynamically to avoid circular dependencies
      const { supabase } = await import('../lib/supabase');
      
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: undefined, // We'll handle this manually for security
      });

      if (error) {
        // Handle specific Supabase errors
        if (error.message?.includes('over_email_rate_limit')) {
          Alert.alert('Too Many Requests', 'Please wait a few minutes before trying again.');
          return;
        } else if (error.message?.includes('User not found')) {
          // Don't reveal if user exists or not for security
          Alert.alert('Reset Email Sent', 'If an account exists with this email, you will receive password reset instructions.');
          setIsEmailSent(true);
          setSentEmail(email.trim().toLowerCase());
          return;
        } else {
          throw error;
        }
      }

      // Success - always show success message for security (don't reveal if user exists)
      setIsEmailSent(true);
      setSentEmail(email.trim().toLowerCase());
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      Alert.alert(
        'Reset Failed', 
        'Unable to send reset email. Please check your email address and try again.',
        [
          { text: 'Try Again', style: 'default' },
          { text: 'Cancel', style: 'cancel', onPress: onClose }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  }, [email, validateEmail, onClose]);

  const handleResendEmail = useCallback(async () => {
    setIsEmailSent(false);
    await handleSendResetEmail();
  }, [handleSendResetEmail]);

  const handleClose = useCallback(() => {
    if (isEmailSent) {
      onSuccess(sentEmail);
    }
    onClose();
  }, [isEmailSent, sentEmail, onSuccess, onClose]);

  if (isEmailSent) {
    return (
      <View style={[styles.container, { backgroundColor: colors.cardBg }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>✅ Check Your Email</Text>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={[styles.message, { color: colors.text }]}>
            We've sent password reset instructions to:
          </Text>
          <Text style={[styles.emailText, { color: colors.primary }]}>
            {sentEmail}
          </Text>
          
          <View style={styles.instructions}>
            <Text style={[styles.instructionText, { color: colors.sub }]}>
              📧 Check your inbox (and spam folder)
            </Text>
            <Text style={[styles.instructionText, { color: colors.sub }]}>
              ⏰ Email may take a few minutes to arrive
            </Text>
            <Text style={[styles.instructionText, { color: colors.sub }]}>
              🔗 Click the reset link in the email
            </Text>
            <Text style={[styles.instructionText, { color: colors.sub }]}>
              📱 Return to the app to set your new password
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={handleResendEmail}
              disabled={isLoading}
              style={[styles.resendButton, { opacity: isLoading ? 0.6 : 1 }]}
            >
              <Text style={[styles.resendButtonText, { color: colors.primary }]}>
                {isLoading ? 'Sending...' : 'Resend Email'}
              </Text>
            </Pressable>
            
            <Pressable onPress={handleClose} style={[styles.doneButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>🔐 Reset Password</Text>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={[styles.message, { color: colors.text }]}>
          Enter your email address and we'll send you instructions to reset your password.
        </Text>

        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="Enter your email"
          placeholderTextColor={colors.sub}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          editable={!isLoading}
        />

        <View style={styles.securityNotice}>
          <Text style={[styles.securityText, { color: colors.sub }]}>
            🔒 For security reasons, we'll confirm if an email was sent regardless of whether an account exists.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={handleSendResetEmail}
            disabled={isLoading}
            style={[
              styles.sendButton, 
              { 
                backgroundColor: colors.primary, 
                opacity: isLoading ? 0.6 : 1 
              }
            ]}
          >
            <Text style={styles.sendButtonText}>
              {isLoading ? 'Sending...' : 'Send Reset Email'}
            </Text>
          </Pressable>

          <Pressable onPress={handleClose} style={[styles.cancelButton, { borderColor: colors.border }]}>
            <Text style={[styles.cancelButtonText, { color: colors.sub }]}>Cancel</Text>
          </Pressable>
        </View>

        <View style={styles.helpSection}>
          <Text style={[styles.helpText, { color: colors.sub }]}>
            💡 Tips:
          </Text>
          <Text style={[styles.helpText, { color: colors.sub }]}>
            • Check your spam folder if you don't receive the email
          </Text>
          <Text style={[styles.helpText, { color: colors.sub }]}>
            • Make sure to enter the exact email you used to sign up
          </Text>
          <Text style={[styles.helpText, { color: colors.sub }]}>
            • Reset links expire after 24 hours for security
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    margin: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  content: {
    gap: 16,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  securityNotice: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6ECFD9',
  },
  securityText: {
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    gap: 12,
  },
  sendButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  helpSection: {
    backgroundColor: '#f0f9fa',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 18,
  },
  // Success state styles
  emailText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 8,
  },
  instructions: {
    backgroundColor: '#f0f9fa',
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginVertical: 16,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6ECFD9',
    backgroundColor: 'transparent',
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
