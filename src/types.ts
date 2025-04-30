export type CrawlStatus = 'new' | 'running' | 'cancelled' | 'canceling' | 'failed' | 'finished';

export interface CrawlRequest {
    uuid: string;
    url: string;
    status: CrawlStatus;
    options: CrawlOptions;
    created_at: string;
    updated_at: string;
    number_of_documents: number;
    duration: string | null;
    sitemap?: string; // URL to sitemap if available
}

export interface CrawlOptions {
    spider_options?: SpiderOptions;
    page_options?: PageOptions;
    plugin_options?: PluginOptions;
}

export interface ResultAttachment {
    uuid: string;
    attachment: string;
    attachment_type: string;
    filename: string;
}

export interface CrawlResult {
    uuid: string;
    title: string;
    url: string;
    result: string;
    created_at: string;
    attachments: ResultAttachment[];
}

export interface SpiderOptions {
    max_depth?: number;
    page_limit?: number;
    allowed_domains?: string[];
    exclude_paths?: string[];
    include_paths?: string[];
}

export type ActionType = 'pdf' | 'screenshot';

export interface Action {
    type: ActionType;
}

export interface PageOptions {
    exclude_tags?: string[];
    include_tags?: string[];
    wait_time?: number;
    only_main_content?: boolean;
    include_html?: boolean;
    include_links?: boolean;
    timeout?: number;
    accept_cookies_selector?: string;
    locale?: string;
    extra_headers?: Record<string, string>;
    actions?: Action[];
}

export interface PluginOptions {
    [key: string]: any;
}

export interface CreateCrawlRequest {
    url: string;
    options?: CrawlOptions;
}

export interface CrawlEvent {
    type: 'state' | 'result';
    data: CrawlRequest | CrawlResult;
}

// Search types
export type SearchStatus = 'new' | 'running' | 'cancelled' | 'canceling' | 'failed' | 'finished';

export type Depth = 'basic' | 'advanced' | 'ultimate';
export interface SearchOptions {
    language?: string | null; // Language code, e.g., "en", "fr"
    country?: string | null; // Country code, e.g., "us", "fr"
    time_range?: 'any' | 'hour' | 'day' | 'week' | 'month' | 'year';
    search_type?: 'web'; // Currently only web is supported
    depth?: Depth;
}

export interface SearchRequest {
    uuid: string;
    query: string;
    search_options: SearchOptions;
    result_limit: number;
    status: SearchStatus;
    created_at: string;
    duration: string | null;
    result?: SearchResult[] | null | string; // if prefetched = true return SearchResult[] else return url string 
}

export interface SearchResult {
    url: string;
    title: string;
    description: string;
    order?: number;
    depth: Depth;
}

export interface CreateSearchRequest {
    query: string;
    search_options?: SearchOptions;
    result_limit?: number;
}

export interface SearchEvent {
    type: 'state';
    status: SearchStatus;
    data: SearchRequest;
}

// Sitemap types
export interface SitemapNode {
    url: string;
    title: string;
}

export interface APIError extends Error {
    response: {
        data: any;
        status: number;
    };
}
