#!/usr/bin/env node

import { NewsletterScheduler } from './core/scheduler.js';
import { logger } from './core/logger.js';
import { format } from 'date-fns';

async function main() {
  const startTime = Date.now();
  
  logger.info('=' .repeat(60));
  logger.info('🌅 DAILY NEWSLETTER GENERATOR STARTING');
  logger.info('=' .repeat(60));
  logger.info(`📅 Date: ${format(new Date(), 'EEEE, MMMM do, yyyy')}`);
  logger.info(`⏰ Time: ${format(new Date(), 'h:mm:ss a')}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`💻 Platform: ${process.platform}`);
  logger.info(`📦 Node.js: ${process.version}`);
  
  // Environment checks
  if (process.env.CI) {
    logger.info('🔄 Running in GitHub Actions');
  }
  
  if (process.env.DEBUG_MODE === 'true') {
    logger.info('🐛 Debug mode enabled');
  }
  
  if (process.env.TEST_MODE === 'true') {
    logger.info('🧪 Test mode enabled');
  }

  const scheduler = new NewsletterScheduler();
  
  try {
    // Health check first
    logger.info('🔍 Performing system health check...');
    const healthCheck = await scheduler.healthCheck();
    
    if (healthCheck.status !== 'healthy') {
      logger.warn('⚠️ Health check issues detected:', healthCheck.details);
      
      // Continue anyway in production, but fail in development
      if (!process.env.CI && process.env.NODE_ENV !== 'production') {
        throw new Error('Health check failed - fix configuration before continuing');
      }
    } else {
      logger.info('✅ All systems healthy');
    }
    
    // Generate the newsletter
    await scheduler.generateDailyNewsletter();
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    logger.info('=' .repeat(60));
    logger.info('🎉 NEWSLETTER GENERATION COMPLETED SUCCESSFULLY');
    logger.info('=' .repeat(60));
    logger.info(`⏱️  Total time: ${duration}s`);
    logger.info(`📊 Peak memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    
    if (process.env.CI) {
      logger.info('🚀 Newsletter is now live on GitHub Pages!');
      logger.info('☕ Grab your coffee and enjoy your personalized news!');
    }
    
    process.exit(0);
    
  } catch (error: any) {
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    logger.error('=' .repeat(60));
    logger.error('❌ NEWSLETTER GENERATION FAILED');
    logger.error('=' .repeat(60));
    logger.error(`⏱️  Failed after: ${duration}s`);
    logger.error(`🔥 Error: ${error.message}`);
    
    if (process.env.DEBUG_MODE === 'true' && error.stack) {
      logger.error('📋 Stack trace:', error.stack);
    }
    
    // Provide helpful troubleshooting info
    logger.error('🔧 Troubleshooting tips:');
    logger.error('   1. Check your API keys are set correctly');
    logger.error('   2. Verify your GitHub repository has Pages enabled');
    logger.error('   3. Ensure all required secrets are configured');
    logger.error('   4. Check the GitHub Actions logs for more details');
    
    if (process.env.CI) {
      // In GitHub Actions, provide additional context
      logger.error('📋 GitHub Actions context:');
      logger.error(`   - Repository: ${process.env.GITHUB_REPOSITORY}`);
      logger.error(`   - Run ID: ${process.env.GITHUB_RUN_ID}`);
      logger.error(`   - Workflow: ${process.env.GITHUB_WORKFLOW}`);
    }
    
    process.exit(1);
  }
}

// Handle uncaught exceptions and rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('🔥 Unhandled Promise Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('🔥 Uncaught Exception:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the application
main();