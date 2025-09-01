#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { processFeedback, FeedbackType } from './core/feedback.js';
import { Article } from './utils/types.js';
import { logger } from './core/logger.js';

const CURATED_ARTICLES_PATH = path.resolve('./data/curated-articles.json');

async function main() {
  const [,, articleId, feedback] = process.argv;

  if (!articleId || !feedback) {
    logger.error('Usage: node feedback-processor.js <articleId> <upvote|downvote>');
    process.exit(1);
  }

  if (feedback !== 'upvote' && feedback !== 'downvote') {
    logger.error('Invalid feedback type. Must be "upvote" or "downvote".');
    process.exit(1);
  }

  try {
    const data = await fs.readFile(CURATED_ARTICLES_PATH, 'utf-8');
    const articles: Article[] = JSON.parse(data);

    const article = articles.find(a => a.id === articleId);

    if (!article) {
      logger.error(`Article with ID "${articleId}" not found.`);
      process.exit(1);
    }

    await processFeedback(article, feedback as FeedbackType);

    logger.info(`Feedback processed for article: ${article.title}`);
  } catch (error) {
    logger.error('Failed to process feedback:', error);
    process.exit(1);
  }
}

main();
