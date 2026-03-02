import pool from '../src/db/connection.js';

const mockMemories = [
  {
    type: 'decision',
    summary: 'Switched from MongoDB to PostgreSQL for better transaction support',
    content: 'After experiencing issues with MongoDB transactions and data consistency, the team decided to migrate to PostgreSQL. The main drivers were: ACID compliance, better join performance, and established patterns for complex queries.',
    source_type: 'slack',
    source_id: 'mock-slack-1',
    source_url: 'https://slack.com/archives/C0123456789/p1234567890',
    timestamp: new Date('2024-01-15'),
    confidence: 0.95,
    reason: 'MongoDB transactions were causing data inconsistency issues',
    outcome: 'Improved data consistency and query performance'
  },
  {
    type: 'decision',
    summary: 'Adopted TypeScript for all new frontend projects',
    content: 'The frontend team decided to standardize on TypeScript for all new projects. This decision was made after evaluating the DX improvements and type safety benefits.',
    source_type: 'github',
    source_id: 'mock-pr-101',
    source_url: 'https://github.com/company/project/pull/101',
    timestamp: new Date('2024-02-01'),
    confidence: 0.92,
    reason: 'Improve type safety and developer experience',
    outcome: 'Faster debugging and better code documentation'
  },
  {
    type: 'incident',
    summary: 'API outage due to rate limiting on third-party service',
    content: 'On March 10th, the API experienced a 30-minute outage. Root cause was hitting rate limits on the email service provider. The fix involved implementing exponential backoff and caching.',
    source_type: 'slack',
    source_id: 'mock-slack-2',
    source_url: 'https://slack.com/archives/C0987654321/p9876543210',
    timestamp: new Date('2024-03-10'),
    confidence: 0.88,
    reason: 'Exceeded rate limit on external email service',
    outcome: 'Implemented circuit breaker pattern and caching layer'
  },
  {
    type: 'decision',
    summary: 'Implemented CI/CD pipeline using GitHub Actions',
    content: 'Moved from Jenkins to GitHub Actions for CI/CD. Benefits include better GitHub integration, simplified configuration, and reduced maintenance overhead.',
    source_type: 'github',
    source_id: 'mock-pr-205',
    source_url: 'https://github.com/company/project/pull/205',
    timestamp: new Date('2024-03-20'),
    confidence: 0.90,
    reason: 'Reduce CI/CD maintenance and improve developer experience',
    outcome: 'Faster build times and easier configuration'
  },
  {
    type: 'incident',
    summary: 'Database connection pool exhaustion caused service degradation',
    content: 'Service experienced slow response times due to database connection pool being exhausted. Root cause was unclosed connections in the retry logic.',
    source_type: 'slack',
    source_id: 'mock-slack-3',
    source_url: 'https://slack.com/archives/C1111111111/p1111111111',
    timestamp: new Date('2024-04-05'),
    confidence: 0.85,
    reason: 'Connection leaks in retry logic',
    outcome: 'Fixed connection handling and added monitoring for pool usage'
  },
  {
    type: 'decision',
    summary: 'Chose React for the new customer dashboard',
    content: 'Selected React over Vue for the new customer dashboard project. Decision was based on team expertise, ecosystem size, and long-term maintainability.',
    source_type: 'github',
    source_id: 'mock-pr-300',
    source_url: 'https://github.com/company/dashboard/pull/300',
    timestamp: new Date('2024-04-15'),
    confidence: 0.87,
    reason: 'Team has more React experience and better ecosystem support',
    outcome: 'Faster development and easier hiring'
  },
  {
    type: 'decision',
    summary: 'Implemented microservices architecture for backend services',
    content: 'Decomposed the monolithic backend into microservices. Each service owns its data and exposes APIs. This allows independent scaling and deployment.',
    source_type: 'docs',
    source_id: 'mock-doc-1',
    source_url: 'https://docs.company.com/architecture/microservices',
    timestamp: new Date('2024-05-01'),
    confidence: 0.93,
    reason: 'Monolith was becoming hard to maintain and deploy',
    outcome: 'Independent scaling, faster deployments, better fault isolation'
  },
  {
    type: 'incident',
    summary: 'Memory leak in notification service caused OOM crashes',
    content: 'The notification service started crashing with Out of Memory errors. Investigation revealed event listeners were not being removed properly.',
    source_type: 'slack',
    source_id: 'mock-slack-4',
    source_url: 'https://slack.com/archives/C2222222222/p2222222222',
    timestamp: new Date('2024-05-20'),
    confidence: 0.91,
    reason: 'Event listeners accumulating without cleanup',
    outcome: 'Fixed memory leak and added heap monitoring alerts'
  }
];

async function insertMockData() {
  console.log('Inserting mock memories...');
  
  for (const mem of mockMemories) {
    try {
      await pool.query(
        `INSERT INTO memory_items (type, summary, content, source_type, source_id, source_url, timestamp, confidence, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          mem.type,
          mem.summary,
          mem.content,
          mem.source_type,
          mem.source_id,
          mem.source_url,
          mem.timestamp,
          mem.confidence,
          JSON.stringify({ reason: mem.reason, outcome: mem.outcome })
        ]
      );
      console.log(`✓ Inserted: ${mem.summary.substring(0, 50)}...`);
    } catch (err) {
      console.error(`✗ Error inserting: ${err.message}`);
    }
  }
  
  console.log('\nDone! Inserted', mockMemories.length, 'memories');
  process.exit(0);
}

insertMockData();
