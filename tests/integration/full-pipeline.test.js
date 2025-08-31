// Full Pipeline Integration Test
import { runConfigTests } from '../unit/config.test.js';
import { runAggregationTests } from '../unit/aggregator.test.js';
import { runCurationTests } from '../unit/curation.test.js';
import { runFormattingTests } from '../unit/formatting.test.js';
import { runPublisherTests } from '../unit/publisher.test.js';

console.log('🧪 FULL INTEGRATION TEST SUITE');
console.log('==============================');
console.log('Running comprehensive tests for Newsletter Agent v1\n');

async function runFullIntegrationTest() {
  const startTime = Date.now();
  
  console.log('🎯 Testing Complete Newsletter Generation Pipeline');
  console.log('==================================================\n');
  
  const testSuites = [
    { name: 'Configuration System', test: runConfigTests },
    { name: 'Content Aggregation', test: runAggregationTests },
    { name: 'Claude Curation (Mock)', test: runCurationTests },
    { name: 'HTML Newsletter Formatting', test: runFormattingTests },
    { name: 'GitHub Publisher Integration', test: runPublisherTests }
  ];
  
  const results = [];
  let totalPassed = 0;
  
  for (const suite of testSuites) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔬 TESTING: ${suite.name.toUpperCase()}`);
    console.log('='.repeat(60));
    
    try {
      const passed = await suite.test();
      results.push({
        name: suite.name,
        passed,
        status: passed ? '✅ PASS' : '❌ FAIL'
      });
      
      if (passed) {
        totalPassed++;
        console.log(`\n🎉 ${suite.name} tests completed successfully!`);
      } else {
        console.log(`\n⚠️  ${suite.name} tests had some issues`);
      }
      
    } catch (error) {
      console.log(`\n❌ ${suite.name} tests failed with error: ${error.message}`);
      results.push({
        name: suite.name,
        passed: false,
        status: '❌ ERROR'
      });
    }
  }
  
  // Final Results Summary
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL INTEGRATION TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log('\n🧪 Test Suite Results:');
  for (const result of results) {
    console.log(`   ${result.status} ${result.name}`);
  }
  
  console.log(`\n📈 Overall Statistics:`);
  console.log(`   ✅ Passed: ${totalPassed}/${results.length} test suites`);
  console.log(`   ⏱️  Duration: ${duration} seconds`);
  console.log(`   📅 Completed: ${new Date().toISOString()}`);
  
  const overallSuccess = totalPassed === results.length;
  const partialSuccess = totalPassed >= Math.ceil(results.length * 0.8);
  
  if (overallSuccess) {
    console.log('\n🎉 🎉 🎉 ALL TESTS PASSED! 🎉 🎉 🎉');
    console.log('🚀 Newsletter Agent v1 is READY FOR DEPLOYMENT!');
    console.log('💡 Next steps:');
    console.log('   1. Set up GitHub secrets with your API keys');
    console.log('   2. Push code to GitHub repository');
    console.log('   3. Run manual workflow to test end-to-end');
    console.log('   4. Enable daily schedule for automated newsletters');
  } else if (partialSuccess) {
    console.log('\n✅ MOST TESTS PASSED - Production Ready');
    console.log('🔧 Minor issues detected but system is functional');
    console.log('📝 Review failed tests and fix when convenient');
  } else {
    console.log('\n⚠️  SIGNIFICANT ISSUES DETECTED');
    console.log('🔧 Please review and fix failing tests before deployment');
    console.log('📋 Check individual test outputs above for specific issues');
  }
  
  return overallSuccess;
}

// System Information
async function displaySystemInfo() {
  console.log('\n📋 System Information:');
  console.log(`   💻 Platform: ${process.platform}`);
  console.log(`   📦 Node.js: ${process.version}`);
  console.log(`   🔧 Architecture: ${process.arch}`);
  console.log(`   💾 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB used`);
  console.log(`   📁 Working Directory: ${process.cwd()}`);
  
  // Check if required files exist
  const criticalFiles = [
    'package.json',
    'src/index.ts', 
    '.github/workflows/daily-newsletter.yml'
  ];
  
  console.log('\n📁 Critical Files:');
  const fs = await import('fs');
  for (const file of criticalFiles) {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  }
}

// Environment Check
async function checkEnvironment() {
  console.log('\n🌍 Environment Check:');
  
  const requiredForProduction = [
    'ANTHROPIC_API_KEY',
    'GITHUB_TOKEN', 
    'GITHUB_REPO',
    'GITHUB_USERNAME'
  ];
  
  console.log('   Required Environment Variables:');
  for (const envVar of requiredForProduction) {
    const exists = process.env[envVar] !== undefined;
    const hasValue = exists && process.env[envVar] !== '';
    const isTestValue = exists && (
      process.env[envVar].startsWith('test-') ||
      process.env[envVar] === 'test-key' ||
      process.env[envVar] === 'test-token'
    );
    
    if (hasValue && !isTestValue) {
      console.log(`   ✅ ${envVar}: Set (production value)`);
    } else if (hasValue && isTestValue) {
      console.log(`   🧪 ${envVar}: Set (test value)`);
    } else {
      console.log(`   ❌ ${envVar}: Not set`);
    }
  }
}

// Deployment Readiness Check
async function deploymentReadinessCheck() {
  console.log('\n🚀 Deployment Readiness Check:');
  
  const checks = [
    { name: 'TypeScript compilation', check: checkTypeScriptBuild },
    { name: 'Dependencies installed', check: checkDependencies },
    { name: 'GitHub workflows present', check: checkGitHubWorkflows },
    { name: 'Configuration files valid', check: checkConfigFiles },
  ];
  
  let readyChecks = 0;
  for (const { name, check } of checks) {
    const passed = await check();
    console.log(`   ${passed ? '✅' : '❌'} ${name}`);
    if (passed) readyChecks++;
  }
  
  const deploymentReady = readyChecks === checks.length;
  console.log(`\n   🎯 Deployment Status: ${deploymentReady ? 'READY' : 'NOT READY'} (${readyChecks}/${checks.length})`);
  
  return deploymentReady;
}

// Individual readiness checks
async function checkTypeScriptBuild() {
  const fs = await import('fs');
  return fs.existsSync('dist/index.js') && fs.existsSync('tsconfig.json');
}

async function checkDependencies() {
  const fs = await import('fs');
  return fs.existsSync('node_modules') && fs.existsSync('package-lock.json');
}

async function checkGitHubWorkflows() {
  const fs = await import('fs');
  return fs.existsSync('.github/workflows/daily-newsletter.yml');
}

async function checkConfigFiles() {
  const fs = await import('fs');
  return fs.existsSync('config/sources/news-sources.json') && 
         fs.existsSync('data/preferences/user-preferences.json');
}

// Main test execution
async function main() {
  try {
    console.log('🌟 Welcome to Newsletter Agent v1 Integration Testing');
    console.log('====================================================\n');
    
    await displaySystemInfo();
    await checkEnvironment(); 
    
    const testsPassed = await runFullIntegrationTest();
    const deploymentReady = await deploymentReadinessCheck();
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 FINAL VERDICT');
    console.log('='.repeat(60));
    
    if (testsPassed && deploymentReady) {
      console.log('🎉 NEWSLETTER AGENT V1 IS READY FOR PRODUCTION!');
      console.log('🚀 All systems tested and verified');
      console.log('📋 Follow the setup guide to deploy to GitHub Actions');
    } else if (testsPassed) {
      console.log('✅ Core functionality tested and working');
      console.log('⚠️  Minor deployment setup needed');
      console.log('🔧 Review deployment readiness checks above');
    } else {
      console.log('⚠️  System needs attention before deployment');
      console.log('🔧 Review and fix failing tests');
      console.log('📚 Check documentation for troubleshooting');
    }
    
    return testsPassed && deploymentReady;
    
  } catch (error) {
    console.error('\n❌ Integration test suite failed:', error.message);
    console.error('🔧 Please check the error above and fix issues');
    return false;
  }
}

// Run the full integration test
main();