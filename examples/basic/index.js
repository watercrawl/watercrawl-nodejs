import { config } from 'dotenv';
import { WaterCrawlAPIClient } from '../../dist/index.js';

// Load environment variables
config();

const api = new WaterCrawlAPIClient(process.env.WATERCRAWL_API_KEY);

// Example 1: Simple synchronous crawl
async function simpleCrawl() {
    console.log('\nExample 1: Simple synchronous crawl');
    try {
        const pageOptions = {
            wait_time: 1000,
            only_main_content: true,
            include_html: true,
            include_links: true,
            actions: [
                { type: 'screenshot' },
                { type: 'pdf' }
            ]
        };

        const result = await api.scrapeUrl('https://watercrawl.dev', pageOptions);
        if ('result' in result) {
            console.log('Crawl result:', {
                title: result.title,
                url: result.url,
                attachments: result.attachments.map(a => a.filename)
            });
        } else {
            console.log('Crawl request created:', result.uuid);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Example 2: Asynchronous crawl with monitoring
async function monitoredCrawl() {
    console.log('\nExample 2: Asynchronous crawl with monitoring');
    try {
        const options = {
            spider_options: {
                max_depth: 1,
                page_limit: 5,
                allowed_domains: ['watercrawl.dev'],
                include_paths: ['/docs/*']
            },
            page_options: {
                wait_time: 1000,
                include_html: true,
                include_links: true,
                locale: 'en-US',
                actions: [{ type: 'screenshot' }]
            }
        };

        const request = await api.createCrawlRequest('https://watercrawl.dev', options);
        console.log('Started crawl:', request.uuid);

        for await (const event of api.monitorCrawlRequest(request.uuid)) {
            if (event.type === 'state') {
                const { status, number_of_documents: docs, duration } = event.data;
                console.log(`Status: ${status.toUpperCase()}, Documents: ${docs}${duration ? `, Duration: ${duration}` : ''}`);
            } else if (event.type === 'result') {
                console.log('New result:', {
                    url: event.data.url,
                    attachments: event.data.attachments.map(a => a.filename)
                });
                // Download and display the result data
                try {
                    const resultData = await api.downloadResult(event.data);
                    console.log('Result data:', resultData);
                } catch (error) {
                    console.error('Error downloading result:', error.message);
                }
            } else if (event.type === 'error') {
                console.error('Error event:', event.data);
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Example 3: List and manage crawls
async function manageCrawls() {
    console.log('\nExample 3: List and manage crawls');
    try {
        // List crawls
        const { results } = await api.getCrawlRequestsList();
        console.log('Recent crawls:', results.map(r => ({
            uuid: r.uuid,
            status: r.status,
            url: r.url,
            docs: r.number_of_documents,
            duration: r.duration
        })));

        // Create a new crawl with advanced options
        const request = await api.createCrawlRequest('https://watercrawl.dev', {
            spider_options: {
                max_depth: 2,
                allowed_domains: ['watercrawl.dev'],
                exclude_paths: ['/login/*']
            },
            page_options: {
                wait_time: 1000,
                only_main_content: true,
                include_html: true,
                actions: [{ type: 'screenshot' }]
            }
        });
        console.log('Created crawl:', {
            uuid: request.uuid,
            status: request.status,
            url: request.url
        });

        // Stop the crawl
        await api.stopCrawlRequest(request.uuid);
        console.log('Stopped crawl:', request.uuid);

        // Get results if any
        const { results: crawlResults } = await api.getCrawlRequestResults(request.uuid);
        if (crawlResults.length > 0) {
            console.log('Results:', crawlResults.map(r => ({
                title: r.title,
                url: r.url,
                attachments: r.attachments.map(a => a.filename)
            })));
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Example 4: Search functionality
async function searchExample() {
    console.log('\nExample 4: Search functionality');
    try {
        // List search requests
        const searchRequests = await api.getSearchRequestsList();
        console.log('Recent search requests:', searchRequests.results.map(r => ({
            uuid: r.uuid,
            status: r.status,
            query: r.query
        })));

        // Create an asynchronous search request and then monitor it
        console.log('\nCreating asynchronous search request...');
        const asyncSearch = await api.createSearchRequest(
            'javascript frameworks',
            {
                language: 'en',
                country: 'us',
                time_range: 'any',
                search_type: 'web',
                depth: 'basic'
            },
            3, // limit results
            false, // don't wait for results
            false // don't download results
        );
        console.log('Search request created:', asyncSearch.uuid);

        // Monitor search progress
        console.log('\nMonitoring search progress...');
        let count = 0;
        for await (const event of api.monitorSearchRequest(asyncSearch.uuid)) {
            console.log('Search event:', {
                type: event.type,
                status: event.data.status
            });
            count++;
            if (count >= 3 || event.data.status === 'finished') break;
        }

        // Get search request details
        const searchDetails = await api.getSearchRequest(asyncSearch.uuid);
        console.log('Search request details:', {
            uuid: searchDetails.uuid,
            query: searchDetails.query,
            status: searchDetails.status
        });

        // Try to stop the search request if it's still running
        try {
            if (searchDetails.status === 'running') {
                await api.stopSearchRequest(asyncSearch.uuid);
                console.log('Stopped search request:', asyncSearch.uuid);
            }
        } catch (error) {
            console.log('Note: Could not stop search - it might have already finished');
        }
    } catch (error) {
        console.error('Error in search example:', error.message);
    }
}

// Example 5: Batch crawl requests
async function batchCrawlExample() {
    console.log('\nExample 5: Batch crawl requests');
    try {
        // Define URLs to crawl in batch
        const urls = [
            'https://watercrawl.dev',
            'https://docs.watercrawl.dev',
            'https://watercrawl.dev/pricing'
        ];

        console.log(`Creating batch crawl request for ${urls.length} URLs...`);

        // Create a batch crawl request
        const batchRequest = await api.createBatchCrawlRequest(
            urls,
            {
                max_depth: 1,
                allowed_domains: ['watercrawl.dev']
            },
            {
                wait_time: 1000,
                include_html: true,
                include_links: true
            }
        );

        console.log('Batch crawl request created:', {
            uuid: batchRequest.uuid,
            status: batchRequest.status,
            numberOfUrls: urls.length
        });

        // Monitor the batch crawl request (limited to a few events)
        console.log('\nMonitoring batch crawl progress...');
        let count = 0;
        for await (const event of api.monitorCrawlRequest(batchRequest.uuid)) {
            if (event.type === 'state') {
                const { status, number_of_documents: docs } = event.data;
                console.log(`Status: ${status.toUpperCase()}, Documents: ${docs}`);
            } else if (event.type === 'result') {
                console.log('New result for URL:', event.data.url);
            }

            count++;
            if (count >= 5) {
                console.log('Limiting monitoring to 5 events...');
                break;
            }
        }

        // Get results of the batch crawl
        try {
            const results = await api.getCrawlRequestResults(batchRequest.uuid);
            console.log(`\nBatch crawl has ${results.results.length} results so far`);

            // Show preview of the first result if available
            if (results.results.length > 0) {
                console.log('First result preview:', {
                    url: results.results[0].url,
                    title: results.results[0].title
                });
            }
        } catch (error) {
            console.log('Could not get results yet, batch crawl may still be in progress');
        }
    } catch (error) {
        console.error('Error in batch crawl example:', error.message);
    }
}

// Example 6: New Sitemap API functionality
async function newSitemapExample() {
    console.log('\nExample 6: New Sitemap API functionality');
    try {
        // First, let's list existing sitemap requests
        console.log('Listing existing sitemap requests...');
        const sitemapList = await api.listSitemapRequests();
        console.log(`Found ${sitemapList.results.length} sitemap requests`);

        if (sitemapList.results.length > 0) {
            console.log('Most recent sitemap request:', {
                uuid: sitemapList.results[0].uuid,
                url: sitemapList.results[0].url,
                status: sitemapList.results[0].status
            });
        }

        // Create a new sitemap request (async mode)
        console.log('\nCreating new sitemap request...');
        const sitemapOptions = {
            include_subdomains: true,
            ignore_sitemap_xml: false,
            search: null,
            include_paths: [],
            exclude_paths: ['/login/*', '/admin/*']
        };

        const sitemapRequest = await api.createSitemapRequest(
            'https://watercrawl.dev',
            sitemapOptions,
            false, // async mode
            false  // don't download results yet
        );

        console.log('Sitemap request created:', {
            uuid: sitemapRequest.uuid,
            url: sitemapRequest.url,
            status: sitemapRequest.status
        });

        // Monitor the sitemap request progress
        console.log('\nMonitoring sitemap generation progress...');
        let eventCount = 0;
        for await (const event of api.monitorSitemapRequest(sitemapRequest.uuid)) {
            if (event.type === 'state') {
                console.log('Sitemap status update:', event.data.status);
            } else if (event.type === 'feed') {
                console.log('Sitemap feed update:', event.data.message);
            }

            eventCount++;
            if (eventCount >= 5) {
                console.log('Limiting monitoring to 5 events...');
                break;
            }
        }

        // Get sitemap request details
        console.log('\nRetrieving sitemap request details...');
        try {
            const updatedRequest = await api.getSitemapRequest(sitemapRequest.uuid);
            console.log('Sitemap request details:', {
                uuid: updatedRequest.uuid,
                url: updatedRequest.url,
                status: updatedRequest.status,
                created_at: updatedRequest.created_at
            });
        } catch (error) {
            console.log('Error retrieving sitemap details:', error.message);
        }

        // Try getting sitemap results in different formats
        // Note: This may fail if the sitemap is not yet complete
        console.log('\nAttempting to get sitemap results...');

        // Find a completed sitemap request to demonstrate results
        const completedSitemap = sitemapList.results.find(
            req => req.status === 'finished'
        );

        if (completedSitemap) {
            console.log('Found completed sitemap to show results:', completedSitemap.uuid);

            try {
                // JSON format (default)
                console.log('\nGetting sitemap results in JSON format...');
                const jsonResults = await api.getSitemapResults(completedSitemap.uuid);
                console.log('JSON results preview:',
                    Array.isArray(jsonResults)
                        ? `Array with ${jsonResults.length} items`
                        : typeof jsonResults
                );

                // Markdown format
                console.log('\nGetting sitemap results in Markdown format...');
                const markdownResults = await api.getSitemapResults(
                    completedSitemap.uuid,
                    'markdown'
                );
                if (typeof markdownResults === 'string') {
                    console.log('Markdown preview:',
                        markdownResults.length > 100
                            ? markdownResults.substring(0, 100) + '...'
                            : markdownResults
                    );
                }

                // Graph format
                console.log('\nGetting sitemap results in Graph format...');
                const graphResults = await api.getSitemapResults(
                    completedSitemap.uuid,
                    'graph'
                );
                if (typeof graphResults === 'object') {
                    console.log('Graph structure:', graphResults);
                }
            } catch (error) {
                console.log('Error getting sitemap results:', error.message);
            }
        } else {
            console.log('No completed sitemap found to demonstrate results formats');
        }

    } catch (error) {
        console.error('Error in new sitemap example:', error.message);
    }
}

// Run all examples
async function main() {
    console.log('Running WaterCrawl examples...');

    // Uncomment the examples you want to run
    // await simpleCrawl();
    // await monitoredCrawl();
    // await manageCrawls();
    // await searchExample();
    await batchCrawlExample();
    await newSitemapExample();

    console.log('\nAll examples completed!');
}

main().catch(console.error);
