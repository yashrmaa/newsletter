// Configuration Tests
import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';

console.log('🧪 Testing Configuration System');
console.log('================================');

// Test 1: Verify required files exist
function testRequiredFiles() {
  console.log('\n1️⃣ Testing required files exist...');
  
  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    '.env.example',
    'config/sources/news-sources.json',
    'data/preferences/user-preferences.json',
    'templates/newsletter/base.hbs',
    '.github/workflows/daily-newsletter.yml'
  ];
  
  let passed = 0;
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file}`);
      passed++;
    } else {
      console.log(`   ❌ ${file} - MISSING`);
    }
  }
  
  console.log(`   Result: ${passed}/${requiredFiles.length} files found`);
  return passed === requiredFiles.length;
}

// Test 2: Verify package.json structure
function testPackageJson() {
  console.log('\n2️⃣ Testing package.json structure...');
  
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const requiredFields = ['name', 'version', 'scripts', 'dependencies'];
    const requiredScripts = ['build', 'dev', 'generate'];
    const requiredDeps = ['@anthropic-ai/sdk', '@octokit/rest', 'handlebars', 'rss-parser'];
    
    let tests = 0;
    let passed = 0;
    
    // Check required fields
    for (const field of requiredFields) {
      tests++;
      if (pkg[field]) {
        console.log(`   ✅ Has ${field}`);
        passed++;
      } else {
        console.log(`   ❌ Missing ${field}`);
      }
    }
    
    // Check scripts
    for (const script of requiredScripts) {
      tests++;
      if (pkg.scripts && pkg.scripts[script]) {
        console.log(`   ✅ Has script: ${script}`);
        passed++;
      } else {
        console.log(`   ❌ Missing script: ${script}`);
      }
    }
    
    // Check key dependencies
    for (const dep of requiredDeps) {
      tests++;
      if (pkg.dependencies && pkg.dependencies[dep]) {
        console.log(`   ✅ Has dependency: ${dep}`);
        passed++;
      } else {
        console.log(`   ❌ Missing dependency: ${dep}`);
      }
    }
    
    console.log(`   Result: ${passed}/${tests} package.json checks passed`);
    return passed === tests;
    
  } catch (error) {
    console.log(`   ❌ Error reading package.json: ${error.message}`);
    return false;
  }
}

// Test 3: Verify news sources configuration
function testNewsSourcesConfig() {
  console.log('\n3️⃣ Testing news sources configuration...');
  
  try {
    const sources = JSON.parse(fs.readFileSync('config/sources/news-sources.json', 'utf8'));
    
    let totalSources = 0;
    let validSources = 0;
    
    for (const [category, sourceList] of Object.entries(sources)) {
      console.log(`   📰 ${category}: ${sourceList.length} sources`);
      
      for (const source of sourceList) {
        totalSources++;
        
        const required = ['id', 'name', 'url', 'category', 'priority'];
        const hasAllFields = required.every(field => source[field] !== undefined);
        
        if (hasAllFields && source.url.startsWith('http')) {
          validSources++;
        } else {
          console.log(`   ❌ Invalid source: ${source.id || 'unknown'}`);
        }
      }
    }
    
    console.log(`   Result: ${validSources}/${totalSources} sources are valid`);
    return validSources > 0 && validSources === totalSources;
    
  } catch (error) {
    console.log(`   ❌ Error reading news sources: ${error.message}`);
    return false;
  }
}

// Test 4: Verify user preferences structure
function testUserPreferences() {
  console.log('\n4️⃣ Testing user preferences structure...');
  
  try {
    const prefs = JSON.parse(fs.readFileSync('data/preferences/user-preferences.json', 'utf8'));
    
    const requiredSections = ['topics', 'content_preferences', 'reading_patterns'];
    let tests = 0;
    let passed = 0;
    
    for (const section of requiredSections) {
      tests++;
      if (prefs[section]) {
        console.log(`   ✅ Has ${section} section`);
        passed++;
      } else {
        console.log(`   ❌ Missing ${section} section`);
      }
    }
    
    // Check topics structure
    if (prefs.topics) {
      const topicCount = Object.keys(prefs.topics).length;
      console.log(`   📊 ${topicCount} topics configured`);
      
      for (const [topic, config] of Object.entries(prefs.topics)) {
        tests++;
        if (config.interest_score !== undefined && config.keywords) {
          console.log(`   ✅ Topic ${topic} is properly configured`);
          passed++;
        } else {
          console.log(`   ❌ Topic ${topic} is missing required fields`);
        }
      }
    }
    
    console.log(`   Result: ${passed}/${tests} preference checks passed`);
    return passed === tests;
    
  } catch (error) {
    console.log(`   ❌ Error reading user preferences: ${error.message}`);
    return false;
  }
}

// Test 5: Verify GitHub workflow configuration
function testGitHubWorkflow() {
  console.log('\n5️⃣ Testing GitHub Actions workflow...');
  
  try {
    const workflow = fs.readFileSync('.github/workflows/daily-newsletter.yml', 'utf8');
    
    let tests = 0;
    let passed = 0;
    
    const requiredElements = [
      'name: Generate Daily Newsletter',
      'schedule:',
      'cron:',
      'workflow_dispatch:',
      'ANTHROPIC_API_KEY',
      'GITHUB_TOKEN',
      'npm ci',
      'npm run build',
      'node dist/index.js'
    ];
    
    for (const element of requiredElements) {
      tests++;
      if (workflow.includes(element)) {
        console.log(`   ✅ Contains: ${element}`);
        passed++;
      } else {
        console.log(`   ❌ Missing: ${element}`);
      }
    }
    
    console.log(`   Result: ${passed}/${tests} workflow checks passed`);
    return passed === tests;
    
  } catch (error) {
    console.log(`   ❌ Error reading workflow: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runConfigTests() {
  console.log('🚀 Starting Configuration Tests\n');
  
  const tests = [
    testRequiredFiles,
    testPackageJson,
    testNewsSourcesConfig,
    testUserPreferences,
    testGitHubWorkflow
  ];
  
  let passed = 0;
  for (const test of tests) {
    if (test()) {
      passed++;
    }
  }
  
  console.log('\n📊 Configuration Test Results');
  console.log('=============================');
  console.log(`✅ Passed: ${passed}/${tests.length} test suites`);
  
  if (passed === tests.length) {
    console.log('🎉 All configuration tests passed!');
  } else {
    console.log('⚠️  Some configuration issues detected');
  }
  
  return passed === tests.length;
}

// Export for use in other tests
export { runConfigTests };

// Run tests if this file is executed directly
runConfigTests();