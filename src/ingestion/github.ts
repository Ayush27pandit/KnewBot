import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';
import { GitHubEvent } from '../types/index.js';

dotenv.config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const OWNER = process.env.GITHUB_OWNER || '';
const REPO = process.env.GITHUB_REPO || '';

export async function fetchPullRequests(
  owner: string = OWNER,
  repo: string = REPO,
  limit: number = 50
): Promise<GitHubEvent[]> {
  try {
    const { data: prs } = await octokit.pulls.list({
      owner,
      repo,
      state: 'all',
      per_page: limit,
    });

    return prs.map((pr) => ({
      type: 'pull_request',
      repo: `${owner}/${repo}`,
      action: (pr as { merged?: boolean }).merged ? 'merged' : (pr.state || 'open'),
      number: pr.number,
      title: pr.title || '',
      body: pr.body || '',
      user: pr.user?.login || '',
      created_at: pr.created_at,
    }));
  } catch (error) {
    console.error('GitHub PR fetch error:', error);
    return [];
  }
}

export async function fetchIssues(
  owner: string = OWNER,
  repo: string = REPO,
  limit: number = 50
): Promise<GitHubEvent[]> {
  try {
    const { data: issues } = await octokit.issues.listForRepo({
      owner,
      repo,
      state: 'all',
      per_page: limit,
    });

    return issues
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        type: 'issue',
        repo: `${owner}/${repo}`,
        action: issue.state || 'open',
        number: issue.number,
        title: issue.title || '',
        body: issue.body || '',
        user: issue.user?.login || '',
        created_at: issue.created_at,
      }));
  } catch (error) {
    console.error('GitHub issue fetch error:', error);
    return [];
  }
}

export async function fetchCommits(
  owner: string = OWNER,
  repo: string = REPO,
  limit: number = 50
): Promise<GitHubEvent[]> {
  try {
    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo,
      per_page: limit,
    });

    return commits.map((commit) => ({
      type: 'commit',
      repo: `${owner}/${repo}`,
      title: commit.commit.message || '',
      user: commit.author?.login || '',
      created_at: commit.commit.author?.date || '',
    }));
  } catch (error) {
    console.error('GitHub commit fetch error:', error);
    return [];
  }
}
