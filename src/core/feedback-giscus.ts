import { Octokit } from '@octokit/rest';
import { Article } from '../utils/types.js';
import { processFeedback } from './feedback.js';
import { logger } from './logger.js';

export class GiscusFeedbackFetcher {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(githubToken: string, owner: string, repo: string) {
    this.octokit = new Octokit({ auth: githubToken });
    this.owner = owner;
    this.repo = repo;
  }

  async fetchAndProcessFeedback(articles: Article[]): Promise<void> {
    logger.info('Fetching feedback from GitHub Discussions...');

    for (const article of articles) {
      try {
        const discussion = await this.findDiscussionForArticle(article);
        if (discussion) {
          await this.processDiscussionFeedback(article, discussion);
        }
      } catch (error) {
        logger.error(`Failed to process feedback for article "${article.title}":`, error);
      }
    }
  }

  private async findDiscussionForArticle(article: Article): Promise<any | null> {
    const query = `repo:${this.owner}/${this.repo} category:Announcements "${article.id}" in:title`;
    const response = await this.octokit.search.issuesAndPullRequests({ q: query });

    if (response.data.total_count > 0) {
      return response.data.items[0];
    }
    return null;
  }

  private async processDiscussionFeedback(article: Article, discussion: any): Promise<void> {
    const reactions = await this.octokit.reactions.listForIssue({
      owner: this.owner,
      repo: this.repo,
      issue_number: discussion.number,
    });

    const upvotes = reactions.data.filter(r => r.content === '+1').length;
    const downvotes = reactions.data.filter(r => r.content === '-1').length;

    if (upvotes > 0) {
      for (let i = 0; i < upvotes; i++) {
        await processFeedback(article, 'upvote');
      }
    }

    if (downvotes > 0) {
      for (let i = 0; i < downvotes; i++) {
        await processFeedback(article, 'downvote');
      }
    }
  }
}
