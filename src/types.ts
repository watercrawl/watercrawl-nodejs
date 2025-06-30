export type CrawlStatus = 'new' | 'running' | 'cancelled' | 'canceling' | 'failed' | 'finished';

export interface CrawlRequest {
  uuid: string;
  url: string;
  urls: string[];
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

export interface BatchCrawlOptions {
  spider_options?: BatchSpiderOptions;
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
  proxy_server?: string;
}

export interface BatchSpiderOptions {
  proxy_server?: string;
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

export interface CreateBatchCrawlRequest {
  urls: string[];
  options?: BatchCrawlOptions;
}

export enum CrawlEventType {
  State = 'state',
  Result = 'result',
  Feed = 'feed',
}

export enum FeedType {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}

export interface FeedMessage {
  id: string;
  message: string;
  timestamp?: string;
  type: FeedType;
  metadata?: Record<string, any>;
}

export interface CrawlEvent {
  type: CrawlEventType;
  data: CrawlRequest | CrawlResult | FeedMessage;
}

export enum SearchStatus {
  New = 'new',
  Running = 'running',
  Canceled = 'canceled',
  Canceling = 'canceling',
  Failed = 'failed',
  Finished = 'finished',
}

export enum SearchDepth {
  Basic = 'basic',
  Advanced = 'advanced',
  Ultimate = 'ultimate',
}

export enum SearchTimeRange {
  Any = 'any',
  Hour = 'hour',
  Day = 'day',
  Week = 'week',
  Month = 'month',
  Year = 'year',
}

export enum SearchType {
  Web = 'web', // Currently only web is supported
}

export interface SearchOptions {
  language?: string | null; // Language code, e.g., "en", "fr"
  country?: string | null; // Country code, e.g., "us", "fr"
  time_range?: SearchTimeRange;
  search_type?: SearchType;
  depth?: SearchDepth;
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
  depth: SearchDepth;
}

export interface CreateSearchRequest {
  query: string;
  search_options?: SearchOptions;
  result_limit?: number;
}

export enum SearchEventType {
  State = 'state',
  Feed = 'feed',
}

export interface SearchEvent {
  type: SearchEventType;
  data: SearchRequest | FeedMessage;
}

// Sitemap types
export interface SitemapNode {
  url: string;
  title: string;
}

export enum SitemapStatus {
  New = 'new',
  Running = 'running',
  Finished = 'finished',
  Failed = 'failed',
  Canceled = 'canceled',
}

export interface SitemapOptions {
  include_subdomains: boolean;
  ignore_sitemap_xml: boolean;
  search: string | null;
  include_paths: string[];
  exclude_paths: string[];
}

export interface SitemapRequest {
  uuid: string;
  url: string;
  status: SitemapStatus;
  options: SitemapOptions;
  duration?: string;
  result?: string | Array<string>;
  created_at: string;
  updated_at: string;
}

export enum EventType {
  Feed = 'feed',
  State = 'state',
}

export interface SitemapEvent {
  type: EventType;
  data: SitemapRequest | FeedMessage;
}

export enum SitemapOutputFormat {
  Json = 'json',
  Markdown = 'markdown',
  Graph = 'graph',
}
