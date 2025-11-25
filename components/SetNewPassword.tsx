// components/SetNewPassword.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PasswordResetService } from '../utils/passwordReset';

type Props = {
  colors: any;
  onClose: () => void;
  onSuccess: () => void;
  resetToken?: string;
};

export default function SetNewPassword({ colors, onClose, onSuccess, resetToken }: Props) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    isValid: boolean;
    strength: 'weak' | 'medium' | 'strong';
    errors: string[];
    suggestions: string[];
  } | null>(null);

  // Validate password in real-time
  useEffect(() => {
    if (newPassword.length > 0) {
      const validation = PasswordResetService.validatePasswordStrength(newPassword);
      setPasswordStrength(validation);
    } else {
      setPasswordStrength(null);
    }
  }, [newPassword]);

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'strong': return '#10b981';
      default: return '#9ca3af';
    }
  };

  const getStrengthText = (strength: string) => {
    switch (strength) {
      case 'weak': return 'Weak';
      case 'medium': return 'Medium';
      case 'strong': return 'Strong';
      default: return '';
    }
  };

  const handleSetPassword = useCallback(async () => {
    // Basic validation
    if (!newPassword.trim()) {
      Alert.alert('Password Required', 'Please enter a new password.');
      return;
    }

    if (!confirmPassword.trim()) {
      Alert.alert('Confirm Password', 'Please confirm your new password.');
      return;
    }

    // Password match validation
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords Don\'t Match', 'Please make sure both passwords are identical.');
      return;
    }

    // Password strength validation
    if (!passwordStrength?.isValid) {
      const errorMessage = passwordStrength?.errors?.join('\n') || 'Password does not meet requirements.';
      Alert.alert('Weak Password', `Please strengthen your password:\n\n${errorMessage}`);
      return;
    }

    try {
      setIsLoading(true);

      // Update password
      const result = await PasswordResetService.updatePassword(newPassword);

      if (result.success) {
        Alert.alert(
          '✅ Password Updated!',
          result.message,
          [
            { text: 'Continue', onPress: onSuccess }
          ]
        );
      } else {
        Alert.alert('Update Failed', result.message);
      }

    } catch (error: any) {
      console.error('Set password error:', error);
      Alert.alert(
        'Update Failed',
        'Unable to update password. Please try again or request a new reset link.',
        [
          { text: 'Try Again', style: 'default' },
          { text: 'Cancel', style: 'cancel', onPress: onClose }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  }, [newPassword, confirmPassword, passwordStrength, onSuccess, onClose]);

  const handleClose = useCallback(() => {
    if (isLoading) return;
    onClose();
  }, [isLoading, onClose]);

  const renderPasswordStrength = () => {
    if (!passwordStrength || newPassword.length === 0) return null;

    const { strength, errors, suggestions } = passwordStrength;
    const strengthColor = getStrengthColor(strength);

    return (
      <View style={styles.strengthContainer}>
        <View style={styles.strengthHeader}>
          <Text style={[styles.strengthLabel, { color: colors.text }]}>Password Strength:</Text>
          <Text style={[styles.strengthValue, { color: strengthColor }]}>
            {getStrengthText(strength).toUpperCase()}
          </Text>
        </View>

        {/* Strength indicator bar */}
        <View style={styles.strengthBar}>
          <View 
            style={[
              styles.strengthFill, 
              { 
                backgroundColor: strengthColor,
                width: strength === 'weak' ? '33%' : strength === 'medium' ? '66%' : '100%'
              }
            ]} 
          />
        </View>

        {/* Errors and suggestions */}
        {errors.length > 0 && (
          <View style={styles.errorsContainer}>
            <Text style={[styles.errorsTitle, { color: colors.danger }]}>Requirements:</Text>
            {errors.map((error, index) => (
              <Text key={`error-${index}`} style={[styles.errorItem, { color: colors.sub }]}>
                • {error}
              </Text>
            ))}
          </View>
        )}

        {suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={[styles.suggestionsTitle, { color: colors.text }]}>Suggestions:</Text>
            {suggestions.map((suggestion, index) => (
              <Text key={`suggestion-${index}`} style={[styles.suggestionItem, { color: colors.sub }]}>
                💡 {suggestion}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>🔐 Set New Password</Text>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={[styles.message, { color: colors.text }]}>
          Create a strong password for your account. Make sure it's unique and memorable.
        </Text>

        {/* New Password Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>New Password</Text>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={[styles.input, styles.passwordInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Enter new password"
              placeholderTextColor={colors.sub}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
              editable={!isLoading}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={styles.toggleButton}
            >
              <Text style={[styles.toggleButtonText, { color: colors.primary }]}>
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Password Strength Indicator */}
        {renderPasswordStrength()}

        {/* Confirm Password Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm Password</Text>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={[styles.input, styles.passwordInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Confirm new password"
              placeholderTextColor={colors.sub}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              editable={!isLoading}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.toggleButton}
            >
              <Text style={[styles.toggleButtonText, { color: colors.primary }]}>
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Password Match Indicator */}
        {confirmPassword.length > 0 && (
          <View style={styles.matchContainer}>
            <Text style={[styles.matchText, { 
              color: newPassword === confirmPassword ? colors.success : colors.danger 
            }]}>
              {newPassword === confirmPassword ? '✅ Passwords match' : '❌ Passwords don\'t match'}
            </Text>
          </View>
        )}

        {/* Security Tips */}
        <View style={styles.securityTips}>
          <Text style={[styles.tipsTitle, { color: colors.text }]}>🔒 Security Tips:</Text>
          <Text style={[styles.tipItem, { color: colors.sub }]}>
            • Use at least 8 characters
          </Text>
          <Text style={[styles.tipItem, { color: colors.sub }]}>
            • Mix uppercase, lowercase, numbers, and symbols
          </Text>
          <Text style={[styles.tipItem, { color: colors.sub }]}>
            • Avoid common passwords or personal information
          </Text>
          <Text style={[styles.tipItem, { color: colors.sub }]}>
            • Don't reuse passwords from other accounts
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable
            onPress={handleSetPassword}
            disabled={isLoading || !passwordStrength?.isValid || newPassword !== confirmPassword}
            style={[
              styles.updateButton,
              {
                backgroundColor: colors.primary,
                opacity: (isLoading || !passwordStrength?.isValid || newPassword !== confirmPassword) ? 0.6 : 1
              }
            ]}
          >
            <Text style={styles.updateButtonText}>
              {isLoading ? 'Updating...' : 'Update Password'}
            </Text>
          </Pressable>

          <Pressable 
            onPress={handleClose} 
            disabled={isLoading}
            style={[styles.cancelButton, { borderColor: colors.border, opacity: isLoading ? 0.6 : 1 }]}
          >
            <Text style={[styles.cancelButtonText, { color: colors.sub }]}>Cancel</Text>
          </Pressable>
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
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    flex: 1,
  },
  passwordInput: {
    paddingRight: 50,
  },
  toggleButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  toggleButtonText: {
    fontSize: 18,
  },
  strengthContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  strengthValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  errorsContainer: {
    gap: 4,
  },
  errorsTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorItem: {
    fontSize: 12,
    lineHeight: 16,
  },
  suggestionsContainer: {
    gap: 4,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionItem: {
    fontSize: 12,
    lineHeight: 16,
  },
  matchContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  matchText: {
    fontSize: 14,
    fontWeight: '600',
  },
  securityTips: {
    backgroundColor: '#f0f9fa',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  tipItem: {
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    gap: 12,
  },
  updateButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  updateButtonText: {
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
});
