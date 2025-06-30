# WaterCrawl Node.js Client
[![npm version](https://badge.fury.io/js/@watercrawl%2Fnodejs.svg)](https://badge.fury.io/js/@watercrawl%2Fnodejs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A TypeScript/Node.js client library for interacting with the WaterCrawl API - a powerful web crawling and scraping service.

## Installation

```bash
npm install @watercrawl/nodejs
```

## Requirements

- Node.js >= 14
- `axios`, `url-join`, `dotenv` packages

## Quick Start

```typescript
import { WaterCrawlAPIClient } from '@watercrawl/nodejs';

// Initialize the client
const client = new WaterCrawlAPIClient('your-api-key');

// Simple URL scraping
const result = await client.scrapeUrl('https://example.com');

// Advanced crawling with options
const crawlRequest = await client.createCrawlRequest(
    'https://example.com',
    {}, // spider options
    {}, // page options
    {}  // plugin options
);

// Monitor and download results
for await (const result of client.monitorCrawlRequest(crawlRequest.uuid)) {
    if (result.type === 'result') {
        console.log(result.data);  // it is a result object per page
    }
}

// Batch crawling example
const batchRequest = await client.createBatchCrawlRequest(
    ['https://example.com', 'https://example.org'],
    {}, // spider options
    {}, // page options
    {}  // plugin options
);
```

## API Examples

### Client Initialization

```typescript
import { WaterCrawlAPIClient } from '@watercrawl/nodejs';

// Initialize with default base URL
const client = new WaterCrawlAPIClient('your-api-key');

// Or specify a custom base URL
const client = new WaterCrawlAPIClient('your-api-key', 'https://custom-app.watercrawl.dev/');
```

### Crawling Operations

#### List all crawl requests

```typescript
// Get the first page of requests (default page size: 10)
const requests = await client.getCrawlRequestsList();

// Specify page number and size
const requests = await client.getCrawlRequestsList(2, 20);
```

#### Get a specific crawl request

```typescript
const request = await client.getCrawlRequest('request-uuid');
```

#### Create a crawl request

```typescript
// Simple request with just a URL
const request = await client.createCrawlRequest('https://example.com');

// Advanced request with a single URL
const request = await client.createCrawlRequest(
    'https://example.com',
    {
        max_depth: 1, // maximum depth to crawl
        page_limit: 1, // maximum number of pages to crawl
        allowed_domains: [], // allowed domains to crawl
        exclude_paths: [], // exclude paths
        include_paths: [] // include paths
    },
    {
        exclude_tags: [], // exclude tags from the page
        include_tags: [], // include tags from the page
        wait_time: 1000, // wait time in milliseconds after page load
        include_html: false, // the result will include HTML
        only_main_content: true, // only main content of the page automatically remove headers, footers, etc.
        include_links: false, // if True the result will include links
        timeout: 15000, // timeout in milliseconds
        accept_cookies_selector: null, // accept cookies selector e.g. "#accept-cookies"
        locale: "en-US", // locale
        extra_headers: {}, // extra headers e.g. {"Authorization": "Bearer your_token"}
        actions: [] // actions to perform {"type": "screenshot"} or {"type": "pdf"}
    },
    {}
);
```

#### Create a batch crawl request

```typescript
// Batch crawl multiple URLs at once
const batchRequest = await client.createBatchCrawlRequest(
    [
        'https://example.com',
        'https://example.org',
        'https://another-site.com'
    ],
    {
        proxy_server: null
    },
    {
        wait_time: 1000, // wait time in milliseconds after page load
        include_html: true, // the result will include HTML
    }
);

// The batch crawl request returns a standard CrawlRequest object
console.log(`Batch crawl request created: ${batchRequest.uuid}`);

// You can monitor batch crawls the same way as regular crawls
for await (const event of client.monitorCrawlRequest(batchRequest.uuid)) {
    if (event.type === 'state') {
        console.log(`Status: ${event.data.status}, Documents: ${event.data.number_of_documents}`);
    } else if (event.type === 'result') {
        console.log(`New result for URL: ${event.data.url}`);
    }
}
```

#### Monitor a crawl request

```typescript
// Monitor and get notifications for different events
for await (const event of client.monitorCrawlRequest('request-uuid')) {
    if (event.type === 'state') {
        // This is a state update event
        console.log(`Status: ${event.data.status}`);
        console.log(`Pages crawled: ${event.data.number_of_documents}`);
    } else if (event.type === 'result') {
        // This is a new result
        console.log(`New page result: ${event.data.url}`);
        // You can download the result data
        const resultData = await client.downloadResult(event.data);
        console.log(resultData);
    }
}
```

#### Stop a crawl request

```typescript
await client.stopCrawlRequest('request-uuid');
```

#### Scrape a single URL

```typescript
// Synchronous scraping (default)
const result = await client.scrapeUrl('https://example.com');

// With page options
const result = await client.scrapeUrl(
    'https://example.com',
    {} // page options
);

// Asynchronous scraping
const request = await client.scrapeUrl('https://example.com', {}, {}, false);
// Later check for results with getCrawlRequest
```

### Sitemap Operations

#### Sitemap API methods

```typescript
// Create a new sitemap request
const sitemapRequest = await client.createSitemapRequest(
    'https://example.com',
    {
        include_subdomains: true,
        ignore_sitemap_xml: false,
        search: null,
        include_paths: [],
        exclude_paths: ['/login/*', '/admin/*']
    },
    false, // async mode
    false  // don't download results yet
);

// Get an existing sitemap request
const sitemap = await client.getSitemapRequest('sitemap-uuid');

// List all sitemap requests (with pagination)
const sitemapList = await client.listSitemapRequests(1, 10); // page 1, 10 items per page

// Monitor sitemap generation progress (async streaming)
for await (const event of client.monitorSitemapRequest(sitemapRequest.uuid)) {
    if (event.type === 'state') {
        console.log(`Status: ${event.data.status}`);
    } else if (event.type === 'feed') {
        console.log(`Progress: ${event.data.message}`);
    }
}

// Get sitemap results in different formats
const jsonResults = await client.getSitemapResults(sitemapRequest.uuid); // default JSON format
const markdownResults = await client.getSitemapResults(sitemapRequest.uuid, 'markdown');
const graphResults = await client.getSitemapResults(sitemapRequest.uuid, 'graph');

// Delete/cancel a sitemap request
await client.deleteSitemapRequest(sitemapRequest.uuid);
```

#### Get sitemap from a crawl request

```typescript
// Get sitemap from a crawl request in JSON format (default)
const sitemap = await client.getCrawlRequestSitemap('request-uuid');

// Get sitemap as markdown
const markdownSitemap = await client.getCrawlRequestSitemap('request-uuid', 'markdown');

// Get sitemap as graph data
const graphSitemap = await client.getCrawlRequestSitemap('request-uuid', 'graph');

// Process JSON sitemap entries
for (const entry of sitemap) {
    console.log(`URL: ${entry.url}, Title: ${entry.title}`);
}
```

> **Note**: The following methods are deprecated and will be removed in future versions:
> - `downloadSitemap()` - use `getCrawlRequestSitemap()` instead
> - `downloadSitemapGraph()` - use `getCrawlRequestSitemap(uuid, 'graph')` instead
> - `downloadSitemapMarkdown()` - use `getCrawlRequestSitemap(uuid, 'markdown')` instead

### Search Operations

#### Create a search request

```typescript
// Simple search
const search = await client.createSearchRequest('nodejs programming');

// Search with options and limited results
const search = await client.createSearchRequest(
    'typescript tutorial',
    {
        language: null, // language code e.g. "en" or "fr" or "es"
        country: null, // country code e.g. "us" or "fr" or "es"
        time_range: "any", // time range e.g. "any" or "hour" or "day" or "week" or "month" or "year"
        search_type: "web", // search type e.g. "web" now just web is supported
        depth: "basic" // depth e.g. "basic" or "advanced" or "ultimate"
    },
    5, // limit the number of results
    true, // wait for results
    true // download results
);

// Asynchronous search
const search = await client.createSearchRequest(
    'machine learning',
    {}, // search options
    5, // limit the number of results
    false, // Don't wait for results
    false // Don't download results
);
```

#### Monitor a search request

```typescript
// Monitor with automatic result download
for await (const event of client.monitorSearchRequest('search-uuid')) {
    if (event.type === 'state') {
        console.log(`Search state: ${event.data.status}`);
    }
}

// Monitor without downloading results
for await (const event of client.monitorSearchRequest('search-uuid', false)) {
    console.log(`Event: ${event}`);
}
```

#### Get search request details

```typescript
// the second parameter is to download results or return search result as url
const search = await client.getSearchRequest('search-uuid', true);
```

#### Stop a search request

```typescript
await client.stopSearchRequest('search-uuid');
```

## Features

- Simple and intuitive API client
- Support for both synchronous and asynchronous crawling
- Comprehensive crawling options and configurations
- Built-in request monitoring and result downloading
- Efficient session management and request handling
- Support for sitemaps and search operations
- Written in TypeScript with complete type definitions
- Promise-based API with async/await support
- ESLint and Prettier configured for code quality
- Built with ES Modules


## Compatibility

- WaterCrawl API >= 0.7.1

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/watercrawl/watercrawl-nodejs/blob/main/LICENSE) file for details.

## Support

For support, please visit:
- Issues: [GitHub Issues](https://github.com/watercrawl/watercrawl-nodejs/issues)
- Homepage: [GitHub Repository](https://github.com/watercrawl/watercrawl-nodejs)
- Documentation: [WaterCrawl Docs](https://docs.watercrawl.dev/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Development

### Setup

```bash
# Install dependencies
npm install

# Copy example environment file
cp .env.example .env

# Add your API key to .env
echo "WATERCRAWL_API_KEY=your-api-key" > .env
```

### Available Scripts

```bash
# Build the project
npm run build

# Run tests
npm test

# Lint the code
npm run lint

# Format the code
npm run format

# Prepare for publishing
npm run prepare
