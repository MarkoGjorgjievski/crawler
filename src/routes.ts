import { createPlaywrightRouter } from 'crawlee';

export const router = createPlaywrightRouter();



router.addDefaultHandler(async ({ page, log, crawler, request }) => {
    log.setLevel(log.LEVELS.DEBUG);
    log.debug(`Default handler: ${request.url}`);
    
    // Get all level 1 category items (parent li elements)
    const categoryItems = await page.$$('li[id="webshop_root"] ul.lvl1 > li');
    log.debug(`Found ${categoryItems.length} categories`);
    
    for (let i = 0; i < categoryItems.length; i++) {
        // Re-select elements to avoid stale references
        const categories = await page.$$('li[id="webshop_root"] ul.lvl1 > li');
        const categoryItem = categories[i];
        
        // Get the category name before clicking
        const categoryName = await categoryItem.$eval('a', el => el.textContent?.trim() || 'Unknown');
        log.debug(`Processing category ${i + 1}/${categoryItems.length}: ${categoryName}`);
        
        // Click the category link to open submenu
        await categoryItem.$eval('a', el => el.click());
        
        // Wait a bit for the submenu to open and for 'li.open' class to be added
        await page.waitForTimeout(300);
        
        // Now collect subcategories from the opened menu
        const subcategories = await page.$$eval(
            'li.open div.menu-holder > ul.lvl2 > li > a',
            (links) => links.map((link)=> ({
                url: (link as HTMLAnchorElement).href, 
                text: (link as HTMLElement).textContent?.trim() || '',
            }))
        );
        
        log.debug(`Found ${subcategories.length} subcategories in ${categoryName}`);
        
        // Add each subcategory to the queue with metadata
        for (const sub of subcategories) {
            await crawler.addRequests([{
                url: sub.url,
                label: 'CATEGORY',
                userData: {
                    category: categoryName,
                    subcategory: sub.text,
                },
            }]);
        }
        
        log.debug(`Enqueued ${subcategories.length} subcategories from ${categoryName}`);
    }
    
    log.debug('All categories and subcategories processed');
});

router.addHandler('CATEGORY', async ({ request, page, enqueueLinks, log }) => {
    log.setLevel(log.LEVELS.DEBUG)
    log.debug(`Category handler: ${request.url}`);
    // these are all the products within the category
    await page.waitForSelector('.theProduct > a');
    log.debug('selector found for products');
    await enqueueLinks({
        selector: '.theProduct > a',
        label: 'DETAIL',
    });

    // this is the pagination which leads to the next page, same category
    // first two buttons are disabled, skip them 
    // error is thrown if I try to click them
    const nextButton = await page.$('li[role="menuitem"] > a');
    log.debug('next button found');
    if (nextButton) {
        await enqueueLinks({
            selector: 'li[role="menuitem"] > a',
            label: 'CATEGORY',
        });
    }
    log.debug(`Enqueueing pagination for: ${request.url}`);
})

router.addHandler('DETAIL', async ({ request, page, log, pushData }) => {
    log.setLevel(log.LEVELS.DEBUG)
    log.debug(`Extracting data: ${request.url}`);

    const title = await page.locator('product-details-second-col__title').textContent();
    const manufacturer = title?.split(' ')[0] ?? 'Unknown';

    const price = await page
        .locator('span.productRegularPrice')
        .textContent();

    const results = {
        url: request.url,
        manufacturer,
        title,
        currentPrice: price,
    };

    log.debug(`Saving data: ${request.url}`);
    await pushData(results);
});
