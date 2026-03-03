import axios from 'axios';
import dotenv from 'dotenv';
import { GitHubEvent } from '../types/index.js';

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || '';
const GITHUB_REPO = process.env.GITHUB_REPO || '';

const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {},
});

export async function fetchPullRequests(
  owner: string = GITHUB_OWNER,
  repo: string = GITHUB_REPO,
  limit: number = 30
): Promise<GitHubEvent[]> {
  try {
    const { data: prs } = await githubApi.get(`/repos/${owner}/${repo}/pulls`, {
      params: { state: 'all', per_page: limit },
    });

    return prs.map((pr: Record<string, unknown>) => ({
      type: 'pull_request',
      repo: `${owner}/${repo}`,
      action: (pr as { merged?: boolean }).merged ? 'merged' : (pr.state || 'open'),
      number: pr.number,
      title: pr.title || '',
      body: pr.body || '',
      user: (pr.user as { login?: string })?.login || '',
      created_at: pr.created_at as string,
    }));
  } catch (error) {
    console.error('GitHub PR fetch error:', error);
    return [];
  }
}

export async function fetchIssues(
  owner: string = GITHUB_OWNER,
  repo: string = GITHUB_REPO,
  limit: number = 30
): Promise<GitHubEvent[]> {
  try {
    const { data: issues } = await githubApi.get(`/repos/${owner}/${repo}/issues`, {
      params: { state: 'all', per_page: limit, since: '2020-01-01' },
    });

    return issues
      .filter((issue: Record<string, unknown>) => !issue.pull_request)
      .map((issue: Record<string, unknown>) => ({
        type: 'issue',
        repo: `${owner}/${repo}`,
        action: issue.state || 'open',
        number: issue.number,
        title: issue.title || '',
        body: issue.body || '',
        user: (issue.user as { login?: string })?.login || '',
        created_at: issue.created_at as string,
      }));
  } catch (error) {
    console.error('GitHub issue fetch error:', error);
    return [];
  }
}

export async function fetchCommits(
  owner: string = GITHUB_OWNER,
  repo: string = GITHUB_REPO,
  limit: number = 30
): Promise<GitHubEvent[]> {
  try {
    const { data: commits } = await githubApi.get(`/repos/${owner}/${repo}/commits`, {
      params: { per_page: limit },
    });

    return commits.map((commit: Record<string, unknown>) => ({
      type: 'commit',
      repo: `${owner}/${repo}`,
      sha: commit.sha as string,
      title: (commit.commit as { message?: string })?.message?.split('\n')[0] || '',
      user: (commit.author as { login?: string })?.login || '',
      created_at: (commit.commit as { author?: { date?: string } })?.author?.date || '',
    }));
  } catch (error) {
    console.error('GitHub commit fetch error:', error);
    return [];
  }
}
