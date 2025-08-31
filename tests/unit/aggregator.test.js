// Content Aggregation Tests
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Content Aggregation System');
console.log('=====================================');

// Mock article data
const mockArticles = JSON.parse(
  fs.readFileSync(join(__dirname, '../mock-data/sample-articles.json'), 'utf8')
);

// Test 1: Article data structure validation
function testArticleStructure() {
  console.log('\n1️⃣ Testing article data structure...');
  
  const requiredFields = [
    'id', 'title', 'url', 'excerpt', 'publishedAt', 
    'source', 'category', 'tags'
  ];
  
  let validArticles = 0;
  
  for (const article of mockArticles) {
    const hasAllFields = requiredFields.every(field => {
      if (field === 'source') {
        return article.source && article.source.id && article.source.name;
      }
      if (field === 'tags') {
        return Array.isArray(article.tags);
      }
      return article[field] !== undefined && article[field] !== '';
    });
    
    if (hasAllFields) {
      validArticles++;
      console.log(`   ✅ ${article.title.substring(0, 50)}...`);
    } else {
      console.log(`   ❌ Invalid article: ${article.title || 'Unknown'}`);
    }
  }
  
  console.log(`   Result: ${validArticles}/${mockArticles.length} articles have valid structure`);
  return validArticles === mockArticles.length;
}

// Test 2: Article categorization
function testArticleCategorization() {
  console.log('\n2️⃣ Testing article categorization...');
  
  const categoryCount = {};
  const validCategories = ['technology', 'business', 'science', 'general', 'politics'];
  
  for (const article of mockArticles) {
    const category = article.category;
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  }
  
  console.log('   Category distribution:');
  let validCategorization = true;
  
  for (const [category, count] of Object.entries(categoryCount)) {
    if (validCategories.includes(category)) {
      console.log(`   ✅ ${category}: ${count} articles`);
    } else {
      console.log(`   ❌ Invalid category: ${category}`);
      validCategorization = false;
    }
  }
  
  console.log(`   Result: All categories are ${validCategorization ? 'valid' : 'invalid'}`);
  return validCategorization;
}

// Test 3: Article freshness and dates
function testArticleFreshness() {
  console.log('\n3️⃣ Testing article freshness and dates...');
  
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  let recentArticles = 0;
  let validDates = 0;
  
  for (const article of mockArticles) {
    try {
      const publishDate = new Date(article.publishedAt);
      
      if (!isNaN(publishDate.getTime())) {
        validDates++;
        
        if (publishDate >= oneDayAgo) {
          recentArticles++;
        }
        
        console.log(`   ✅ ${article.source.name}: ${publishDate.toLocaleString()}`);
      } else {
        console.log(`   ❌ Invalid date for: ${article.title}`);
      }
    } catch (error) {
      console.log(`   ❌ Date parsing error: ${article.title}`);
    }
  }
  
  console.log(`   Result: ${validDates}/${mockArticles.length} valid dates, ${recentArticles} recent articles`);
  return validDates === mockArticles.length;
}

// Test 4: Article content quality
function testArticleQuality() {
  console.log('\n4️⃣ Testing article content quality...');
  
  let qualityArticles = 0;
  
  for (const article of mockArticles) {
    let score = 0;
    const checks = [];
    
    // Title length check
    if (article.title.length >= 10 && article.title.length <= 150) {
      score++;
      checks.push('✅ Title length');
    } else {
      checks.push('❌ Title length');
    }
    
    // Excerpt quality check
    if (article.excerpt && article.excerpt.length >= 50 && article.excerpt.length <= 500) {
      score++;
      checks.push('✅ Excerpt quality');
    } else {
      checks.push('❌ Excerpt quality');
    }
    
    // URL validity check
    if (article.url && article.url.startsWith('http')) {
      score++;
      checks.push('✅ Valid URL');
    } else {
      checks.push('❌ Invalid URL');
    }
    
    // Tags check
    if (article.tags && article.tags.length > 0) {
      score++;
      checks.push('✅ Has tags');
    } else {
      checks.push('❌ No tags');
    }
    
    const passed = score >= 3; // Require at least 3/4 checks to pass
    if (passed) {
      qualityArticles++;
    }
    
    console.log(`   ${passed ? '✅' : '❌'} ${article.source.name}: ${score}/4 quality checks`);
  }
  
  console.log(`   Result: ${qualityArticles}/${mockArticles.length} articles meet quality standards`);
  return qualityArticles === mockArticles.length;
}

// Test 5: Source diversity
function testSourceDiversity() {
  console.log('\n5️⃣ Testing source diversity...');
  
  const sources = new Set();
  const sourceCategories = new Set();
  
  for (const article of mockArticles) {
    sources.add(article.source.id);
    sourceCategories.add(article.category);
  }
  
  const uniqueSources = sources.size;
  const uniqueCategories = sourceCategories.size;
  
  console.log(`   📊 Unique sources: ${uniqueSources}`);
  console.log(`   📊 Unique categories: ${uniqueCategories}`);
  
  // List sources
  console.log('   Sources:');
  for (const article of mockArticles) {
    console.log(`   - ${article.source.name} (${article.category})`);
  }
  
  const hasGoodDiversity = uniqueSources >= 3 && uniqueCategories >= 2;
  console.log(`   Result: Source diversity is ${hasGoodDiversity ? 'good' : 'poor'}`);
  
  return hasGoodDiversity;
}

// Test 6: Deduplication logic simulation
function testDeduplication() {
  console.log('\n6️⃣ Testing deduplication logic...');
  
  // Add a duplicate article to test deduplication
  const testArticles = [...mockArticles];
  const duplicateArticle = {
    ...mockArticles[0],
    id: 'duplicate-test',
    url: 'https://example.com/duplicate'
  };
  testArticles.push(duplicateArticle);
  
  console.log(`   Starting with: ${testArticles.length} articles (including duplicate)`);
  
  // Simple deduplication by title similarity
  const seen = new Set();
  const deduplicated = [];
  
  for (const article of testArticles) {
    const normalizedTitle = article.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50);
    
    if (!seen.has(normalizedTitle)) {
      seen.add(normalizedTitle);
      deduplicated.push(article);
    } else {
      console.log(`   🗑️  Removed duplicate: ${article.title.substring(0, 40)}...`);
    }
  }
  
  console.log(`   After deduplication: ${deduplicated.length} unique articles`);
  console.log(`   Result: Deduplication ${deduplicated.length < testArticles.length ? 'works' : 'failed'}`);
  
  return deduplicated.length === mockArticles.length;
}

// Run all aggregation tests
async function runAggregationTests() {
  console.log('🚀 Starting Content Aggregation Tests\n');
  
  const tests = [
    testArticleStructure,
    testArticleCategorization,
    testArticleFreshness,
    testArticleQuality,
    testSourceDiversity,
    testDeduplication
  ];
  
  let passed = 0;
  for (const test of tests) {
    if (test()) {
      passed++;
    }
  }
  
  console.log('\n📊 Content Aggregation Test Results');
  console.log('===================================');
  console.log(`✅ Passed: ${passed}/${tests.length} test suites`);
  
  if (passed === tests.length) {
    console.log('🎉 All aggregation tests passed!');
  } else {
    console.log('⚠️  Some aggregation issues detected');
  }
  
  return passed === tests.length;
}

// Export for use in other tests
export { runAggregationTests, mockArticles };

// Run tests if this file is executed directly
runAggregationTests();