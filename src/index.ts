import { BaseAPIClient } from './base.js';
import type {
    CrawlRequest,
    CrawlResult,
    SpiderOptions,
    PageOptions,
    PluginOptions,
    CrawlEvent,
    CreateCrawlRequest,
    SearchRequest,
    SearchOptions,
    SearchEvent,
    SearchResult,
    CreateSearchRequest,
    SitemapNode
} from './types.js';
import axios from 'axios'; // Add axios import

export * from './types.js';

export class WaterCrawlAPIClient extends BaseAPIClient {
    async getCrawlRequestsList(page?: number, pageSize?: number): Promise<{ results: CrawlRequest[] }> {
        return this.get('/api/v1/core/crawl-requests/', { page, page_size: pageSize });
    }

    async getCrawlRequest(itemId: string): Promise<CrawlRequest> {
        return this.get(`/api/v1/core/crawl-requests/${itemId}/`);
    }

    async createCrawlRequest(
        url: string,
        spiderOptions: SpiderOptions = {},
        pageOptions: PageOptions = {},
        pluginOptions: PluginOptions = {}
    ): Promise<CrawlRequest> {
        const request: CreateCrawlRequest = {
            url,
            options: {
                spider_options: spiderOptions,
                page_options: pageOptions,
                plugin_options: pluginOptions
            }
        };
        return this.post('/api/v1/core/crawl-requests/', request);
    }

    async stopCrawlRequest(itemId: string): Promise<null> {
        return this.delete(`/api/v1/core/crawl-requests/${itemId}/`);
    }

    async downloadCrawlRequest(itemId: string): Promise<CrawlResult[]> {
        return this.get(`/api/v1/core/crawl-requests/${itemId}/download/`);
    }

    async *monitorCrawlRequest(itemId: string, download: boolean = true): AsyncGenerator<CrawlEvent, void, unknown> {

        yield* this.fetchStream<CrawlEvent>(
            `/api/v1/core/crawl-requests/${itemId}/status/`,
            { params: { prefetched: download } }
        );
    }

    async getCrawlRequestResults(itemId: string): Promise<{ results: CrawlResult[] }> {
        return this.get(`/api/v1/core/crawl-requests/${itemId}/results/`);
    }

    /**
     * Download the content of a crawl result
     * @deprecated This method will be removed in a future version. Please use alternative methods for downloading result data.
     */
    async downloadResult(resultObject: CrawlResult): Promise<Record<string, any>> {
        const response = await axios.get(resultObject.result);
        return response.data;
    }

    async scrapeUrl(
        url: string,
        pageOptions: PageOptions = {},
        pluginOptions: PluginOptions = {},
        sync: boolean = true,
        download: boolean = true
    ): Promise<Record<string, any> | CrawlRequest> {
        const request = await this.createCrawlRequest(url, {}, pageOptions, pluginOptions);

        if (!sync) {
            return request;
        }

        for await (const event of this.monitorCrawlRequest(request.uuid, download)) {
            if (event.type === 'result') {
                return event.data as CrawlResult;
            }
        }

        throw new Error('No result received from crawl');
    }

    // Sitemap methods
    /**
     * Get a crawl request for sitemap operations
     * @param crawlRequest Crawl request object or UUID
     * @returns Promise with the crawl request
     * @throws Error if the sitemap is not available
     */
    private async getCrawlRequestForSitemap(crawlRequest: string | CrawlRequest): Promise<CrawlRequest> {
        const request = typeof crawlRequest === 'string'
            ? await this.getCrawlRequest(crawlRequest)
            : crawlRequest;

        if (!request.sitemap) {
            throw new Error('Sitemap not found in crawl request');
        }

        return request;
    }

