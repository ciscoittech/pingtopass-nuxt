# Preview Environment DNS Configuration Guide

## Overview

This guide explains how to configure DNS for dynamic preview deployments on Cloudflare Workers. The setup enables URLs like `pr-123.preview.pingtopass.com` for each pull request.

## Prerequisites

- Domain registered with Cloudflare (pingtopass.com)
- Cloudflare account with Workers enabled
- SSL/TLS encryption mode set to "Full" or "Full (strict)"

## Step 1: Create Wildcard DNS Record

### Via Cloudflare Dashboard

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain (pingtopass.com)
3. Navigate to **DNS** → **Records**
4. Click **Add record**
5. Configure the record:
   - **Type:** CNAME
   - **Name:** `*.preview`
   - **Target:** `preview.pingtopass.workers.dev`
   - **Proxy status:** Proxied (orange cloud ON)
   - **TTL:** Auto

### Via Cloudflare API

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "*.preview",
    "content": "preview.pingtopass.workers.dev",
    "proxied": true,
    "ttl": 1
  }'
```

## Step 2: Configure Workers Routes

### Via Dashboard

1. Navigate to **Workers Routes** in Cloudflare Dashboard
2. Click **Add route**
3. Configure:
   - **Route:** `*.preview.pingtopass.com/*`
   - **Worker:** Select "None" (routes will be created dynamically)
   - **Zone:** pingtopass.com

### Via wrangler.toml

Already configured in our `wrangler.toml`:

```toml
[[env.preview.routes]]
pattern = "*.preview.pingtopass.com/*"
zone_name = "pingtopass.com"
```

## Step 3: SSL Certificate Configuration

### Automatic SSL (Recommended)

Cloudflare automatically provisions SSL certificates for wildcard subdomains when:
1. DNS records are proxied through Cloudflare
2. Universal SSL is enabled (default)

### Advanced Certificate Manager (ACM)

For better wildcard support:

1. Navigate to **SSL/TLS** → **Edge Certificates**
2. Enable **Advanced Certificate Manager** ($10/month)
3. Benefits:
   - Covers `*.preview.pingtopass.com`
   - Faster certificate issuance
   - Better compatibility

### Custom SSL Certificate

If using a custom certificate:

```bash
# Generate CSR for wildcard
openssl req -new -newkey rsa:2048 -nodes \
  -keyout preview.key \
  -out preview.csr \
  -subj "/CN=*.preview.pingtopass.com"

# Upload to Cloudflare after obtaining certificate
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/custom_certificates" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "certificate": "-----BEGIN CERTIFICATE-----...",
    "private_key": "-----BEGIN PRIVATE KEY-----...",
    "bundle_method": "ubiquitous"
  }'
```

## Step 4: Configure Page Rules (Optional)

Optimize preview environments with page rules:

### Via Dashboard

1. Navigate to **Rules** → **Page Rules**
2. Create rule for `*.preview.pingtopass.com/*`
3. Settings:
   - **Cache Level:** Bypass (previews shouldn't be cached)
   - **Disable Performance:** ON (for debugging)
   - **Development Mode:** ON

### Via API

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/pagerules" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "targets": [
      {
        "target": "url",
        "constraint": {
          "operator": "matches",
          "value": "*.preview.pingtopass.com/*"
        }
      }
    ],
    "actions": [
      {"id": "cache_level", "value": "bypass"},
      {"id": "disable_performance", "value": "on"}
    ],
    "priority": 1,
    "status": "active"
  }'
```

## Step 5: Verify Configuration

### DNS Verification

```bash
# Check DNS resolution
dig +short pr-123.preview.pingtopass.com

# Check CNAME record
dig CNAME *.preview.pingtopass.com

# Test with curl
curl -I https://pr-123.preview.pingtopass.com
```

### SSL Verification

```bash
# Check SSL certificate
openssl s_client -connect pr-123.preview.pingtopass.com:443 -servername pr-123.preview.pingtopass.com

# Verify certificate details
echo | openssl s_client -connect pr-123.preview.pingtopass.com:443 2>/dev/null | openssl x509 -text -noout | grep "Subject:"
```

## Step 6: Monitoring and Troubleshooting

### Common Issues

#### 1. DNS Not Resolving
- **Issue:** Preview URLs return "DNS_PROBE_FINISHED_NXDOMAIN"
- **Solution:** Wait 5-10 minutes for DNS propagation
- **Check:** `nslookup pr-123.preview.pingtopass.com 1.1.1.1`

#### 2. SSL Certificate Errors
- **Issue:** "NET::ERR_CERT_COMMON_NAME_INVALID"
- **Solution:** Ensure wildcard certificate covers `*.preview.pingtopass.com`
- **Fix:** Enable Advanced Certificate Manager or wait for Universal SSL

#### 3. 522 Connection Timeout
- **Issue:** Worker not responding
- **Solution:** Check worker deployment status
- **Debug:** `wrangler tail --env preview`

#### 4. 1000 DNS Error
- **Issue:** DNS misconfiguration
- **Solution:** Verify CNAME record and Workers route

### Monitoring Commands

```bash
# Monitor DNS queries
watch -n 5 'dig +short pr-123.preview.pingtopass.com'

# Check Workers logs
wrangler tail --env preview --format pretty

# Test preview health
curl https://pr-123.preview.pingtopass.com/api/health
```

## Cost Optimization

### DNS Costs
- **DNS Queries:** Free (included with Cloudflare)
- **Wildcard DNS:** No additional cost

### SSL Costs
- **Universal SSL:** Free (basic wildcard support)
- **Advanced Certificate Manager:** $10/month (recommended for production)
- **Custom Certificates:** Free to upload

### Workers Route Costs
- **Routes:** Free (unlimited)
- **Requests:** First 100k/day free, then $0.50 per million

## Security Considerations

### 1. Subdomain Isolation
- Each preview runs in isolated Workers environment
- No shared state between previews
- Separate KV namespaces per preview

### 2. Access Control
Add authentication for preview environments:

```javascript
// In worker code
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Check if preview environment
    if (url.hostname.includes('.preview.')) {
      // Require basic auth or token
      const auth = request.headers.get('Authorization');
      if (!auth || !validatePreviewAuth(auth)) {
        return new Response('Unauthorized', { status: 401 });
      }
    }
    
    // Continue with normal handling
    return handleRequest(request, env);
  }
};
```

### 3. Rate Limiting
Implement rate limiting for preview environments:

```toml
# In wrangler.toml
[env.preview.vars]
RATE_LIMIT_ENABLED = "true"
MAX_REQUESTS_PER_MINUTE = "100"
```

### 4. Automatic Cleanup
Ensure previews are deleted after PR closure:
- GitHub Actions webhook triggers cleanup
- Scheduled cleanup for orphaned previews
- Maximum TTL enforcement

## Automation Script

Create DNS records programmatically:

```bash
#!/bin/bash
# setup-preview-dns.sh

ZONE_ID="your-zone-id"
CLOUDFLARE_API_TOKEN="your-api-token"

# Create wildcard CNAME
create_wildcard_dns() {
  curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{
      "type": "CNAME",
      "name": "*.preview",
      "content": "preview.pingtopass.workers.dev",
      "proxied": true
    }'
}

# Create Workers route
create_workers_route() {
  curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/workers/routes" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{
      "pattern": "*.preview.pingtopass.com/*",
      "script": "pingtopass-preview"
    }'
}

# Run setup
create_wildcard_dns
create_workers_route

echo "Preview DNS configuration completed!"
```

## Maintenance

### Weekly Tasks
- Review and cleanup expired previews
- Monitor DNS query patterns
- Check SSL certificate expiration

### Monthly Tasks
- Audit preview environment costs
- Review security logs
- Update wildcard certificates if needed

### Quarterly Tasks
- Review DNS architecture
- Optimize routing rules
- Update documentation

## Support Resources

- [Cloudflare DNS Documentation](https://developers.cloudflare.com/dns/)
- [Workers Custom Domains](https://developers.cloudflare.com/workers/platform/routing/custom-domains/)
- [SSL/TLS Configuration](https://developers.cloudflare.com/ssl/)
- [Cloudflare Community](https://community.cloudflare.com/)

---

**Note:** This configuration enables cost-effective preview deployments within the $5-25/month Cloudflare Workers budget while maintaining security and performance.