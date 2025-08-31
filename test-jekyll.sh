#!/bin/bash

echo "🚀 Testing Jekyll build locally..."
echo "================================="

# Navigate to docs directory
cd docs

# Check if Ruby is available
echo "📍 Ruby version:"
ruby --version

# Install dependencies locally
echo ""
echo "📦 Installing Jekyll dependencies..."
gem install bundler --user-install
export PATH="$HOME/.gem/ruby/2.6.0/bin:$PATH"
bundle config set --local path 'vendor/bundle'
bundle install

# Build the site
echo ""
echo "🏗️ Building Jekyll site..."
bundle exec jekyll build --baseurl ""

# Check output
echo ""
echo "✅ Build complete! Files generated:"
ls -la _site/

echo ""
echo "📝 Sample of generated HTML:"
head -50 _site/README.html 2>/dev/null || head -50 _site/index.html

echo ""
echo "🌐 To view locally, run:"
echo "   cd docs && bundle exec jekyll serve"
echo "   Then open: http://localhost:4000"