# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2025-07-01

### Changed
- **Enhanced `getCrawlRequestResults` Method**
  - Added optional `page`, `pageSize`, and `download` parameters to the `getCrawlRequestResults` method for better pagination control and direct result downloading.
  - Updated documentation and examples to reflect the new parameters.
  - Added comprehensive test cases to validate the new functionality.

## [1.2.0] - 2025-06-30

### Added
- Batch crawl API support for processing multiple URLs in a single request
- Comprehensive sitemap API with improved functionality:
  - Dedicated methods for creating, retrieving, listing, and deleting sitemap requests
  - Support for different output formats (JSON, Markdown, Graph) via `getSitemapResults`
  - Real-time monitoring with event streaming via `monitorSitemapRequest`
- New `getCrawlRequestSitemap` method to retrieve sitemap data from a crawl request with format options
- Example code demonstrating batch crawl and sitemap API usage in the examples directory

### Changed
- Updated streaming implementation to use Axios streams instead of Fetch API for better Node.js compatibility
- Improved test suite organization with clear categorization (Core API, Crawl API, Search API, Sitemap API)
- Enhanced error handling in tests and async operations

### Fixed
- Fixed type issues with SitemapOptions and enum usage in tests
- Improved test reliability for asynchronous streaming operations
- Better handling of potentially long-running operations in examples

### Deprecated
- `downloadResult` - Use alternative methods for downloading result data
- `downloadSitemap` - Use the new `getCrawlRequestSitemap` method with JSON format
- `downloadSitemapGraph` - Use the new `getCrawlRequestSitemap` method with Graph format
- `downloadSitemapMarkdown` - Use the new `getCrawlRequestSitemap` method with Markdown format

## [1.1.1] - 2025-05-03

### Fixed
- Improved async streaming implementation for more reliable event handling
- Fixed search event monitoring to correctly process event status
- Refactored stream processing for better error handling and resource management
- Removed debug console.log statements from tests

## [1.1.0] - 2025-04-30

### Added
- Sitemap API support with download functionality
- Sitemap visualization endpoints (graph and markdown formats)
- Search functionality with query, monitoring, and result handling
- Tests for new sitemap and search API features

### Changed
- Simplified documentation with clearer examples
- Updated LICENSE copyright to WaterCrawl-NodeJS

## [1.0.0] - 2025-01-19

### Added
- Initial release of the WaterCrawl Node.js client
- Full API coverage for WaterCrawl endpoints
- TypeScript support with complete type definitions
- Synchronous and asynchronous crawling capabilities
- Real-time crawl monitoring with event streaming
- Automatic result downloading and processing
- Promise-based API with async/await support
- Comprehensive error handling
- ESLint and Prettier configuration
- Continuous Integration with GitHub Actions
- Automated npm publishing with version tags
- Examples for basic usage
- Complete documentation in README.md
- MIT License file

### Dependencies
- axios ^1.6.5
- eventsource-parser ^1.1.1
- url-join ^5.0.0
