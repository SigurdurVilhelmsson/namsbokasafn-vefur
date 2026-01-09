# Deployment Guide - efnafraedi.app

Complete guide for deploying the Chemistry Reader to `efnafraedi.app` on Linode.

---

## Prerequisites

- Linode server with Ubuntu/Debian
- Domain `efnafraedi.app` pointing to your Linode IP
- SSH access to your server
- Node.js 22+ installed on your local machine

---

## Step 1: DNS Configuration

Configure your domain registrar to point to your Linode:

```
A Record:     efnafraedi.app      → YOUR_LINODE_IP
A Record:     www.efnafraedi.app  → YOUR_LINODE_IP
```

**Optional (for future AI Tutor):**
```
A Record:     tutor.efnafraedi.app → YOUR_LINODE_IP
```

Wait 5-10 minutes for DNS propagation. Verify with:
```bash
dig efnafraedi.app
```

---

## Step 2: Server Setup

SSH into your Linode:
```bash
ssh root@YOUR_LINODE_IP
```

### Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Nginx
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y

# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Create Directory for the App

```bash
# Create web directory
sudo mkdir -p /var/www/efnafraedi-lesari

# Set ownership (replace 'youruser' with your username)
sudo chown -R $USER:$USER /var/www/efnafraedi-lesari
```

---

## Step 3: Configure Nginx

### Copy the config file to server

From your **local machine** (in the Chemistry-Reader directory):
```bash
scp nginx-config-example.conf root@YOUR_LINODE_IP:/tmp/
```

On the **server**:
```bash
# Copy to Nginx sites-available
sudo cp /tmp/nginx-config-example.conf /etc/nginx/sites-available/efnafraedi.app

# Create symlink to enable site
sudo ln -s /etc/nginx/sites-available/efnafraedi.app /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

---

## Step 4: Get SSL Certificate

Run Certbot to get free SSL certificate from Let's Encrypt:

```bash
sudo certbot --nginx -d efnafraedi.app -d www.efnafraedi.app
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

Certbot will automatically configure SSL in your Nginx config.

### Test Auto-renewal

```bash
sudo certbot renew --dry-run
```

---

## Step 5: Update GitHub Actions (Optional)

If you want automatic deployments from GitHub, update `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Linode

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to Linode
        env:
          LINODE_HOST: ${{ secrets.LINODE_HOST }}
          LINODE_USER: ${{ secrets.LINODE_USER }}
          LINODE_SSH_KEY: ${{ secrets.LINODE_SSH_KEY }}
        run: |
          # Setup SSH
          mkdir -p ~/.ssh
          echo "$LINODE_SSH_KEY" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H $LINODE_HOST >> ~/.ssh/known_hosts

          # Deploy built files
          rsync -avz --delete build/ $LINODE_USER@$LINODE_HOST:/var/www/efnafraedi-lesari/build/
```

### Set GitHub Secrets

In your GitHub repository:
1. Go to Settings → Secrets and variables → Actions
2. Add these secrets:
   - `LINODE_HOST`: Your Linode IP address
   - `LINODE_USER`: Your SSH username (e.g., `root` or your user)
   - `LINODE_SSH_KEY`: Your private SSH key

---

## Step 6: Manual Deployment

### Build Locally

On your **local machine**:
```bash
cd Chemistry-Reader
npm install
npm run build
```

### Deploy to Server

```bash
# Copy build files to server
rsync -avz --delete build/ root@YOUR_LINODE_IP:/var/www/efnafraedi-lesari/build/

# Or using SCP
scp -r build/* root@YOUR_LINODE_IP:/var/www/efnafraedi-lesari/build/
```

---

## Step 7: Configure Environment Variables

Create a `.env.production` file in your project root:

```env
# API Configuration
VITE_AI_TUTOR_URL=https://tutor.efnafraedi.app

# Analytics (optional)
VITE_ANALYTICS_ID=your-analytics-id

# Feature flags (optional)
VITE_ENABLE_AI_FEATURES=false
```

Rebuild after changing environment variables:
```bash
npm run build
```

---

## Step 8: Verify Deployment

### Check the Site

