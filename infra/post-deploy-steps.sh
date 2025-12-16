#!/bin/bash
# Run these commands on EC2 after CloudFormation deployment and DNS is live

# 1. Verify DNS points to this instance
dig +short api.mrsamdev.xyz

# 2. Verify Nginx is running
sudo systemctl status nginx

# 3. Verify backend is running on port 3000
curl http://localhost:3000

# 4. Issue SSL certificate (run once, interactive)
sudo certbot --nginx -d api.mrsamdev.xyz

# 5. Verify HTTPS works
curl https://api.mrsamdev.xyz

# 6. Check certificate auto-renewal is enabled
sudo certbot renew --dry-run

# 7. Verify renewal timer is active
sudo systemctl status certbot-renew.timer
