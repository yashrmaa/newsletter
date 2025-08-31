#!/usr/bin/env node

// Quick Test Runner for Newsletter Agent
// Usage: npm test or node run-tests.js

console.log('🧪 Newsletter Agent - Quick Test Runner');
console.log('=====================================\n');

import { spawn } from 'child_process';

const tests = [
  {
    name: 'Full Integration Test Suite',
    command: 'node',
    args: ['tests/integration/full-pipeline.test.js'],
    description: 'Complete end-to-end testing of all systems'
  }
];

async function runTest(test) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Running: ${test.name}`);
    console.log(`📝 ${test.description}\n`);
    
    const process = spawn(test.command, test.args, {
      stdio: 'inherit',
      shell: true
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${test.name} completed successfully\n`);
        resolve(true);
      } else {
        console.log(`\n❌ ${test.name} failed with exit code ${code}\n`);
        resolve(false);
      }
    });
    
    process.on('error', (error) => {
      console.error(`\n❌ ${test.name} error:`, error.message);
      reject(error);
    });
  });
}

async function main() {
  let allPassed = true;
  
  for (const test of tests) {
    try {
      const passed = await runTest(test);
      if (!passed) {
        allPassed = false;
      }
    } catch (error) {
      allPassed = false;
      console.error('Test execution error:', error.message);
    }
  }
  
  console.log('=' .repeat(50));
  if (allPassed) {
    console.log('🎉 All tests passed! Newsletter Agent is ready for deployment.');
    console.log('📋 Next steps:');
    console.log('   1. Set up GitHub secrets: ./scripts/setup-github-secrets.sh');
    console.log('   2. Push to GitHub repository');
    console.log('   3. Test manual workflow execution');
    console.log('   4. Enable daily automated newsletters');
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.');
    console.log('🔧 Fix any issues before deploying to production.');
  }
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});