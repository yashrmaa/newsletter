const { strict: assert } = require('assert');
const { promises: fs } = require('fs');
const path = require('path');
const { loadUserPreferences, getUserPreferences, updateUserPreferences, setPreferencesFilePath } = require('../../dist/core/preferences.js');

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
  console.log('🧪 Testing Preferences System');
  console.log('============================');

  await setup();

  try {
    await testLoadUserPreferences();
    await testGetUserPreferences();
    await testUpdateUserPreferences();
  } finally {
    await cleanup();
  }
}

async function testLoadUserPreferences() {
  console.log('\n1️⃣ Testing loadUserPreferences...');
  const prefs = await loadUserPreferences();
  assert.ok(prefs.topics, 'Preferences should have a topics property');
  console.log('   ✅ Preferences loaded successfully');
}

async function testGetUserPreferences() {
  console.log('\n2️⃣ Testing getUserPreferences...');
  const prefs = getUserPreferences();
  assert.ok(prefs.topics, 'Preferences should have a topics property');
  console.log('   ✅ Preferences retrieved successfully');
}

async function testUpdateUserPreferences() {
  console.log('\n3️⃣ Testing updateUserPreferences...');
  const originalPrefs = await loadUserPreferences();
  const originalScore = originalPrefs.topics.technology.interest_score;

  await updateUserPreferences({
    topics: {
      technology: {
        interest_score: 0.99
      }
    }
  });

  const updatedPrefs = await loadUserPreferences();
  assert.strictEqual(updatedPrefs.topics.technology.interest_score, 0.99, 'Interest score should be updated');
  console.log('   ✅ Preferences updated successfully');

  // Restore original score
  await updateUserPreferences({
    topics: {
      technology: {
        interest_score: originalScore
      }
    }
  });
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
