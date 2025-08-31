#!/bin/bash

# GitHub Secrets Setup Helper Script
# This script helps you set up the required GitHub secrets

set -e

echo "🔐 GitHub Secrets Setup Helper"
echo "==============================="
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "📦 Install it from: https://cli.github.com/"
    echo "   brew install gh"
    echo "   Then run: gh auth login"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "🔑 Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is ready"
echo ""

# Get repository info
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
echo "📁 Current repository: $REPO"
echo ""

echo "🔧 Setting up required secrets..."
echo ""

# Required secrets with prompts
declare -A SECRETS=(
    ["ANTHROPIC_API_KEY"]="Enter your Anthropic API key (from console.anthropic.com):"
    ["GITHUB_TOKEN"]="Enter your GitHub Personal Access Token (with repo access):"
    ["GITHUB_PAGES_REPO"]="Enter your GitHub Pages repository (e.g., username/username.github.io):"
    ["FEEDBACK_SECRET"]="Enter a random secure string (20+ characters):"
)

# Optional secrets
declare -A OPTIONAL_SECRETS=(
    ["NEWS_API_KEY"]="Enter your News API key (from newsapi.org) [OPTIONAL]:"
    ["USER_EMAIL"]="Enter your email for notifications [OPTIONAL]:"
    ["GMAIL_USER"]="Enter your Gmail address [OPTIONAL]:"
    ["GMAIL_APP_PASSWORD"]="Enter your Gmail App Password [OPTIONAL]:"
)

# Set required secrets
for secret in "${!SECRETS[@]}"; do
    echo "🔑 ${secret}"
    echo "   ${SECRETS[$secret]}"
    read -s -p "   Value: " value
    echo ""
    
    if [[ -z "$value" ]]; then
        echo "❌ This secret is required. Exiting."
        exit 1
    fi
    
    gh secret set "$secret" --body "$value"
    echo "✅ Set $secret"
    echo ""
done

echo ""
echo "📝 Optional secrets (press Enter to skip):"
echo ""

# Set optional secrets
for secret in "${!OPTIONAL_SECRETS[@]}"; do
    echo "🔑 ${secret} [OPTIONAL]"
    echo "   ${OPTIONAL_SECRETS[$secret]}"
    read -s -p "   Value: " value
    echo ""
    
    if [[ -n "$value" ]]; then
        gh secret set "$secret" --body "$value"
        echo "✅ Set $secret"
    else
        echo "⏭️  Skipped $secret"
    fi
    echo ""
done

echo ""
echo "🎉 GitHub secrets setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Commit and push your code changes"
echo "2. Go to GitHub Actions tab"
echo "3. Run 'Manual Newsletter Generation' to test"
echo "4. Check your GitHub Pages site for the newsletter"
echo ""
echo "🌐 Your GitHub Pages URL will be:"
echo "   https://$(echo "$REPO" | cut -d'/' -f1).github.io/$(echo "$REPO" | cut -d'/' -f2)/"
echo ""