export interface Article {
  id: string;
  title: string;
  url: string;
  excerpt?: string;
  content?: string;
  author?: string;
  publishedAt: Date;
  source: {
    id: string;
    name: string;
    url?: string;
  };
  category: string;
  tags: string[];
  readTime?: number;
  qualityScore?: number;
  relevanceScore?: number;
  summary?: string;
}

export interface ContentSource {
  id: string;
  name: string;
  url: string;
  type: 'rss' | 'api' | 'scraper';
  category: string;
  priority: number;
  enabled?: boolean;
  lastFetched?: Date;
  errorCount?: number;
}

export interface NewsletterData {
  date: Date;
  highlights: Article[];
  categories: {
    name: string;
    articles: Article[];
    icon?: string;
  }[];
  totalArticles: number;
  totalSources: number;
  generationTime: Date;
  publicURL?: string;
  privateURL?: string;
}

export interface CurationCriteria {
  maxArticles: number;
  categoryDistribution: { [category: string]: number };
  qualityThreshold: number;
  diversityWeight: number;
  freshnessWeight: number;
  personalizedWeight: number;
}

export interface UserPreferences {
  interests: string[];
  preferredSources: string[];
  excludeCategories: string[];
  languagePreference: string;
  readingLevel: 'beginner' | 'intermediate' | 'advanced';
  maxReadingTime: number;
  categories: { [category: string]: number };
}