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

// Run all examples
async function main() {
    console.log('Running WaterCrawl examples...');
    
    // await simpleCrawl();
    await monitoredCrawl();
    // await manageCrawls();
    
    console.log('\nAll examples completed!');
}

main().catch(console.error);
