#!/bin/bash

# AWS SES Email Verification Script

if [ -z "$1" ]; then
    echo "Usage: ./verify-ses-email.sh [email-to-verify]"
    exit 1
fi

# Load environment variables from .env
if [ -f .env ]; then
    set -a
    source .env
    set +a
else
    echo "Error: .env file not found"
    exit 1
fi

EMAIL_TO_VERIFY=$1
AWS_REGION=${AWS_EMAIL_REGION:-"us-west-1"}

echo "Requesting verification for email: $EMAIL_TO_VERIFY in region $AWS_REGION"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI is not installed. Please install it first."
    echo "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Verify the email address with AWS SES
aws ses verify-email-identity \
    --email-address "$EMAIL_TO_VERIFY" \
    --region "$AWS_REGION"

if [ $? -eq 0 ]; then
    echo "Verification email has been sent to $EMAIL_TO_VERIFY"
    echo "Please check the inbox and click the verification link."
    echo "Note: The email might be in your spam/junk folder."
else
    echo "Failed to request verification. Check your AWS credentials and try again."
fi 