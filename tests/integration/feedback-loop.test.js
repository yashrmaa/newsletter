const { strict: assert } = require('assert');
const { promises: fs } = require('fs');
const path = require('path');
const { NewsletterScheduler } = require('../../dist/core/scheduler.js');
const { Octokit } = require('@octokit/rest');
const { newsletterConfig } = require('../../dist/core/config.js');

const TEST_PREFERENCES_PATH = path.resolve('./data/preferences/test-user-preferences.json');
const ORIGINAL_PREFERENCES_PATH = path.resolve('./data/preferences/user-preferences.json');

async function setup() {
  const originalData = await fs.readFile(ORIGINAL_PREFERENCES_PATH, 'utf-8');
  await fs.writeFile(TEST_PREFERENCES_PATH, originalData, 'utf-8');
  // This is a hack to point the preferences module to the test file.
  // In a real test environment, you would use a mocking library.
  const preferencesModule = require('../../dist/core/preferences.js');
  preferencesModule.setPreferencesFilePath(TEST_PREFERENCES_PATH);
}

async function cleanup() {
  await fs.unlink(TEST_PREFERENCES_PATH);
}

async function runFeedbackLoopTest() {
  console.log('🧪 Testing Feedback Loop Integration');
  console.log('===================================');

  await setup();

  try {
    const scheduler = new NewsletterScheduler();
    const octokit = new Octokit({ auth: newsletterConfig.github.token });
    const owner = newsletterConfig.github.username;
    const repo = scheduler.extractRepoName(newsletterConfig.github.repo);

    // 1. Generate initial newsletter
    console.log('\n1️⃣ Generating initial newsletter...');
    await scheduler.generateDailyNewsletter();
    const curatedArticlesData = await fs.readFile('./data/curated-articles.json', 'utf-8');
    const curatedArticles = JSON.parse(curatedArticlesData);
    const articleToLike = curatedArticles[0];
    console.log(`   ✅ Initial newsletter generated. Article to like: "${articleToLike.title}"`);

    // 2. Simulate Giscus feedback
    console.log('\n2️⃣ Simulating Giscus feedback...');
    // Create a discussion for the article
    const discussion = await octokit.discussions.create({
      owner,
      repo,
      category: 'Announcements',
      title: `Test Discussion for ${articleToLike.id}`,
      body: 'This is a test discussion.',
    });
    console.log(`   ✅ Discussion created: ${discussion.data.html_url}`);

    // Add a reaction to the discussion
    await octokit.reactions.createForDiscussion({
      owner,
      repo,
      discussion_number: discussion.data.number,
      content: '+1',
    });
    console.log('   ✅ Reaction added to discussion.');

    // 3. Generate second newsletter
    console.log('\n3️⃣ Generating second newsletter...');
    await scheduler.generateDailyNewsletter();
    console.log('   ✅ Second newsletter generated.');

    // 4. Verify preferences updated
    console.log('\n4️⃣ Verifying preferences updated...');
    const prefsData = await fs.readFile(TEST_PREFERENCES_PATH, 'utf-8');
    const prefs = JSON.parse(prefsData);
    const authorScore = prefs.authors[articleToLike.author].score;
    assert(authorScore > 0.5, `Author score should have increased. Got: ${authorScore}`);
    console.log(`   ✅ Author score updated correctly: ${authorScore}`);

    // 5. Verify new newsletter reflects preferences
    console.log('\n5️⃣ Verifying new newsletter reflects preferences...');
    const newCuratedArticlesData = await fs.readFile('./data/curated-articles.json', 'utf-8');
    const newCuratedArticles = JSON.parse(newCuratedArticlesData);
    // This is a simple assertion. A more robust test would check the ranking more thoroughly.
    assert(newCuratedArticles[0].author === articleToLike.author, 'Liked author should be ranked higher.');
    console.log('   ✅ New newsletter reflects updated preferences.');

    // Cleanup the discussion
    await octokit.discussions.delete({
        owner,
        repo,
        discussion_number: discussion.data.number,
    });
    console.log('\n✅ Test discussion cleaned up.');

  } finally {
    await cleanup();
  }
}

runFeedbackLoopTest().catch(err => {
  console.error(err);
  process.exit(1);
});
