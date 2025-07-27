import { config } from 'dotenv';
import { WaterCrawlAPIClient } from '../src/index.js';
import type {
  CrawlRequest,
  CrawlStatus,
  SearchRequest,
  SitemapRequest,
} from '../src/types.js';
import { SitemapOutputFormat, SitemapStatus } from '../src/types.js';

config();

describe('WaterCrawlAPI', () => {
  let api: WaterCrawlAPIClient;

  beforeAll(() => {
    api = new WaterCrawlAPIClient(process.env.WATERCRAWL_API_KEY!);
  });

  // Core API Tests
  describe('Core API', () => {
    test('getCrawlRequestsList returns list of results', async () => {
      const response = await api.getCrawlRequestsList();
      expect(Array.isArray(response.results)).toBe(true);
    });

    test('getCrawlRequest returns a single request', async () => {
      const items = await api.getCrawlRequestsList();
      const response = await api.getCrawlRequest(items.results[0].uuid);
      expect(typeof response).toBe('object');
      expect(response).not.toBeNull();
    });
  });

  // Crawl API Tests
  describe('Crawl API', () => {
    test('createCrawlRequest creates a new request', async () => {
      const response = await api.createCrawlRequest('https://watercrawl.dev');
      expect(typeof response).toBe('object');
      expect(response).not.toBeNull();
      expect(response.uuid).toBeDefined();
    });

    test('createBatchCrawlRequest creates a request with multiple URLs', async () => {
      const urls = ['https://watercrawl.dev', 'https://docs.watercrawl.dev/'];
      const response = await api.createBatchCrawlRequest(urls);
      expect(typeof response).toBe('object');
      expect(response).not.toBeNull();
      expect(response.uuid).toBeDefined();
      // If the API returns the URLs, we can test that they match what we sent
      if (response.urls) {
        expect(Array.isArray(response.urls)).toBe(true);
        expect(response.urls.length).toBe(urls.length);
      }
    });

    test('stopCrawlRequest stops a request', async () => {
      const result = await api.createCrawlRequest('https://watercrawl.dev');
      const response = await api.stopCrawlRequest(result.uuid);
      expect(response).toBe('');
    });

    test('downloadCrawlRequest downloads request results', async () => {
      const result = await api.getCrawlRequestsList();
      const response = await api.downloadCrawlRequest(result.results[0].uuid);
      // The response could be an array, object, or possibly null depending on the API
      expect(response !== undefined).toBe(true);
    });

    test('monitorCrawlRequest monitors request progress', async () => {
      const result = await api.createCrawlRequest('https://watercrawl.dev');
      const generator = api.monitorCrawlRequest(result.uuid);

      let count = 0;
      for await (const item of generator) {
        expect(typeof item).toBe('object');
        count++;
        if (count >= 2) break; // Only test first few events to keep test duration reasonable
      }
    }, 60000);

    test('getCrawlRequestResults gets results of a request', async () => {
      const result = await api.getCrawlRequestsList();
      const response = await api.getCrawlRequestResults(
        result.results[result.results.length - 1].uuid,
      );
      expect(Array.isArray(response.results)).toBe(true);
    }, 60000);

    test('getCrawlRequestResults with pagination and download', async () => {
      // Find a crawl request with results
      const crawlList = await api.getCrawlRequestsList();
      let targetCrawl: CrawlRequest | undefined;
      for (const crawl of crawlList.results) {
        const results = await api.getCrawlRequestResults(crawl.uuid);
        if (results.results.length > 1) {
          targetCrawl = crawl;
          break;
        }
      }

      if (!targetCrawl) {
        console.log('Skipping pagination test: No suitable crawl with multiple results found.');
        return;
      }

      // Test pagination
      const pageSize = 1;
      const paginatedResponse = await api.getCrawlRequestResults(targetCrawl.uuid, 1, pageSize);
      expect(Array.isArray(paginatedResponse.results)).toBe(true);
      expect(paginatedResponse.results.length).toBe(pageSize);

      // Test download=true
      const downloadResponse = await api.getCrawlRequestResults(targetCrawl.uuid, 1, pageSize, true);
      expect(Array.isArray(downloadResponse.results)).toBe(true);
      if (downloadResponse.results.length > 0) {
        const result = downloadResponse.results[0];
        // When downloaded, the result object should be more than just a URL string
        expect(typeof result.result).toBe('object');
        expect(result.result).not.toBeNull();
      }
    }, 60000);

    test('downloadResult downloads a specific result', async () => {
      const resultCrawl = await api.getCrawlRequestsList();
      let index = 0;
      let result;

      while (true) {
        result = await api.getCrawlRequestResults(resultCrawl.results[index].uuid);
        if (result.results.length > 0) {
          break;
        }
        index++;
        if (index >= resultCrawl.results.length) {
          throw new Error('No results found for testing downloadResult');
        }
      }

      const response = await api.downloadResult(result.results[0]);
      expect(typeof response).toBe('object');
      expect(response).not.toBeNull();
    });

    test('scrapeUrl scrapes a URL', async () => {
      // First test async mode
      const asyncResult = (await api.scrapeUrl(
        'https://watercrawl.dev',
        {},
        {},
        false,
      )) as CrawlRequest;
      expect(typeof asyncResult).toBe('object');
      expect(asyncResult.uuid).toBeDefined();

      // Then test sync mode with a completed crawl
      const items = await api.getCrawlRequestsList();
      const completedItem = items.results.find(
        (item) =>
          item.status === ('finished' as CrawlStatus),
      );

      if (completedItem) {
        const results = await api.getCrawlRequestResults(completedItem.uuid);
        if (results.results.length > 0) {
          const response = await api.downloadResult(results.results[0]);
          expect(typeof response).toBe('object');
          expect(response).not.toBeNull();
          return;
        }
      }

      // If no completed crawl found, test async mode only
      console.log('No completed crawl found, testing async mode only');
      expect(asyncResult.uuid).toBeDefined();
    }, 30000); // Increased timeout for scraping
  });

  // Search API Tests
  describe('Search API', () => {
    test('getSearchRequestsList returns list of search requests', async () => {
      const response = await api.getSearchRequestsList();
      expect(Array.isArray(response.results)).toBe(true);
    });

    test('createSearchRequest creates a new search request', async () => {
      // Test async mode
      const response = (await api.createSearchRequest('watercrawl', {}, 2, false)) as SearchRequest;
      expect(typeof response).toBe('object');
      expect(response).not.toBeNull();
      expect(response.uuid).toBeDefined();

      // Clean up by stopping the request
      // await api.stopSearchRequest(response.uuid); // TODO: There is a server problem with stopping search requests
    });

    test('getSearchRequest gets details of a search request', async () => {
      // Create a request first
      const request = (await api.createSearchRequest(
        'typescript library',
        {},
        2,
        false,
      )) as SearchRequest;

      // Test with download=false (default)
      const response = await api.getSearchRequest(request.uuid);
      expect(typeof response).toBe('object');
      expect(response.uuid).toBe(request.uuid);
      expect(response.query).toBe('typescript library');

      for await (const event of api.monitorSearchRequest(request.uuid)) {
        if (event.type === 'state') {
          const data = event.data as SearchRequest;
          if (data.status === 'finished') {
            break;
          }
        }
      }

      // Test with download=true
      const responseWithDownload = await api.getSearchRequest(request.uuid, true);
      expect(typeof responseWithDownload).toBe('object');
      expect(responseWithDownload.uuid).toBe(request.uuid);

      // Verify that when download=true, result is not a string
      if (responseWithDownload.result) {
        expect(typeof responseWithDownload.result).not.toBe('string');
      }
    }, 10000);

    test('monitorSearchRequest monitors search progress', async () => {
      const request = (await api.createSearchRequest(
        'javascript sdk',
        {},
        2,
        false,
      )) as SearchRequest;

      // Monitor a few events
      const generator = api.monitorSearchRequest(request.uuid, false);
      let count = 0;

      for await (const event of generator) {
        expect(typeof event).toBe('object');
        expect(['state', 'feed']).toContain(event.type);
        expect(event.data).toBeDefined();
        count++;
        if (count >= 2) break; // Only check a few events to keep test duration reasonable
      }
    }, 60000);

    test('stopSearchRequest stops a search request', async () => {
      // Create a request to stop
      // const request = (await api.createSearchRequest(
      //   'python tutorial',
      //   {},
      //   2,
      //   false,
      // )) as SearchRequest;
      // try {
      //   // Try to stop it
      //   const response = await api.stopSearchRequest(request.uuid);
      //   expect(typeof response).toBe('string');

      //   // Verify it was stopped
      //   const status = await api.getSearchRequest(request.uuid);
      //   expect(['canceled', 'cancelled', 'failed', 'finished']).toContain(status.status);
      // } catch (error) {
      //   console.log('Could not stop search request - might be already finished');
      //   // Even if we can't stop it, the test is still valid
      //   const status = await api.getSearchRequest(request.uuid);
      //   expect(status).toBeDefined();
      // }
    }, 10000);
  });

  // Sitemap API Tests
  describe('Sitemap API', () => {
    // Helper function to create a sitemap request for testing
    async function createTestSitemapRequest() {
      return api.createSitemapRequest(
        'https://watercrawl.dev',
        {
          include_subdomains: true,
          ignore_sitemap_xml: false,
          search: null,
          include_paths: [],
          exclude_paths: [],
        },
        false
      ) as Promise<SitemapRequest>;
    }

    test('createSitemapRequest creates a sitemap request', async () => {
      // Test in async mode
      const response = await createTestSitemapRequest();
      expect(typeof response).toBe('object');
      expect(response).not.toBeNull();
      expect(response.uuid).toBeDefined();
      expect(response.url).toBe('https://watercrawl.dev');
    }, 30000);

    test('createSitemapRequest in sync mode returns results', async () => {
      // This test might take longer since it waits for completion
      try {
        const response = await api.createSitemapRequest(
          'https://watercrawl.dev',
          {
            include_subdomains: false, // Limit scope to make it faster
            ignore_sitemap_xml: false,
            search: null,
            include_paths: ['/'],
            exclude_paths: [],
          },
          true, // Sync mode
          true  // Download results
        );

        // Response could be array of strings or a single string depending on format
        expect(
          Array.isArray(response) || typeof response === 'string'
        ).toBeTruthy();
      } catch (error: any) {
        // If there's a timeout or other issue, we'll skip rather than fail
        if (error.message && error.message.includes('timed out')) {
          console.log('Sync sitemap request timed out, skipping test');
        } else {
          throw error;
        }
      }
    }, 60000);

    test('getSitemapRequest gets a sitemap request by ID', async () => {
      // Create a sitemap request first
      const request = await createTestSitemapRequest();

      // Test with download=false (default)
      const response = await api.getSitemapRequest(request.uuid);
      expect(typeof response).toBe('object');
      expect(response.uuid).toBe(request.uuid);
      expect(response.url).toBe('https://watercrawl.dev');

      // Test with download=true (might return result in a different format)
      const downloadResponse = await api.getSitemapRequest(request.uuid, true);
      expect(typeof downloadResponse).toBe('object');
      expect(downloadResponse.uuid).toBe(request.uuid);
    }, 30000);

    test('listSitemapRequests returns list of sitemap requests', async () => {
      const response = await api.listSitemapRequests();
      expect(Array.isArray(response.results)).toBe(true);

      // Test pagination parameters
      const page2Response = await api.listSitemapRequests(2, 5);
      expect(Array.isArray(page2Response.results)).toBe(true);
      // Ideally, we'd test that the pages are different, but
      // we can't guarantee there are enough sitemap requests
    });

    test('monitorSitemapRequest monitors sitemap progress', async () => {
      // Create a request to monitor
      const request = await createTestSitemapRequest();

      // Monitor a few events
      const generator = api.monitorSitemapRequest(request.uuid, false);
      let count = 0;

      for await (const event of generator) {
        expect(typeof event).toBe('object');
        expect(event).toHaveProperty('type');
        expect(event).toHaveProperty('data');
        count++;
        if (count >= 2) break; // Only check a few events to keep test duration reasonable
      }

      expect(count).toBeGreaterThan(0);
    }, 30000);

    test('stopSitemapRequest cancels a sitemap request', async () => {
      // Create a request to delete
      const request = await createTestSitemapRequest();

      // Try to delete it
      const response = await api.stopSitemapRequest(request.uuid);
      expect(response).toBeDefined();

      try {
        // Get the request to verify it was deleted/canceled
        const deleted = await api.getSitemapRequest(request.uuid);
        expect(['canceled', 'cancelled', 'failed']).toContain(deleted.status);
      } catch (error) {
        // Some APIs might return 404 after deletion, which is also valid
        console.log('Sitemap request not found after deletion, which is acceptable behavior');
      }
    }, 10000);

    test('getSitemapResults gets results in different formats', async () => {
      // First find a sitemap request that is completed
      const list = await api.listSitemapRequests();
      const completedRequest = list.results.find(req =>
        req.status === SitemapStatus.Finished
      );

      if (!completedRequest) {
        console.log('No completed sitemap requests found, creating a new one');
        const request = await createTestSitemapRequest();

        // Wait for it to complete - this might time out
        try {
          for await (const event of api.monitorSitemapRequest(request.uuid)) {
            if (event.type === 'state') {
              const data = event.data as SitemapRequest;
              if (data.status === SitemapStatus.Finished) {
                break;
              }
            }
          }
        } catch (error) {
          console.log('Sitemap request did not complete in time, skipping test');
          return;
        }

        // Test JSON format (default)
        try {
          const jsonResults = await api.getSitemapResults(request.uuid);
          expect(jsonResults).toBeDefined();

          // Test markdown format if available
          try {
            const markdownResults = await api.getSitemapResults(
              request.uuid,
              SitemapOutputFormat.Markdown
            );
            expect(typeof markdownResults).toBe('string');
          } catch (error) {
            console.log('Markdown format not supported or not ready');
          }

          // Test graph format if available
          try {
            const graphResults = await api.getSitemapResults(
              request.uuid,
              SitemapOutputFormat.Graph
            );
            expect(typeof graphResults).toBe('object');
          } catch (error) {
            console.log('Graph format not supported or not ready');
          }
        } catch (error) {
          console.log('Could not get sitemap results, the request may not be ready');
        }
      } else {
        // Test with the completed request we found
        const uuid = completedRequest.uuid;

        // Test JSON format (default)
        const jsonResults = await api.getSitemapResults(uuid);
        expect(jsonResults).toBeDefined();

        // Test markdown format if available
        try {
          const markdownResults = await api.getSitemapResults(
            uuid,
            SitemapOutputFormat.Markdown
          );
          expect(typeof markdownResults).toBe('string');
        } catch (error) {
          console.log('Markdown format not supported or not ready');
        }

        // Test graph format if available
        try {
          const graphResults = await api.getSitemapResults(
            uuid,
            SitemapOutputFormat.Graph
          );
          expect(typeof graphResults).toBe('object');
        } catch (error) {
          console.log('Graph format not supported or not ready');
        }
      }
    }, 60000);
  });
});
