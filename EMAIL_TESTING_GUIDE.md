# 📧 Email Testing Guide - Prevent Bounces

## ⚠️ CRITICAL: Email Bounce Prevention

This guide helps prevent Supabase email sending privileges from being restricted due to high bounce rates.

## 🚫 PROHIBITED EMAIL PRACTICES

### ❌ NEVER Use These for Testing:
- `test@example.com`
- `asdf@qwerty.com`
- `123@fake.com`
- Any disposable/temporary email services
- Made-up email addresses

### ❌ NEVER Send Emails To:
- Invalid email formats
- Non-existent domains
- Blocked email providers
- Temporary email services

## ✅ APPROVED EMAIL TESTING METHODS

### 1. **Use Real, Valid Email Addresses**
```typescript
// ✅ GOOD: Real email addresses you own
const testEmails = [
  'your-personal-email@gmail.com',
  'your-work-email@company.com',
  'backup-email@yahoo.com'
];
```

### 2. **Use Email Testing Services**
```typescript
// ✅ GOOD: Professional email testing tools
const emailTestingServices = [
  'mailtrap.io',     // Email testing sandbox
  'sendgrid.dev',    // Development environment
  'ethereal.email'   // Fake email testing
];
```

### 3. **Development Environment Configuration**
```typescript
// ✅ GOOD: Disable emails in development
if (process.env.NODE_ENV === 'development') {
  // Use console.log instead of actual email sending
  console.log('Would send email to:', email);
  return;
}
```

## 🛡️ BOUNCE PREVENTION MEASURES

### Email Validation (Implemented)
```typescript
import { EmailValidator } from '../utils/emailValidation';

// ✅ Automatic validation prevents invalid emails
const validation = EmailValidator.validate(email);
if (!validation.isValid) {
  Alert.alert('Invalid email', validation.error);
  return;
}
```

### Blocked Domains
The following domains are automatically blocked:
- `tempmail.org`, `10minutemail.com`, `guerrillamail.com`
- `mailinator.com`, `yopmail.com`, `throwaway.email`
- And 10+ other disposable email services

### Rate Limiting
```typescript
// ✅ Built-in rate limiting prevents spam
if (error?.message?.includes('over_email_rate_limit')) {
  Alert.alert('Too many attempts', 'Please wait a few minutes');
  return;
}
```

## 🧪 SAFE TESTING WORKFLOW

### Step 1: Development Testing
```bash
# Use development environment
EXPO_PUBLIC_ENV=development

# Emails are logged, not sent
# Check console for email logs
```

### Step 2: Staging Testing
```bash
# Use valid test emails only
const TEST_EMAILS = [
  'real-email-1@gmail.com',
  'real-email-2@yahoo.com'
];
```

### Step 3: Production Monitoring
```typescript
// Monitor bounce rates in Supabase dashboard
// Set up alerts for high bounce rates
```

## 📊 MONITORING & ALERTS

### Supabase Dashboard Monitoring
1. Go to: Supabase Dashboard → Settings → Logs
2. Filter for: `auth.email.*`
3. Monitor bounce rates daily

### Key Metrics to Track
- **Bounce Rate**: Should be < 5%
- **Delivery Rate**: Should be > 95%
- **Spam Complaints**: Should be 0%

## 🚨 EMERGENCY RESPONSE

### If Bounce Rate Increases:
1. **Immediately** stop all email testing
2. **Review** recent sign-ups for invalid emails
3. **Clean** invalid emails from database
4. **Contact** Supabase support if needed

### Database Cleanup Query:
```sql
-- Remove obviously invalid emails (use with caution)
DELETE FROM auth.users 
WHERE email NOT LIKE '%@%.%' 
   OR email LIKE '%test%' 
   OR email LIKE '%fake%';
```

## 📋 TESTING CHECKLIST

### Before Testing Emails:
- [ ] Use real, valid email addresses
- [ ] Test in development environment first
- [ ] Monitor bounce rates
- [ ] Have email validation enabled
- [ ] Check rate limiting is working

### After Testing:
- [ ] Clean up test accounts
- [ ] Verify bounce rates are normal
- [ ] Document test results
- [ ] Update email validation if needed

## 🆘 GETTING HELP

### Supabase Support:
- Dashboard: https://supabase.com/dashboard
- Email: support@supabase.com
- Documentation: https://supabase.com/docs

### Common Issues:
- **High bounce rate**: Review email validation
- **Rate limiting**: Implement backoff strategy
- **Spam complaints**: Review email content

---

**Remember**: Your email sending privileges are at risk. Follow this guide strictly to maintain good email deliverability!
