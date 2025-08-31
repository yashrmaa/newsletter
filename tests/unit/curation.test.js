// Claude Curation Tests (Mock)
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Claude Curation System (Mock)');
console.log('========================================');

// Load mock data
const mockArticles = JSON.parse(
  fs.readFileSync(join(__dirname, '../mock-data/sample-articles.json'), 'utf8')
);

const mockUserPreferences = JSON.parse(
  fs.readFileSync('data/preferences/user-preferences.json', 'utf8')
);

// Test 1: Preference matching logic
function testPreferenceMatching() {
  console.log('\n1️⃣ Testing preference matching logic...');
  
  let matchedArticles = 0;
  
  for (const article of mockArticles) {
    const articleContent = (article.title + ' ' + article.excerpt + ' ' + article.tags.join(' ')).toLowerCase();
    
    // Check if article matches any user interests
    let hasMatch = false;
    for (const [topic, prefs] of Object.entries(mockUserPreferences.topics)) {
      if (prefs.interest_score < 0.3) continue; // Skip low-interest topics
      
      const keywordMatch = prefs.keywords.some(keyword => 
        articleContent.includes(keyword.toLowerCase())
      );
      
      if (keywordMatch) {
        hasMatch = true;
        console.log(`   ✅ ${article.source.name}: Matches "${topic}" topic`);
        break;
      }
    }
    
    if (hasMatch) {
      matchedArticles++;
    } else {
      console.log(`   ❌ ${article.source.name}: No topic match found`);
    }
  }
  
  console.log(`   Result: ${matchedArticles}/${mockArticles.length} articles match user preferences`);
  return matchedArticles > 0;
}

// Test 2: Article scoring simulation
function testArticleScoring() {
  console.log('\n2️⃣ Testing article scoring simulation...');
  
  const scoredArticles = mockArticles.map(article => {
    let score = 0;
    const factors = [];
    
    // Topic relevance (0-3 points)
    const articleContent = (article.title + ' ' + article.excerpt).toLowerCase();
    for (const [topic, prefs] of Object.entries(mockUserPreferences.topics)) {
      const keywordMatch = prefs.keywords.some(keyword => 
        articleContent.includes(keyword.toLowerCase())
      );
      if (keywordMatch) {
        const topicScore = Math.round(prefs.interest_score * 3);
        score += topicScore;
        factors.push(`${topic}(+${topicScore})`);
        break;
      }
    }
    
    // Recency bonus (0-2 points)
    const publishTime = new Date(article.publishedAt).getTime();
    const now = Date.now();
    const hoursOld = (now - publishTime) / (1000 * 60 * 60);
    
    if (hoursOld < 2) {
      score += 2;
      factors.push('recent(+2)');
    } else if (hoursOld < 12) {
      score += 1;
      factors.push('recent(+1)');
    }
    
    // Quality indicators (0-2 points)
    if (article.readTime && article.readTime >= 3 && article.readTime <= 8) {
      score += 1;
      factors.push('readTime(+1)');
    }
    
    if (article.excerpt.length >= 100) {
      score += 1;
      factors.push('excerpt(+1)');
    }
    
    return { 
      ...article, 
      selectionScore: score, 
      scoringFactors: factors.join(', ') || 'none'
    };
  });
  
  // Sort by score
  scoredArticles.sort((a, b) => b.selectionScore - a.selectionScore);
  
  console.log('   Article scores (sorted):');
  for (const article of scoredArticles) {
    console.log(`   📊 ${article.selectionScore}/10 - ${article.source.name}: ${article.scoringFactors}`);
  }
  
  const highQualityCount = scoredArticles.filter(a => a.selectionScore >= 3).length;
  console.log(`   Result: ${highQualityCount}/${scoredArticles.length} articles score 3+ points`);
  
  return highQualityCount > 0;
}

// Test 3: Category distribution logic
function testCategoryDistribution() {
  console.log('\n3️⃣ Testing category distribution logic...');
  
  const maxArticlesPerCategory = mockUserPreferences.reading_patterns.max_articles_per_category || 3;
  const preferredOrder = mockUserPreferences.reading_patterns.preferred_categories_order || [];
  
  console.log(`   Max articles per category: ${maxArticlesPerCategory}`);
  console.log(`   Preferred order: ${preferredOrder.join(', ')}`);
  
  // Group articles by category
  const categoryGroups = {};
  for (const article of mockArticles) {
    if (!categoryGroups[article.category]) {
      categoryGroups[article.category] = [];
    }
    categoryGroups[article.category].push(article);
  }
  
  const distributedArticles = [];
  
  // First pass: preferred categories
  for (const category of preferredOrder) {
    if (categoryGroups[category]) {
      const categoryArticles = categoryGroups[category].slice(0, maxArticlesPerCategory);
      distributedArticles.push(...categoryArticles);
      console.log(`   ✅ ${category}: ${categoryArticles.length} articles selected`);
    }
  }
  
  // Second pass: remaining categories
  for (const [category, articles] of Object.entries(categoryGroups)) {
    if (!preferredOrder.includes(category)) {
      const categoryArticles = articles.slice(0, maxArticlesPerCategory);
      distributedArticles.push(...categoryArticles);
      console.log(`   ✅ ${category}: ${categoryArticles.length} articles selected`);
    }
  }
  
  console.log(`   Result: ${distributedArticles.length} total articles after distribution`);
  return distributedArticles.length > 0;
}

