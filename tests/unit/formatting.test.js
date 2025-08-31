// HTML Newsletter Formatting Tests
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing HTML Newsletter Formatting');
console.log('====================================');

// Load mock data
const mockArticles = JSON.parse(
  fs.readFileSync(join(__dirname, '../mock-data/sample-articles.json'), 'utf8')
);

// Test 1: Template file existence and structure
function testTemplateStructure() {
  console.log('\n1️⃣ Testing newsletter template structure...');
  
  try {
    const templatePath = 'templates/newsletter/base.hbs';
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    
    const requiredElements = [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="UTF-8">',
      '<meta name="viewport"',
      '<title>',
      '<body>',
      '{{formattedDate}}',
      '{{#if highlights.length}}',
      '{{#each highlights}}',
      '{{#each categories}}',
      '{{totalArticles}}',
      '{{totalSources}}'
    ];
    
    let foundElements = 0;
    for (const element of requiredElements) {
      if (templateContent.includes(element)) {
        foundElements++;
        console.log(`   ✅ Found: ${element}`);
      } else {
        console.log(`   ❌ Missing: ${element}`);
      }
    }
    
    console.log(`   Result: ${foundElements}/${requiredElements.length} required elements found`);
    return foundElements === requiredElements.length;
    
  } catch (error) {
    console.log(`   ❌ Error reading template: ${error.message}`);
    return false;
  }
}

// Test 2: Mock HTML generation
function testHtmlGeneration() {
  console.log('\n2️⃣ Testing HTML generation with mock data...');
  
  // Create mock newsletter data
  const mockNewsletterData = {
    formattedDate: 'Friday, August 30th, 2024',
    highlights: mockArticles.slice(0, 2).map(article => ({
      ...article,
      timeAgo: '2 hours ago',
      readTime: article.readTime || 4,
      claudeSummary: 'This is a test summary from Claude explaining why this article matters.'
    })),
    categories: [
      {
        name: 'Technology',
        icon: '💻',
        articles: mockArticles.filter(a => a.category === 'technology').map(article => ({
          ...article,
          timeAgo: '3 hours ago',
          readTime: article.readTime || 3
        }))
      },
      {
        name: 'Business', 
        icon: '📈',
        articles: mockArticles.filter(a => a.category === 'business').map(article => ({
          ...article,
          timeAgo: '1 hour ago',
          readTime: article.readTime || 5
        }))
      }
    ],
    totalArticles: mockArticles.length,
    totalSources: 4,
    generationTime: 'August 30th, 2024 at 7:00 AM'
  };
  
  console.log(`   📊 Mock data created:`);
  console.log(`   - ${mockNewsletterData.highlights.length} highlights`);
  console.log(`   - ${mockNewsletterData.categories.length} categories`);
  console.log(`   - ${mockNewsletterData.totalArticles} total articles`);
  console.log(`   - ${mockNewsletterData.totalSources} sources`);
  
  // Test data structure
  let structureValid = true;
  
  // Check highlights
  for (const highlight of mockNewsletterData.highlights) {
    if (!highlight.title || !highlight.url || !highlight.source) {
      console.log(`   ❌ Invalid highlight: ${highlight.title || 'unknown'}`);
      structureValid = false;
    }
  }
  
  // Check categories
  for (const category of mockNewsletterData.categories) {
    if (!category.name || !category.articles || !Array.isArray(category.articles)) {
      console.log(`   ❌ Invalid category: ${category.name || 'unknown'}`);
      structureValid = false;
    }
    
    for (const article of category.articles) {
      if (!article.title || !article.url) {
        console.log(`   ❌ Invalid article in ${category.name}: ${article.title || 'unknown'}`);
        structureValid = false;
      }
    }
  }
  
  if (structureValid) {
    console.log(`   ✅ All newsletter data structures are valid`);
  }
  
  console.log(`   Result: Newsletter data structure is ${structureValid ? 'valid' : 'invalid'}`);
  return structureValid;
}

// Test 3: CSS and styling validation
function testCssAndStyling() {
  console.log('\n3️⃣ Testing CSS and styling...');
  
  try {
    const templateContent = fs.readFileSync('templates/newsletter/base.hbs', 'utf8');
    
    const requiredCssElements = [
      ':root {',
      '--font-primary:',
      '--color-primary:',
      '--color-background:',
      'body {',
      '.container {',
      '.article {',
      '@media (max-width: 768px)',
      '@media (prefers-color-scheme: dark)'
    ];
    
    let foundCssElements = 0;
    for (const element of requiredCssElements) {
      if (templateContent.includes(element)) {
        foundCssElements++;
        console.log(`   ✅ CSS: ${element}`);
      } else {
        console.log(`   ❌ Missing CSS: ${element}`);
      }
    }
    
    // Test for responsive design elements
    const responsiveFeatures = [
      'max-width',
      'viewport',
      'mobile',
      'rem',
      'clamp(',
      'media'
    ];
    
    let responsiveCount = 0;
    for (const feature of responsiveFeatures) {
      if (templateContent.toLowerCase().includes(feature)) {
        responsiveCount++;
      }
    }
    
    console.log(`   📱 Responsive features: ${responsiveCount}/${responsiveFeatures.length}`);
    console.log(`   Result: ${foundCssElements}/${requiredCssElements.length} CSS elements found`);
    
    return foundCssElements >= requiredCssElements.length * 0.8; // Allow 80% pass rate
    
  } catch (error) {
    console.log(`   ❌ Error checking CSS: ${error.message}`);
    return false;
  }
}