1. Visit https://efnafraedi.app
2. Verify SSL certificate (should show padlock icon)
3. Test navigation (click through chapters)
4. Test search (Cmd/Ctrl + K)
5. Test theme toggle
6. Check on mobile device

### Check Logs

On the server:
```bash
# Access logs
sudo tail -f /var/log/nginx/efnafraedi.app.access.log

# Error logs
sudo tail -f /var/log/nginx/efnafraedi.app.error.log
```

### Performance Check

```bash
# Test from command line
curl -I https://efnafraedi.app

# Check response time
curl -w "@-" -o /dev/null -s https://efnafraedi.app <<'EOF'
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
      time_redirect:  %{time_redirect}\n
   time_pretransfer:  %{time_pretransfer}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
EOF
```

---

## Step 9: Future - AI Tutor Integration

When ready to deploy the AI Tutor:

### 1. Get SSL Certificate for Tutor Subdomain

```bash
sudo certbot --nginx -d tutor.efnafraedi.app
```

### 2. Uncomment AI Tutor Config

Edit `/etc/nginx/sites-available/efnafraedi.app`:
- Uncomment the `server` block for `tutor.efnafraedi.app`
- Update the `proxy_pass` port to match your AI Tutor backend
- Reload Nginx: `sudo systemctl reload nginx`

### 3. Update Chemistry Reader Config

Rebuild with environment variable:
```env
VITE_AI_TUTOR_URL=https://tutor.efnafraedi.app
```

---

## Maintenance

### Update Content

To update markdown content or glossary:
```bash
# On local machine
npm run build
rsync -avz --delete build/content/ root@YOUR_LINODE_IP:/var/www/efnafraedi-lesari/build/content/
```

### Update Application

```bash
# On local machine
git pull
npm install  # if dependencies changed
npm run build
rsync -avz --delete build/ root@YOUR_LINODE_IP:/var/www/efnafraedi-lesari/build/
```

### Monitor SSL Certificate

Certbot will auto-renew. Check status:
```bash
sudo certbot certificates
```

### Backup

```bash
# Backup current deployment
sudo tar -czf /var/backups/efnafraedi-$(date +%Y%m%d).tar.gz /var/www/efnafraedi-lesari/
```

---

## Troubleshooting

### Site Not Loading

```bash
# Check Nginx status
sudo systemctl status nginx

# Check config syntax
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 404 on React Routes

Make sure `try_files $uri $uri/ /index.html;` is in your Nginx config.

### SSL Issues

```bash
# Renew certificate manually
sudo certbot renew

# Check certificate details
sudo certbot certificates

# Test SSL configuration
curl -vI https://efnafraedi.app
```

### Permission Issues

```bash
# Fix ownership
sudo chown -R www-data:www-data /var/www/efnafraedi-lesari

# Fix permissions
sudo chmod -R 755 /var/www/efnafraedi-lesari
```

---

## Performance Optimization

### Enable HTTP/2

Already enabled in the config with `http2` directive.

### Enable Brotli Compression (Optional)

```bash
# Install Brotli module
sudo apt install nginx-module-brotli -y

# Add to nginx.conf
# brotli on;
# brotli_comp_level 6;
# brotli_types text/plain text/css application/json application/javascript;
```

### CDN (Optional for Future)

Consider Cloudflare free plan:
- DDoS protection
- Global CDN
- Additional caching
- Free SSL (but Let's Encrypt is fine too)

---

## Security Checklist

- [x] SSL certificate installed
- [x] HTTP redirects to HTTPS
- [x] Security headers configured
- [x] Gzip compression enabled
- [ ] Firewall configured (ufw/iptables)
- [ ] SSH key authentication (disable password auth)
- [ ] Regular system updates
- [ ] Log monitoring

---

## Next Steps After Deployment

1. Set up monitoring (optional):
   - UptimeRobot for downtime alerts
   - Google Analytics or Plausible for usage tracking

2. Create a staging environment (optional):
   - `staging.efnafraedi.app` for testing before production

3. Set up automated backups

4. Configure log rotation:
   ```bash
   sudo nano /etc/logrotate.d/nginx
   ```

---

**Deployment complete!** 🎉

Your Chemistry Reader should now be live at https://efnafraedi.app

Questions or issues? Check the logs first, then refer to the troubleshooting section.