// Test 4: Mock Claude response parsing
function testClaudeResponseParsing() {
  console.log('\n4️⃣ Testing Claude response parsing simulation...');
  
  // Simulate a Claude API response
  const mockClaudeResponse = `
  [
    {
      "id": "test-article-1",
      "selection_score": 8.5,
      "selection_reason": "High relevance to AI interests and recent breakthrough",
      "target_section": "highlights",
      "claude_summary": "This represents a significant advance in AI reasoning capabilities with broad implications."
    },
    {
      "id": "test-article-2", 
      "selection_score": 7.2,
      "selection_reason": "Strong business relevance and market impact",
      "target_section": "business",
      "claude_summary": "Market rally indicates growing economic confidence across sectors."
    },
    {
      "id": "test-article-3",
      "selection_score": 6.8,
      "selection_reason": "Important climate research with practical applications",
      "target_section": "discovery", 
      "claude_summary": "Novel carbon capture approach could accelerate climate change mitigation efforts."
    }
  ]`;
  
  try {
    const selections = JSON.parse(mockClaudeResponse.trim());
    console.log(`   📝 Parsed ${selections.length} article selections`);
    
    let validSelections = 0;
    for (const selection of selections) {
      const requiredFields = ['id', 'selection_score', 'selection_reason', 'target_section'];
      const hasAllFields = requiredFields.every(field => selection[field] !== undefined);
      
      if (hasAllFields) {
        validSelections++;
        console.log(`   ✅ ${selection.id}: Score ${selection.selection_score}, Section: ${selection.target_section}`);
      } else {
        console.log(`   ❌ ${selection.id}: Missing required fields`);
      }
    }
    
    console.log(`   Result: ${validSelections}/${selections.length} selections are valid`);
    return validSelections === selections.length;
    
  } catch (error) {
    console.log(`   ❌ JSON parsing failed: ${error.message}`);
    return false;
  }
}

// Test 5: Curation criteria validation
function testCurationCriteria() {
  console.log('\n5️⃣ Testing curation criteria validation...');
  
  const mockCriteria = {
    maxArticles: 15,
    categoryDistribution: {
      'highlights': 3,
      'technology': 4, 
      'business': 3,
      'general': 3,
      'discovery': 2
    },
    qualityThreshold: 0.6,
    diversityWeight: 0.3,
    freshnessWeight: 0.4,
    personalizedWeight: 0.3
  };
  
  let validCriteria = 0;
  const totalCriteria = 6;
  
  // Check max articles
  if (mockCriteria.maxArticles > 0 && mockCriteria.maxArticles <= 20) {
    console.log(`   ✅ maxArticles: ${mockCriteria.maxArticles}`);
    validCriteria++;
  } else {
    console.log(`   ❌ maxArticles: ${mockCriteria.maxArticles} (should be 1-20)`);
  }
  
  // Check category distribution
  const totalCategoryArticles = Object.values(mockCriteria.categoryDistribution).reduce((a, b) => a + b, 0);
  if (totalCategoryArticles <= mockCriteria.maxArticles) {
    console.log(`   ✅ categoryDistribution: ${totalCategoryArticles} total articles`);
    validCriteria++;
  } else {
    console.log(`   ❌ categoryDistribution: ${totalCategoryArticles} exceeds maxArticles`);
  }
  
  // Check quality threshold
  if (mockCriteria.qualityThreshold >= 0 && mockCriteria.qualityThreshold <= 1) {
    console.log(`   ✅ qualityThreshold: ${mockCriteria.qualityThreshold}`);
    validCriteria++;
  } else {
    console.log(`   ❌ qualityThreshold: ${mockCriteria.qualityThreshold} (should be 0-1)`);
  }
  
  // Check weights sum to reasonable total
  const totalWeights = mockCriteria.diversityWeight + mockCriteria.freshnessWeight + mockCriteria.personalizedWeight;
  if (totalWeights >= 0.9 && totalWeights <= 1.1) {
    console.log(`   ✅ weights sum: ${totalWeights.toFixed(1)}`);
    validCriteria++;
  } else {
    console.log(`   ❌ weights sum: ${totalWeights.toFixed(1)} (should be ~1.0)`);
  }
  
  // Check individual weight ranges
  const weights = [mockCriteria.diversityWeight, mockCriteria.freshnessWeight, mockCriteria.personalizedWeight];
  const validWeights = weights.every(w => w >= 0 && w <= 1);
  if (validWeights) {
    console.log(`   ✅ individual weights: all in valid range`);
    validCriteria++;
  } else {
    console.log(`   ❌ individual weights: some out of range`);
  }
  
  // Check criteria completeness
  const requiredFields = ['maxArticles', 'categoryDistribution', 'qualityThreshold'];
  const hasRequired = requiredFields.every(field => mockCriteria[field] !== undefined);
  if (hasRequired) {
    console.log(`   ✅ required fields: all present`);
    validCriteria++;
  } else {
    console.log(`   ❌ required fields: some missing`);
  }
  
  console.log(`   Result: ${validCriteria}/${totalCriteria} criteria checks passed`);
  return validCriteria === totalCriteria;
}

// Run all curation tests
async function runCurationTests() {
  console.log('🚀 Starting Claude Curation Tests (Mock)\n');
  
  const tests = [
    testPreferenceMatching,
    testArticleScoring,
    testCategoryDistribution,
    testClaudeResponseParsing,
    testCurationCriteria
  ];
  
  let passed = 0;
  for (const test of tests) {
    if (test()) {
      passed++;
    }
  }
  
  console.log('\n📊 Claude Curation Test Results (Mock)');
  console.log('======================================');
  console.log(`✅ Passed: ${passed}/${tests.length} test suites`);
  
  if (passed === tests.length) {
    console.log('🎉 All curation tests passed!');
    console.log('💡 Note: These are mock tests. Real Claude API integration will be tested in production.');
  } else {
    console.log('⚠️  Some curation logic issues detected');
  }
  
  return passed === tests.length;
}

// Export for use in other tests
export { runCurationTests };

// Run tests if this file is executed directly
runCurationTests();