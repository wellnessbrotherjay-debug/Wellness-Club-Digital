# Security and Environment

## Environment Variables Analysis

| Env Name | Risk Level | Evidence | Recommendation |
|----------|------------|----------|----------------|
| SUPABASE_URL | Low | Public endpoint | Acceptable - public URLs are safe |
| SUPABASE_SERVICE_ROLE_KEY | Critical | Admin key bypasses RLS | Rotate immediately, restrict access |
| VITE_SUPABASE_URL | Low | Public env var | Acceptable - URLs are safe |
| VITE_SUPABASE_ANON_KEY | Low | Public client key | Acceptable - anon keys are designed to be public |
| RESEND_API_KEY | High | Full email access | Restrict to specific domains, monitor usage |
| APPS_SCRIPT_URL | Medium | Google Sheets access | Validate script permissions regularly |
| OPENWEATHER_API_KEY | Low | Weather API access | Minimal risk, but rotate if compromised |
| PORT | Low | Server port | Acceptable configuration |
| WHATSAPP_NUMBER | Low | Contact number | Acceptable public information |

## Security Areas

### 1. Database Security
| Area | Risk Level | Evidence | Recommendation |
|------|------------|----------|----------------|
| RLS Policies | High | Public read/write on all tables | Implement proper row-level security |
| Service Role Key | Critical | Exposed in env file | Use only for trusted operations |
| SQL Injection | Medium | Direct queries with user input | Use parameterized queries |
| Data Exposure | Medium | All data publicly accessible | Implement proper access controls |
| Backup Security | Low | Backups in repo | Move to secure storage |

**Current Issues:**
- All tables have public read access
- Public write access on vouchers and redemptions
- No authentication or authorization
- Service role key used in web context

**Recommended Fixes:**
```sql
-- Implement proper RLS policies
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- Create policies based on user roles
CREATE POLICY "Vouchers Read" ON vouchers 
  FOR SELECT USING (has_role('admin') OR has_role('staff'));

CREATE POLICY "Vouchers Write" ON vouchers 
  FOR INSERT WITH CHECK (has_role('admin') OR has_role('staff'));

-- Add authentication checks
CREATE POLICY "Authenticated Access" ON vouchers
  FOR ALL USING (auth.uid() IS NOT NULL);
```

### 2. API Security
| Area | Risk Level | Evidence | Recommendation |
|------|------------|----------|----------------|
| Authentication | Critical | All endpoints public | Implement API key auth |
| Rate Limiting | Medium | Only on bulk-sync | Implement rate limiting |
| CORS | Low | Properly configured | Maintain current setup |
| Input Validation | Medium | Basic validation | Use Zod schemas for all inputs |
| Error Handling | Medium | Stack traces exposed | Sanitize error messages |
| Webhook Security | High | No signature validation | Add webhook secrets |

**Current Issues:**
- No authentication on any API endpoints
- No rate limiting (except bulk-sync)
- No input sanitization beyond basic validation
- Potential for API abuse

