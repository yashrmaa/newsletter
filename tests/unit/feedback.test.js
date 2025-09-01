const { strict: assert } = require('assert');
const { promises: fs } = require('fs');
const path = require('path');
const { processFeedback } = require('../../dist/core/feedback.js');
const { loadUserPreferences, updateUserPreferences, setPreferencesFilePath } = require('../../dist/core/preferences.js');

const TEST_PREFERENCES_PATH = path.resolve('./data/preferences/test-user-preferences.json');
const ORIGINAL_PREFERENCES_PATH = path.resolve('./data/preferences/user-preferences.json');

async function setup() {
  const originalData = await fs.readFile(ORIGINAL_PREFERENCES_PATH, 'utf-8');
  await fs.writeFile(TEST_PREFERENCES_PATH, originalData, 'utf-8');
  setPreferencesFilePath(TEST_PREFERENCES_PATH);
}

async function cleanup() {
  await fs.unlink(TEST_PREFERENCES_PATH);
}

async function runTests() {
  console.log('🧪 Testing Feedback System');
  console.log('=========================');

  await setup();

  try {
    await testProcessFeedbackUpvote();
    await testProcessFeedbackDownvote();
  } finally {
    await cleanup();
  }
}

const mockArticle = {
  id: 'test-article',
  url: 'http://example.com',
  title: 'Test Article about AI',
  content: 'This is a test article about AI.',
  publishedAt: new Date(),
  source: { id: 'test-source', name: 'Test Source' },
  category: 'technology',
  tags: ['artificial_intelligence'],
  author: 'Test Author'
};

async function testProcessFeedbackUpvote() {
  console.log('\n1️⃣ Testing processFeedback with upvote...');
  let initialPrefs = await loadUserPreferences();
  initialPrefs.topics.technology.subtopics.artificial_intelligence = 0.5;
  await updateUserPreferences(initialPrefs);
  const initialScore = 0.5;

  await processFeedback(mockArticle, 'upvote');

  const updatedPrefs = await loadUserPreferences();
  const updatedScore = updatedPrefs.topics.technology.subtopics.artificial_intelligence;

  assert.ok(updatedScore > initialScore, 'Interest score should increase on upvote');
  console.log('   ✅ Interest score increased successfully');

  // Restore original score
  initialPrefs.topics.technology.subtopics.artificial_intelligence = 1.0;
  await updateUserPreferences(initialPrefs);
}

async function testProcessFeedbackDownvote() {
  console.log('\n2️⃣ Testing processFeedback with downvote...');
  let initialPrefs = await loadUserPreferences();
  initialPrefs.topics.technology.subtopics.artificial_intelligence = 0.5;
  await updateUserPreferences(initialPrefs);
  const initialScore = 0.5;

  await processFeedback(mockArticle, 'downvote');

  const updatedPrefs = await loadUserPreferences();
  const updatedScore = updatedPrefs.topics.technology.subtopics.artificial_intelligence;

  assert.ok(updatedScore < initialScore, 'Interest score should decrease on downvote');
  console.log('   ✅ Interest score decreased successfully');

  // Restore original score
  initialPrefs.topics.technology.subtopics.artificial_intelligence = 1.0;
  await updateUserPreferences(initialPrefs);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