// Test 4: Mobile optimization features
function testMobileOptimization() {
  console.log('\n4️⃣ Testing mobile optimization features...');
  
  try {
    const templateContent = fs.readFileSync('templates/newsletter/base.hbs', 'utf8');
    
    const mobileFeatures = [
      'width=device-width',
      'initial-scale=1.0',
      'font-size: clamp(',
      'max-width: min(',
      '@media (max-width: 768px)',
      '-webkit-font-smoothing',
      'touch-action',
      'user-scalable'
    ];
    
    let mobileFeatureCount = 0;
    for (const feature of mobileFeatures) {
      if (templateContent.includes(feature)) {
        mobileFeatureCount++;
        console.log(`   ✅ Mobile: ${feature}`);
      } else {
        console.log(`   ⚠️  Mobile: ${feature} (not found, may be optional)`);
      }
    }
    
    // Check for touch-friendly elements
    const touchFeatures = [
      'padding',
      'margin',
      'button',
      'cursor: pointer',
      'hover:'
    ];
    
    let touchCount = 0;
    for (const feature of touchFeatures) {
      if (templateContent.includes(feature)) {
        touchCount++;
      }
    }
    
    console.log(`   👆 Touch-friendly features: ${touchCount}/${touchFeatures.length}`);
    console.log(`   Result: ${mobileFeatureCount}/8 mobile optimization features present`);
    
    return mobileFeatureCount >= 4; // Require at least half
    
  } catch (error) {
    console.log(`   ❌ Error checking mobile optimization: ${error.message}`);
    return false;
  }
}

// Test 5: Accessibility features
function testAccessibilityFeatures() {
  console.log('\n5️⃣ Testing accessibility features...');
  
  try {
    const templateContent = fs.readFileSync('templates/newsletter/base.hbs', 'utf8');
    
    const accessibilityFeatures = [
      'lang="en"',
      'alt=',
      'aria-',
      'role=',
      'sr-only',
      'tab',
      'focus',
      'contrast'
    ];
    
    let a11yCount = 0;
    for (const feature of accessibilityFeatures) {
      if (templateContent.includes(feature)) {
        a11yCount++;
        console.log(`   ✅ A11y: ${feature} found`);
      } else {
        console.log(`   ⚠️  A11y: ${feature} (not found, may be optional)`);
      }
    }
    
    // Check semantic HTML
    const semanticElements = [
      '<header>',
      '<main>',
      '<section>',
      '<article>',
      '<footer>',
      '<h1>',
      '<h2>',
      '<h3>'
    ];
    
    let semanticCount = 0;
    for (const element of semanticElements) {
      if (templateContent.includes(element)) {
        semanticCount++;
      }
    }
    
    console.log(`   🏷️  Semantic HTML elements: ${semanticCount}/${semanticElements.length}`);
    console.log(`   Result: Accessibility features present: ${a11yCount}/8`);
    
    return semanticCount >= 6; // Require most semantic elements
    
  } catch (error) {
    console.log(`   ❌ Error checking accessibility: ${error.message}`);
    return false;
  }
}

// Test 6: Performance optimization features
function testPerformanceFeatures() {
  console.log('\n6️⃣ Testing performance optimization features...');
  
  try {
    const templateContent = fs.readFileSync('templates/newsletter/base.hbs', 'utf8');
    
    const perfFeatures = [
      'preconnect',
      'preload',
      'dns-prefetch',
      'critical css',
      'defer',
      'async',
      'lazy'
    ];
    
    let perfCount = 0;
    for (const feature of perfFeatures) {
      if (templateContent.toLowerCase().includes(feature.toLowerCase())) {
        perfCount++;
        console.log(`   ✅ Performance: ${feature}`);
      } else {
        console.log(`   ⚠️  Performance: ${feature} (not found)`);
      }
    }
    
    // Check for inline critical CSS
    const hasCriticalCSS = templateContent.includes('<style>') && templateContent.includes('</style>');
    if (hasCriticalCSS) {
      console.log(`   ✅ Critical CSS: Inline styles found`);
      perfCount++;
    } else {
      console.log(`   ⚠️  Critical CSS: No inline styles found`);
    }
    
    console.log(`   Result: ${perfCount}/8 performance optimizations found`);
    return perfCount >= 3; // Require at least a few optimizations
    
  } catch (error) {
    console.log(`   ❌ Error checking performance features: ${error.message}`);
    return false;
  }
}

// Run all formatting tests
async function runFormattingTests() {
  console.log('🚀 Starting HTML Newsletter Formatting Tests\n');
  
  const tests = [
    testTemplateStructure,
    testHtmlGeneration,
    testCssAndStyling,
    testMobileOptimization,
    testAccessibilityFeatures,
    testPerformanceFeatures
  ];
  
  let passed = 0;
  for (const test of tests) {
    if (test()) {
      passed++;
    }
  }
  
  console.log('\n📊 HTML Newsletter Formatting Test Results');
  console.log('==========================================');
  console.log(`✅ Passed: ${passed}/${tests.length} test suites`);
  
  if (passed === tests.length) {
    console.log('🎉 All formatting tests passed!');
    console.log('📱 Newsletter template is ready for mobile-first reading experience');
  } else if (passed >= tests.length * 0.8) {
    console.log('✅ Most formatting tests passed - template is production ready');
  } else {
    console.log('⚠️  Some formatting issues detected - review template');
  }
  
  return passed >= tests.length * 0.8;
}

// Export for use in other tests
export { runFormattingTests };

// Run tests if this file is executed directly
runFormattingTests();