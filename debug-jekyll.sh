#!/bin/bash

echo "🔍 Jekyll Debugging Script"
echo "=========================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to docs directory
cd docs

echo "📁 Current directory: $(pwd)"
echo ""

# Check Ruby version
echo "💎 Ruby version:"
ruby --version
echo ""

# Check if Jekyll is installed
echo "🔧 Checking Jekyll installation:"
which jekyll || echo -e "${RED}❌ Jekyll not found in PATH${NC}"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
echo "Installing bundler..."
gem install bundler --user-install 2>&1 | tail -5

# Add user gems to PATH
export PATH="$HOME/.gem/ruby/2.6.0/bin:$PATH"
export GEM_HOME="$HOME/.gem/ruby/2.6.0"

# Configure bundler
echo "Configuring bundler..."
bundle config set --local path 'vendor/bundle'

# Install Jekyll and dependencies
echo "Installing Jekyll dependencies..."
bundle install 2>&1 | tail -10
echo ""

# Check Jekyll config
echo "📄 Jekyll configuration (_config.yml):"
echo "--------------------------------------"
cat _config.yml | head -20
echo "..."
echo ""

# Check for Jekyll layouts
echo "📂 Layout files:"
ls -la _layouts/
echo ""

# Check Markdown files
echo "📝 Markdown files to be processed:"
ls -la *.md
echo ""

# Try to build Jekyll site
echo "🏗️  Building Jekyll site..."
echo "=========================="
bundle exec jekyll build --verbose --trace 2>&1 | head -50
BUILD_STATUS=$?

echo ""
if [ $BUILD_STATUS -eq 0 ]; then
    echo -e "${GREEN}✅ Jekyll build succeeded!${NC}"
    echo ""
    echo "📁 Generated files in _site/:"
    ls -la _site/ 2>/dev/null | head -20
    echo ""
    echo "🔍 Checking for key HTML files:"
    [ -f _site/index.html ] && echo -e "${GREEN}✅ index.html found${NC}" || echo -e "${RED}❌ index.html NOT found${NC}"
    [ -f _site/README.html ] && echo -e "${GREEN}✅ README.html found${NC}" || echo -e "${RED}❌ README.html NOT found${NC}"
    [ -f _site/archive.html ] && echo -e "${GREEN}✅ archive.html found${NC}" || echo -e "${RED}❌ archive.html NOT found${NC}"
    echo ""
    echo "📄 Sample of generated index.html:"
    head -30 _site/index.html 2>/dev/null
else
    echo -e "${RED}❌ Jekyll build failed!${NC}"
    echo "Check the error messages above."
fi

echo ""
echo "🔧 Debugging Tips:"
echo "=================="
echo "1. To run Jekyll locally with live reload:"
echo "   cd docs && bundle exec jekyll serve --trace"
echo ""
echo "2. To check GitHub Actions logs:"
echo "   - Go to: https://github.com/yashvardhan90/newsletter/actions"
echo "   - Click on the latest workflow run"
echo "   - Expand the 'Build Jekyll site' step"
echo ""
echo "3. Common issues:"
echo "   - Missing Gemfile.lock: Run 'bundle install' locally first"
echo "   - Permission issues: Use 'bundle config set --local path vendor/bundle'"
echo "   - Wrong baseurl: Check _config.yml baseurl matches GitHub repo name"
echo ""
echo "4. To test with production settings:"
echo "   JEKYLL_ENV=production bundle exec jekyll build --baseurl /newsletter"