**Recommended Fixes:**
```typescript
// Implement API key authentication
app.use('*', async (c, next) => {
  const apiKey = c.req.header('x-api-key');
  if (!apiKey || !isValidApiKey(apiKey)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
});

// Implement rate limiting
app.use('*', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests'
}));

// Add webhook validation
const validateWebhook = (signature: string, body: string) => {
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = hmac.update(body).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${digest}`)
  );
};
```

### 3. Application Security
| Area | Risk Level | Evidence | Recommendation |
|------|------------|----------|----------------|
| XSS Prevention | Medium | User input displayed | Implement output encoding |
| CSRF Protection | Low | No state-changing forms | Add CSRF tokens |
| File Uploads | Low | Guest photo uploads | Validate file types and sizes |
| Client-Side Data | Medium | IndexedDB unencrypted | Consider encrypted storage |
| Secrets Exposure | Critical | API keys in frontend | Remove from client code |

**Current Issues:**
- User input directly rendered without sanitization
- No CSRF protection on forms
- File uploads lack validation
- Client stores sensitive data in IndexedDB

**Recommended Fixes:**
```typescript
// Implement XSS protection
const sanitizeInput = (input: string) => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// Add CSRF protection
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Validate file uploads
const validateFile = (file: File) => {
  const allowedTypes = ['image/jpeg', 'image/png'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  
  if (file.size > maxSize) {
    throw new Error('File too large');
  }
};
```

### 4. Network Security
| Area | Risk Level | Evidence | Recommendation |
|------|------------|----------|----------------|
| HTTPS | High | Not enforced in code | Implement redirects |
| Headers | Medium | No security headers | Add CSP, HSTS |
| CORS | Low | Configured but permissive | Tighten restrictions |
| API Keys | Critical | Transmitted in headers | Use HTTPS only |

**Recommended Headers:**
```typescript
// Add security headers
app.use('*', (c, next) => {
  c.res.headers.set('Content-Security-Policy', 
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('X-Frame-Options', 'DENY');
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  await next();
});
```

### 5. Operational Security
| Area | Risk Level | Evidence | Recommendation |
|------|------------|----------|----------------|
| Logging | Low | Basic console logs | Implement structured logging |
| Monitoring | Medium | No error monitoring | Add error tracking |
| Backups | Low | Daily backups | Maintain backup retention |
| Updates | Medium | Dependencies outdated | Update regularity |
| Secrets Management | Critical | Keys in env files | Use proper secret management |

## Risk Assessment Summary

### Critical Risks
1. **Database Exposure**: Public read/write on all tables
2. **Service Role Key**: Full database access in web context
3. **No Authentication**: All APIs publicly accessible
4. **API Key Exposure**: Keys visible in client-side code

### High Risks
1. **Email Service Abuse**: Resend key allows mass emailing
2. **Webhook Validation**: No signature verification
3. **Rate Limiting**: Absent on most endpoints
4. **Input Validation**: Incomplete across all endpoints

### Medium Risks
1. **Error Information**: Stack traces exposed
2. **XSS Vulnerabilities**: User input not sanitized
3. **File Uploads**: No validation implemented
4. **Missing CSRF**: No protection on forms

### Low Risks
1. **CORS Configuration**: Too permissive
2. **Security Headers**: Missing some headers
3. **Backup Storage**: In repository
4. **Client Storage**: IndexedDB unencrypted

## Security Recommendations

### Immediate Actions (Critical)
1. **Rotate Service Role Key**: Immediately and regularly
2. **Remove Service Key from Web**: Use only in API context
3. **Implement API Authentication**: Add API key validation
4. **Restrict Database Access**: Implement proper RLS policies

### Short-term (High Priority)
1. **Add Rate Limiting**: All API endpoints
2. **Implement Webhook Validation**: Add signature verification
3. **Sanitize User Input**: Prevent XSS attacks
4. **Add Security Headers**: CSP, HSTS, etc.

### Medium-term (Medium Priority)
1. **Add CSRF Protection**: All state-changing forms
2. **File Upload Validation**: Type and size checks
3. **Error Monitoring**: Implement structured logging
4. **Update Dependencies**: Regular security updates

### Long-term (Low Priority)
1. **Encrypted Client Storage**: For sensitive data
2. **Advanced Authentication**: JWT with refresh tokens
3. **Audit Logging**: Track all access and changes
4. **Regular Security Audits**: Penetration testing

## Security Best Practices

### 1. Environment Variables
- Never commit .env files
- Use different environments for dev/staging/prod
- Regularly rotate secrets
- Use secret management services in production

### 2. Database Security
- Principle of least privilege
- Regular security audits
- Backup and recovery testing
- Monitor for unusual access patterns

### 3. API Security
- Always use HTTPS
- Validate all inputs
- Rate limit public APIs
- Monitor for abuse patterns

### 4. Application Security
- Implement CSP headers
- Sanitize all user input
- Use HTTPS for all communications
- Regular security testing

### 5. Monitoring and Logging
- Log security events
- Monitor for suspicious activity
- Implement alerting for critical issues
- Regular review of logs

## Compliance Considerations

### Data Protection
- GDPR compliance for guest data
- Data retention policies
- Right to be forgotten
- Data breach notification

### Industry Standards
- PCI DSS for payment processing
- HIPAA for health-related data
- ISO 27001 for information security
- SOC 2 for service organizations

### Legal Requirements
- Privacy policy
- Terms of service
- Cookie policy (if using analytics)
- Data processing agreements