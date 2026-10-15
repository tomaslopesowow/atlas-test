import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTICLES_FILE = path.join(__dirname, 'unique-articles.jsonl');
const OUTPUT_FILE = path.join(__dirname, 'unique-authors.jsonl');

async function extractAuthors() {
  console.log('🚀 Starting authors extraction from articles...\n');

  const authors = new Map();
  const authorArticles = new Map();
  let totalArticles = 0;

  // Read all articles and collect author information
  const fileStream = fs.createReadStream(ARTICLES_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('📖 Reading articles and extracting author data...');

  for await (const line of rl) {
    totalArticles++;

    try {
      const article = JSON.parse(line);
      const authorId = article.authorId;

      if (!authorId) {
        console.warn(`⚠️  Article ${article.id} has no authorId, skipping`);
        continue;
      }

      // Track articles by author
      if (!authorArticles.has(authorId)) {
        authorArticles.set(authorId, []);
      }
      authorArticles.get(authorId).push({
        id: article.id,
        title: article.title,
        postDate: article.postDate,
        slug: article.slug
      });

      // Store/update author info (keep most recent article's data)
      if (!authors.has(authorId)) {
        authors.set(authorId, {
          id: authorId,
          // These fields might be available in articles
          firstArticleDate: article.postDate,
          lastArticleDate: article.postDate
        });
      } else {
        const author = authors.get(authorId);
        const firstDate = new Date(author.firstArticleDate);
        const lastDate = new Date(author.lastArticleDate);
        const currentDate = new Date(article.postDate);

        if (currentDate < firstDate) {
          author.firstArticleDate = article.postDate;
        }
        if (currentDate > lastDate) {
          author.lastArticleDate = article.postDate;
        }
      }
    } catch (error) {
      console.error(`❌ Error parsing article ${totalArticles}:`, error.message);
    }

    if (totalArticles % 50 === 0) {
      console.log(`  Processed ${totalArticles} articles...`);
    }
  }

  console.log(`✓ Processed ${totalArticles} articles\n`);

  // Enrich authors with article counts and stats
  const enrichedAuthors = Array.from(authors.values()).map(author => {
    const articles = authorArticles.get(author.id) || [];
    return {
      ...author,
      articleCount: articles.length,
      articles: articles.sort((a, b) => new Date(b.postDate) - new Date(a.postDate))
    };
  });

  // Sort by article count (most prolific first)
  enrichedAuthors.sort((a, b) => b.articleCount - a.articleCount);

  console.log('💾 Writing authors to file...');

  // Write to JSONL file
  const outputLines = enrichedAuthors.map(author => JSON.stringify(author)).join('\n');
  fs.writeFileSync(OUTPUT_FILE, outputLines, 'utf8');

  console.log(`✅ Successfully created ${OUTPUT_FILE}\n`);

  // Statistics
  console.log('📊 Author Statistics:');
  console.log('─'.repeat(60));
  console.log(`Total unique authors:            ${enrichedAuthors.length}`);
  console.log(`Total articles:                  ${totalArticles}`);
  console.log(`Average articles per author:     ${(totalArticles / enrichedAuthors.length).toFixed(1)}`);
  console.log('');

  // Top authors
  console.log('✍️  Top Authors by Article Count:');
  console.log('─'.repeat(60));
  enrichedAuthors.slice(0, 10).forEach((author, index) => {
    const dateRange = `${new Date(author.firstArticleDate).toISOString().split('T')[0]} to ${new Date(author.lastArticleDate).toISOString().split('T')[0]}`;
    console.log(`${index + 1}. Author ID ${author.id.toString().padEnd(10)} - ${author.articleCount.toString().padStart(3)} articles (${dateRange})`);
  });
  console.log('');

  // Distribution
  const singleArticleAuthors = enrichedAuthors.filter(a => a.articleCount === 1).length;
  const multiArticleAuthors = enrichedAuthors.filter(a => a.articleCount > 1).length;
  const prolificAuthors = enrichedAuthors.filter(a => a.articleCount >= 10).length;

  console.log('📈 Author Distribution:');
  console.log('─'.repeat(60));
  console.log(`Single article authors:          ${singleArticleAuthors}`);
  console.log(`Multiple article authors:        ${multiArticleAuthors}`);
  console.log(`Prolific authors (10+ articles): ${prolificAuthors}`);
  console.log('');

  // Activity timeline
  const allDates = enrichedAuthors.flatMap(a => [
    new Date(a.firstArticleDate),
    new Date(a.lastArticleDate)
  ]);
  const earliestActivity = new Date(Math.min(...allDates));
  const latestActivity = new Date(Math.max(...allDates));

  console.log('📅 Activity Timeline:');
  console.log('─'.repeat(60));
  console.log(`Earliest article:  ${earliestActivity.toISOString().split('T')[0]}`);
  console.log(`Latest article:    ${latestActivity.toISOString().split('T')[0]}`);
  console.log('');

  console.log('✨ Author extraction complete!');
  console.log(`📄 Output: ${OUTPUT_FILE}`);
  console.log('\n💡 Note: This export contains author IDs and article metadata.');
  console.log('   For full author details (names, emails), run the database version.');
}

// Run
extractAuthors().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