    /**
     * Download the sitemap for a crawl request
     * @param crawlRequest Crawl request object or UUID
     * @returns Promise with the sitemap data
     */
    async downloadSitemap(crawlRequest: string | CrawlRequest): Promise<SitemapNode[]> {
        const request = await this.getCrawlRequestForSitemap(crawlRequest);

        if (!request.sitemap) {
            throw new Error('Sitemap URL is missing or undefined');
        }

        const response = await axios.get(request.sitemap);
        return response.data;
    }

    /**
     * Download the sitemap as a graph representation for visualization
     * @param crawlRequest Crawl request object or UUID
     * @returns Promise with the sitemap graph data
     */
    async downloadSitemapGraph(crawlRequest: string | CrawlRequest): Promise<any> {
        const request = await this.getCrawlRequestForSitemap(crawlRequest);
        return this.get(`/api/v1/core/crawl-requests/${request.uuid}/sitemap/graph/`);
    }

    /**
     * Download the sitemap as a markdown document
     * @param crawlRequest Crawl request object or UUID
     * @returns Promise with the sitemap markdown content
     */
    async downloadSitemapMarkdown(crawlRequest: string | CrawlRequest): Promise<string> {
        const request = await this.getCrawlRequestForSitemap(crawlRequest);
        return this.get(`/api/v1/core/crawl-requests/${request.uuid}/sitemap/markdown/`);
    }

    // Search methods
    /**
     * Get a paginated list of search requests
     * @param page Page number (1-indexed, default: 1)
     * @param pageSize Number of items per page (default: 10)
     * @returns Promise with paginated search requests
     */
    async getSearchRequestsList(page?: number, pageSize?: number): Promise<{ results: SearchRequest[] }> {
        return this.get('/api/v1/core/search/', { page: page || 1, page_size: pageSize || 10 });
    }

    /**
     * Get details of a specific search request
     * @param itemId UUID of the search request
     * @param download If true, download results; if false, return URLs
     * @returns Promise with search request details
     */
    async getSearchRequest(itemId: string, download: boolean = false): Promise<SearchRequest> {
        return this.get(`/api/v1/core/search/${itemId}/`, { prefetched: download });
    }

    /**
     * Create a new search request
     * @param query Search query string
     * @param searchOptions Search options
     * @param resultLimit Maximum number of results to return
     * @param sync If true, wait for results; if false, return immediately
     * @param download If true, download results; if false, return URLs
     * @returns If sync=true: Complete search results; If sync=false: Search request object
     */
    async createSearchRequest(
        query: string,
        searchOptions: SearchOptions = {},
        resultLimit: number = 5,
        sync: boolean = true,
        download: boolean = true
    ): Promise<SearchRequest | SearchResult[]> {
        const request: CreateSearchRequest = {
            query,
            search_options: searchOptions,
            result_limit: resultLimit
        };

        const response = await this.post<SearchRequest>('/api/v1/core/search/', request);

        if (!sync) {
            return response;
        }

        // Monitor the search request until completion
        for await (const event of this.monitorSearchRequest(response.uuid, download)) {
            if (event.type === 'state' && ['finished', 'failed'].includes(event.data.status)) {
                if (download && Array.isArray(event.data.result)) {
                    return event.data.result as SearchResult[];
                }
                return event.data;
            }
        }

        throw new Error('Search request failed or timed out');
    }

    /**
     * Monitor a search request in real-time
     * @param itemId UUID of the search request to monitor
     * @param download If true, download results; if false, return URLs
     * @returns AsyncGenerator yielding search events
     */
    async *monitorSearchRequest(itemId: string, download: boolean = true): AsyncGenerator<SearchEvent, void, unknown> {
        yield* this.fetchStream<SearchEvent>(
          `/api/v1/core/search/${itemId}/status/`,
          { params: { prefetched: download } }
        );
    }

    /**
     * Stop a running search request
     * @param itemId UUID of the search request to stop
     * @returns Promise that resolves when the request is stopped
     */
    async stopSearchRequest(itemId: string): Promise<null> {
        return this.delete(`/api/v1/core/search/${itemId}/`);
    }
}
