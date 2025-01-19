import { config } from 'dotenv';
import { WaterCrawlAPIClient } from '../src/index.js';
import type { CrawlRequest, CrawlResult, CrawlStatus } from '../src/types.js';

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
        expect(Array.isArray(response)).toBe(true);
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
    },60000);

    test('getCrawlRequestResults gets results of a request', async () => {
        const result = await api.getCrawlRequestsList();
        const response = await api.getCrawlRequestResults(result.results[result.results.length - 1].uuid);
        expect(Array.isArray(response.results)).toBe(true);
    });

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
        const completedItem = items.results.find(item => item.status === 'completed' as CrawlStatus);
        
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
