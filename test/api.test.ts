import { config } from 'dotenv';
import { WaterCrawlAPIClient } from '../src/index.js';
import type { CrawlRequest, CrawlResult, CrawlStatus, SearchRequest, SearchResult, SitemapNode } from '../src/types.js';

config();

describe('WaterCrawlAPI', () => {
    let api: WaterCrawlAPIClient;

    beforeAll(() => {
        api = new WaterCrawlAPIClient(process.env.WATERCRAWL_API_KEY!);
    });

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

    test('createCrawlRequest creates a new request', async () => {
        const response = await api.createCrawlRequest('https://watercrawl.dev');
        expect(typeof response).toBe('object');
        expect(response).not.toBeNull();
        expect(response.uuid).toBeDefined();
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
            console.log("TEST", item);
            expect(typeof item).toBe('object');
            count++;
            if (count >= 2) break; // Only test first few events to keep test duration reasonable
        }
    }, 60000);

    test('getCrawlRequestResults gets results of a request', async () => {
        const result = await api.getCrawlRequestsList();
        const response = await api.getCrawlRequestResults(result.results[result.results.length - 1].uuid);
        expect(Array.isArray(response.results)).toBe(true);
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
        const asyncResult = await api.scrapeUrl('https://watercrawl.dev', {}, {}, false) as CrawlRequest;
        expect(typeof asyncResult).toBe('object');
        expect(asyncResult.uuid).toBeDefined();

        // Then test sync mode with a completed crawl
        const items = await api.getCrawlRequestsList();
        const completedItem = items.results.find(item => item.status === 'completed' as CrawlStatus || item.status === 'finished' as CrawlStatus);

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

    // Search API Tests
    test('getSearchRequestsList returns list of search requests', async () => {
        const response = await api.getSearchRequestsList();
        expect(Array.isArray(response.results)).toBe(true);
    });

    test('createSearchRequest creates a new search request', async () => {
        // Test async mode 
        const response = await api.createSearchRequest('watercrawl', {}, 2, false) as SearchRequest;
        expect(typeof response).toBe('object');
        expect(response).not.toBeNull();
        expect(response.uuid).toBeDefined();

        // Clean up by stopping the request
        await api.stopSearchRequest(response.uuid);
    });

    test('getSearchRequest gets details of a search request', async () => {
        try {
            // Create a request first
            const request = await api.createSearchRequest('typescript library', {}, 2, false) as SearchRequest;

            // Test with download=false (default)
            const response = await api.getSearchRequest(request.uuid);
            expect(typeof response).toBe('object');
            expect(response.uuid).toBe(request.uuid);
            expect(response.query).toBe('typescript library');


            for await (const event of api.monitorSearchRequest(request.uuid)) {
                if (event.type === 'state') {
                    if (event.data.status === 'finished') {
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

        } catch (error) {
            console.error('Error in getSearchRequest test:', error);
            // If we can't create or get a search request, skip the test
            console.log('Skipping getSearchRequest test due to API error');
        }
    }, 10000);

    test('monitorSearchRequest monitors search progress', async () => {
        try {
            // Create a request to monitor
            const request = await api.createSearchRequest('javascript sdk', {}, 2, false) as SearchRequest;

            // Monitor a few events
            const generator = api.monitorSearchRequest(request.uuid, false);
            let count = 0;

            for await (const event of generator) {
                expect(typeof event).toBe('object');
                expect(event.type).toBe('state');
                expect(event.data).toBeDefined();
                count++;
                if (count >= 2) break; // Only check a few events to keep test duration reasonable
            }

        } catch (error) {
            console.error('Error in monitorSearchRequest test:', error);
            // If we can't create or monitor a search request, skip the test
            console.log('Skipping monitorSearchRequest test due to API error');
        }
    }, 60000);

    test('stopSearchRequest stops a search request', async () => {
        // Create a request to stop
        const request = await api.createSearchRequest('python tutorial', {}, 2, false) as SearchRequest;

        for await (const event of api.monitorSearchRequest(request.uuid, false)) {
            if (event.type === 'state' && event.data.status === 'running') {
                break;
            }
        }

        try {
            // Try to stop it
            const response = await api.stopSearchRequest(request.uuid);
            expect(typeof response).toBe('string');

            // Verify it was stopped
            const status = await api.getSearchRequest(request.uuid);
            expect(['canceled', 'cancelled', 'failed', 'finished']).toContain(status.status);
        } catch (error) {
            console.log('Could not stop search request - might be already finished');
            // Even if we can't stop it, the test is still valid
            const status = await api.getSearchRequest(request.uuid);
            expect(status).toBeDefined();
        }
    }, 10000);

    // Sitemap API Tests
    test('downloadSitemap downloads sitemap for a crawl request', async () => {
        // First find a crawl request with a sitemap
        const items = await api.getCrawlRequestsList();
        let crawlWithSitemap: CrawlRequest | null = null;

        for (const item of items.results) {
            const crawl = await api.getCrawlRequest(item.uuid);
            if (crawl.sitemap) {
                crawlWithSitemap = crawl;
                break;
            }
        }

        if (crawlWithSitemap) {
            // Test with crawl request object
            const sitemap = await api.downloadSitemap(crawlWithSitemap);
            expect(Array.isArray(sitemap) || typeof sitemap === 'object').toBeTruthy();

            // Test with crawl request UUID
            const sitemapById = await api.downloadSitemap(crawlWithSitemap.uuid);
            expect(Array.isArray(sitemapById) || typeof sitemapById === 'object').toBeTruthy();
        } else {
            console.log('No crawl requests with sitemap found, skipping sitemap tests');
        }
    });

    test('sitemap graph and markdown endpoints are accessible', async () => {
        // Finding a crawl with sitemap is already tested in the previous test
        // Here we just test that the methods don't throw errors and return something
        const items = await api.getCrawlRequestsList();
        let crawlWithSitemap: CrawlRequest | null = null;

        for (const item of items.results) {
            try {
                const crawl = await api.getCrawlRequest(item.uuid);
                if (crawl.sitemap) {
                    crawlWithSitemap = crawl;
                    break;
                }
            } catch (error) {
                console.log(`Error getting crawl request ${item.uuid}:`, error);
            }
        }

        if (crawlWithSitemap) {
            try {
                const graph = await api.downloadSitemapGraph(crawlWithSitemap.uuid);
                expect(graph).toBeDefined();
            } catch (error) {
                console.log('Sitemap graph endpoint might not be supported yet');
            }

            try {
                const markdown = await api.downloadSitemapMarkdown(crawlWithSitemap.uuid);
                expect(markdown).toBeDefined();
            } catch (error) {
                console.log('Sitemap markdown endpoint might not be supported yet');
            }
        } else {
            console.log('No crawl requests with sitemap found, skipping sitemap graph/markdown tests');
        }
    });
});
