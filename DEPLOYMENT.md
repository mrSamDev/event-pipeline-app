# WBD Martech Deployment Guide

This guide covers deploying the WBD Martech application using CloudFormation and GitHub Actions.

## Quick Fix: BetterAuth Sessions Not Working

If your sessions aren't persisting after deployment, run this on your EC2 instance:

```bash
cd /opt/app/event-pipeline-app
git pull origin main
cp .env.production .env
pm2 restart wbd-api
pm2 logs wbd-api --lines 20
```

**Root Cause**: `BETTER_AUTH_URL` must point to your API domain (`https://api-veritas.mrsamdev.xyz`), not your frontend domain. See [Environment Configuration](#environment-configuration) below.

## Environment Configuration

This project uses separate environment files:

- **`.env`** - Local development (gitignored)
- **`.env.production`** - Production configuration (committed to repo)
- **`.env.example`** - Template for required variables

### Critical Settings for BetterAuth

The most important setting is `BETTER_AUTH_URL`. This **must** point to your API domain:

```bash
# ✅ CORRECT
BETTER_AUTH_URL=https://api-veritas.mrsamdev.xyz

# ❌ WRONG - DO NOT use frontend domain
BETTER_AUTH_URL=https://dc3a9tlp5b5jk.cloudfront.net
```

**Why?** BetterAuth uses this URL to:
- Generate callback URLs
- Set cookie domains correctly
- Validate session origins

When it points to the frontend, cookies are set for the wrong domain and sessions fail.

### Development Environment (.env)

```bash
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/martech
VITE_API_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
BETTER_AUTH_SECRET=your-dev-secret
BETTER_AUTH_URL=http://localhost:3000
```

### Production Environment (.env.production)

```bash
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb://user:pass@host:27017/martech
VITE_API_URL=https://api-veritas.mrsamdev.xyz
ALLOWED_ORIGINS=https://www.veritas.mrsamdev.xyz,https://dc3a9tlp5b5jk.cloudfront.net
BETTER_AUTH_SECRET=your-production-secret
BETTER_AUTH_URL=https://api-veritas.mrsamdev.xyz
```

## Architecture Overview

- **Frontend**: React app hosted on S3 + CloudFront
- **Backend**: Node.js API on EC2 with Nginx reverse proxy
- **Infrastructure**: Managed via CloudFormation in **us-east-1** region

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI configured
3. ACM Certificate:
   - Wildcard certificate `*.mrsamdev.xyz` or specific certificates for `martech.mrsamdev.xyz` and `api.martech.mrsamdev.xyz` in **us-east-1**
4. EC2 Key Pair in us-east-1 region
5. GitHub repository secrets configured (for GitHub Actions)

## Initial Infrastructure Deployment

### 1. Deploy CloudFormation Stack

```bash
# Using the Makefile
make deploy CERT_ARN=<frontend-cert-arn> BACKEND_CERT_ARN=<backend-cert-arn> KEY_NAME=<your-key-name>

# Or using AWS CLI directly
aws cloudformation deploy \
  --template-file infra/cloudformation.yaml \
  --stack-name wbd-martech-stack \
  --parameter-overrides \
    KeyName=<your-key-name> \
    FrontendCertificateArn=<frontend-cert-arn> \
    BackendCertificateArn=<backend-cert-arn> \
  --capabilities CAPABILITY_IAM \
  --region us-east-1
```

### 2. Get Stack Outputs

```bash
make outputs

# Or using AWS CLI
aws cloudformation describe-stacks \
  --stack-name wbd-martech-stack \
  --query 'Stacks[0].Outputs' \
  --region us-east-1
```

You'll get:
- `FrontendURL`: CloudFront distribution URL
- `BackendALBDNS`: ALB DNS name (e.g., `wbd-martech-backend-alb-123456789.ap-south-1.elb.amazonaws.com`)
- `BackendURL`: Direct ALB HTTPS URL
- `S3BucketName`: S3 bucket for frontend
- `CloudFrontDistributionId`: For cache invalidation

### 3. Configure DNS in Hostinger

You need to add two CNAME records in Hostinger:

#### Frontend CNAME
- **Type**: CNAME
- **Name**: `martech.mrsamdev.xyz`
- **Value**: `<CloudFront-Distribution-Domain>` (from FrontendURL output)

#### Backend CNAME
- **Type**: CNAME
- **Name**: `api.martech.mrsamdev.xyz`
- **Value**: `<BackendALBDNS>` (from BackendALBDNS output)

Note: You already have ACM validation CNAMEs set up, keep those as well.

## GitHub Actions Setup

### 1. Configure GitHub Secrets

Add these secrets to your GitHub repository:

```
AWS_ROLE_ARN=arn:aws:iam::<account-id>:role/<role-name>
```

### 2. Create IAM Role for GitHub Actions (OIDC)

```bash
# Create trust policy for GitHub OIDC
cat > github-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:<YOUR_GITHUB_ORG>/<YOUR_REPO>:*"
        }
      }
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name GitHubActionsDeployRole \
  --assume-role-policy-document file://github-trust-policy.json

# Attach permissions
cat > deploy-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::wbd-martech-fe-<ACCOUNT_ID>/*",
        "arn:aws:s3:::wbd-martech-fe-<ACCOUNT_ID>"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:DescribeStacks"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-name DeployPolicy \
  --policy-document file://deploy-policy.json
```

### 3. Trigger Deployment

The workflow automatically deploys when:
- You push to `main` branch
- Changes are made to `apps/web/**`
- Changes are made to the workflow file

Or trigger manually:
```bash
# Via GitHub UI: Actions → Deploy Frontend to S3 → Run workflow

# Or via GitHub CLI
gh workflow run deploy-frontend.yml
```

## Backend Deployment

The backend automatically deploys when the EC2 instance starts via UserData script. To redeploy:

```bash
# SSH into the EC2 instance
ssh -i <your-key.pem> ec2-user@<ec2-public-ip>

# Navigate to app directory
cd /opt/app/event-pipeline-app

# Pull latest changes
git pull origin main

# Copy production environment
cp .env.production .env

# Rebuild and restart
pnpm install
pnpm --filter api build
pm2 restart wbd-api

# Check logs
pm2 logs wbd-api
```

## Health Checks

### Frontend
```bash
curl https://martech.mrsamdev.xyz
```

### Backend
```bash
curl https://api.martech.mrsamdev.xyz/health
```

## Monitoring

- **CloudFront**: Check AWS Console → CloudFront → Distributions
- **ALB**: Check AWS Console → EC2 → Load Balancers → Target Health
- **EC2**: Check AWS Console → EC2 → Instances
- **GitHub Actions**: Check repository → Actions tab

## Troubleshooting

### Sessions Not Persisting

**Symptom**: User can log in but session doesn't persist across page refreshes.

**Solution**:
```bash
# SSH to EC2
ssh -i <your-key.pem> ec2-user@<ec2-ip>

# Check BETTER_AUTH_URL
cat /opt/app/event-pipeline-app/.env | grep BETTER_AUTH_URL

# Should show:
# BETTER_AUTH_URL=https://api-veritas.mrsamdev.xyz

# If wrong, fix it:
cd /opt/app/event-pipeline-app
cp .env.production .env
pm2 restart wbd-api
```

### CORS Errors

**Symptom**: Browser console shows CORS policy errors.

**Solution**:
```bash
# Check allowed origins
cat /opt/app/event-pipeline-app/.env | grep ALLOWED_ORIGINS

# Should include your frontend domain
# ALLOWED_ORIGINS=https://www.veritas.mrsamdev.xyz,https://dc3a9tlp5b5jk.cloudfront.net
```

### Cookies Not Being Set

**Checklist**:
1. HTTPS is enabled (required for secure cookies)
2. `BETTER_AUTH_URL` points to API domain
3. CORS credentials enabled (already in code)
4. Check browser DevTools → Application → Cookies

### View Logs

```bash
# PM2 logs
pm2 logs wbd-api

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Application logs in production
pm2 logs wbd-api --lines 100
```

### Frontend not loading
1. Check CloudFront distribution is deployed
2. Verify DNS CNAME is pointing to CloudFront
3. Check S3 bucket has files: `aws s3 ls s3://wbd-martech-fe-<account-id>/`
4. Check CloudFront invalidation: `aws cloudfront list-invalidations --distribution-id <dist-id>`

### Backend not responding
1. Check ALB target health: `aws elbv2 describe-target-health --target-group-arn <tg-arn>`
2. SSH to EC2 and check PM2: `pm2 status`
3. Check backend logs: `pm2 logs wbd-api`
4. Verify security groups allow traffic from ALB to EC2 on port 3000

### SSL Certificate issues
1. Verify certificates are in correct regions:
   - Frontend cert must be in **us-east-1**
   - Backend cert must be in **ap-south-1**
2. Check certificate validation status in ACM console
3. Verify Hostinger DNS has the ACM validation CNAMEs

## Cleanup

To delete all resources:

```bash
make delete

# Or using AWS CLI
aws cloudformation delete-stack --stack-name wbd-martech-stack --region us-east-1
```

**Note**: Empty the S3 bucket first if the deletion fails:
```bash
aws s3 rm s3://wbd-martech-fe-<account-id>/ --recursive
```

## Security Notes

**WARNING**: `.env.production` contains production secrets and is committed to the repo.

This is acceptable for:
- Private repositories
- Rapid iteration/testing
- Small teams

For enhanced security, consider:
- AWS Secrets Manager
- Environment variables in CI/CD
- HashiCorp Vault

**Never commit sensitive credentials to public repositories.**

## Cost Optimization

- **EC2**: Using t3.micro (Free Tier eligible)
- **S3**: Pay per storage and requests
- **CloudFront**: Free tier includes 1TB data transfer
- **ALB**: ~$16/month (no free tier)

Consider using EC2 with Elastic IP (simpler, cheaper) if you don't need ALB features like auto-scaling and SSL termination.
