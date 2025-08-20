# Security Guidelines for Alameda Sidewalk Map

## 🛡️ Security Features Implemented

### Rate Limiting
- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 attempts per 15 minutes per IP  
- **File Uploads**: 10 uploads per hour per IP
- **Contributions**: 20 segment additions per hour per IP

### Input Validation & Sanitization
- HTML sanitization using DOMPurify
- Strict coordinate validation (Alameda bounds only)
- File type and size validation
- SQL injection prevention through prepared statements
- XSS protection through input sanitization

### Authentication Security
- JWT tokens with secure secrets
- Password hashing with bcrypt
- Role-based access control
- Token expiration and refresh

### Bot Protection
- User agent analysis
- Missing header detection
- Honeypot fields
- Mathematical CAPTCHA challenges
- Behavioral pattern analysis

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## 🚀 Deployment Security Checklist

### Before Going Live:

1. **Environment Variables**
   ```bash
   # Generate secure secrets
   openssl rand -base64 32  # For JWT_SECRET
   openssl rand -base64 32  # For ENCRYPTION_KEY
   ```

2. **Database Security**
   - [ ] Ensure database file has restricted permissions (600)
   - [ ] Regular automated backups
   - [ ] Database encryption at rest (if hosting provider supports)

3. **HTTPS & Domain Security**
   - [ ] SSL/TLS certificate configured
   - [ ] HTTP redirects to HTTPS
   - [ ] Domain ownership verification
   - [ ] Consider CloudFlare for additional DDoS protection

4. **File Upload Security**
   - [ ] Uploads directory outside web root
   - [ ] File scanning (if using cloud storage)
   - [ ] Image processing to strip metadata

5. **Monitoring & Logging**
   - [ ] Error logging configured
   - [ ] Rate limit violation monitoring
   - [ ] Unusual activity alerts
   - [ ] Regular security audits

## 🏗️ Hosting Recommendations

### Low-Cost Options:
1. **Vercel** (Free tier + Pro when needed)
   - Built-in DDoS protection
   - Edge functions for rate limiting
   - Automatic HTTPS
   - ~$20/month for production usage

2. **Railway** + CloudFlare
   - $5/month base hosting
   - CloudFlare free tier for DDoS protection
   - Custom domains and SSL

3. **DigitalOcean App Platform**
   - $12/month for basic apps
   - Add CloudFlare for protection
   - More control over security configs

### Production Security Add-ons:

1. **CloudFlare** (Free/Pro)
   - DDoS protection
   - Web Application Firewall (WAF)  
   - Bot management
   - Rate limiting at edge
   - Cost: Free tier available, Pro $25/month

2. **External CAPTCHA** 
   - Google reCAPTCHA v3 (free)
   - hCaptcha (free tier)
   - Better bot protection than math CAPTCHA

3. **Database Monitoring**
   - Uptime monitoring
   - Performance alerts
   - Backup verification

## 💰 Cost Management

### Traffic-Based Scaling:
- Monitor bandwidth usage
- Implement caching headers
- Optimize images and assets
- Use CDN for static content

### Database Limits:
- Implement data retention policies
- Archive old contributions
- Limit photo uploads per user
- Compress images on upload

### Rate Limiting Benefits:
- Prevents API abuse
- Reduces hosting costs
- Maintains site performance
- Protects against attacks

## 🚨 Incident Response

### If Under Attack:
1. **Immediate Response**
   - Lower rate limits temporarily
   - Block suspicious IP ranges
   - Enable stricter bot detection

2. **Investigate**
   - Check logs for patterns
   - Identify attack vectors
   - Document incident

3. **Recovery**
   - Restore from clean backup if needed
   - Update security measures
   - Monitor for continued threats

### Contact Information:
- Keep hosting provider support contacts handy
- Consider security incident response service
- Have rollback plan ready

## 🔄 Regular Maintenance

### Weekly:
- [ ] Review error logs
- [ ] Check for unusual traffic patterns
- [ ] Verify backup integrity

### Monthly:
- [ ] Update dependencies (`npm audit`)
- [ ] Review user activity
- [ ] Security patch updates

### Quarterly:
- [ ] Security audit
- [ ] Penetration testing (basic)
- [ ] Access review and cleanup

## 📞 Emergency Procedures

### Site Compromise:
1. Take site offline immediately
2. Change all passwords and secrets
3. Restore from clean backup
4. Investigate breach vector
5. Implement additional security measures
6. Notify users if data was affected

### DDoS Attack:
1. Enable CloudFlare "Under Attack" mode
2. Lower rate limits
3. Contact hosting provider
4. Monitor costs to avoid overages
5. Consider temporary read-only mode

This security framework provides enterprise-level protection while maintaining cost-effectiveness for a community-focused application.