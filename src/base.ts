import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import urlJoin from 'url-join';
import { Readable } from 'node:stream';

export class BaseAPIClient {
  protected client: AxiosInstance;
  protected baseUrl: string;
  protected apiKey: string;

  constructor(apiKey: string, baseUrl: string = 'https://app.watercrawl.dev') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-API-KEY': `${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          console.error('API Error:', {
            url: error.config.url,
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers,
          });
        }
        throw error;
      },
    );
  }

  protected async get<T>(path: string, params: Record<string, any> = {}): Promise<T> {
    const response = await this.client.get<T>(path, { params });
    return response.data;
  }

  protected async post<T>(path: string, data: Record<string, any> = {}): Promise<T> {
    const response = await this.client.post<T>(path, data);
    return response.data;
  }

  protected async put<T>(path: string, data: Record<string, any> = {}): Promise<T> {
    const response = await this.client.put<T>(path, data);
    return response.data;
  }

  protected async delete<T>(path: string): Promise<T> {
    const response = await this.client.delete<T>(path);
    return response.data;
  }

  protected async patch<T>(path: string, data: Record<string, any> = {}): Promise<T> {
    const response = await this.client.patch<T>(path, data);
    return response.data;
  }

  protected buildUrl(...parts: string[]): string {
    return urlJoin(this.baseUrl, ...parts);
  }

  /**
   * Async generator that streams SSE data using fetch and yields parsed JSON
   */
  protected async *fetchStream<T>(
    endpoint: string,
    config: AxiosRequestConfig = {},
  ): AsyncGenerator<T> {
    const response = await this.client.get(endpoint, {
      responseType: 'stream',
      ...config,
    });

    const stream = response.data as Readable;

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    for await (const chunk of stream) {
      buffer += decoder.decode(chunk, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.slice(5).trim();
          try {
            yield JSON.parse(dataStr) as T;
          } catch (err) {
            console.error('Failed to parse JSON from stream:', dataStr, err);
          }
        }
      }
    }
  }
}
