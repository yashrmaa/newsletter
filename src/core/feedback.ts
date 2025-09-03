import { Article } from '../utils/types.js';
import { loadUserPreferences, updateUserPreferences } from './preferences.js';

export type FeedbackType = 'upvote' | 'downvote';

export async function processFeedback(article: Article, feedback: FeedbackType): Promise<void> {
  const preferences = await loadUserPreferences();
  const adjustment = feedback === 'upvote' ? 0.05 : -0.05;

  // Update topic preferences
  if (article.category && preferences.topics[article.category]) {
    preferences.topics[article.category].interest_score = Math.max(0, Math.min(1, preferences.topics[article.category].interest_score + adjustment));
  }

  // Update subtopic preferences
  if (article.tags) {
    for (const tag of article.tags) {
      for (const topic in preferences.topics) {
        if (preferences.topics[topic].subtopics && preferences.topics[topic].subtopics![tag]) {
          preferences.topics[topic].subtopics![tag] = Math.max(0, Math.min(1, preferences.topics[topic].subtopics![tag]! + adjustment));
        }
      }
    }
  }

  // Update author preferences
  if (article.author) {
    if (!preferences.authors) {
      preferences.authors = {};
    }
    if (!preferences.authors[article.author]) {
      preferences.authors[article.author] = { score: 0.5 };
    }
    preferences.authors[article.author].score = Math.max(0, Math.min(1, preferences.authors[article.author].score + adjustment));
  }

  await updateUserPreferences(preferences);
}
