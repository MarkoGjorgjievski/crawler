import { createPlaywrightRouter, Dataset } from "crawlee";

export const router = createPlaywrightRouter();

// Handler to extract all categories
router.addHandler(
    'EXTRACT_CATEGORIES',
    async ({ request, page, crawler, log }) => {
        const { itemsPerPage, maxPages } = request.userData;

        log.info('========== Extracting categories ==========');

        try {
            // Wait for page to load
            await page.waitForLoadState('networkidle');
            await page.waitForSelector('ul.vertical-megamenu');

            // =========== THIS IS FOR TESTING ============= //
            // const categories = [
            //     { slug: 'https://www.tehnomarket.com.mk/category/4003/laptopi', name: 'ЛАПТОПИ' },
            // { slug: 'https://www.tehnomarket.com.mk/category/4004/torbi-i-ranci-za-laptopi', name: 'ТОРБИ И ЛАНЦИ ЗА ЛАПТОПИ' }
            // ]

            // =========== THIS IS REAL ============= //
            // Extract all script tags and find the one with main_categories
            const categories = await page.evaluate(() => {
                const anchors = Array.from(document.querySelectorAll('ul.vertical-megamenu > li > a'));

                return anchors.map(a => ({ name: a.getAttribute('data-text'), slug: a.getAttribute('href') || '#' }))
            });


            log.info(`✅ Extracted ${categories.length} categories`);

            // Queue each category for scraping
            for (const category of categories) {
                log.info(`Queuing category: ${category.name} (${category.slug})`);
                await crawler.addRequests([
                    {
                        url: category.slug,
                        label: 'SCRAPE_CATEGORY',
                        uniqueKey: `category-${category.slug}`,
                        userData: {
                            category: category.name,
                            currentPage: 1,
                            itemsPerPage,
                            maxPages,
                        },
                    },
                ]);
            }
        } catch (error) {
            error && log.error('Error extracting categories:', error);
            throw error;
        }
    },
);

router.addHandler(
    'SCRAPE_CATEGORY',
    async ({ request, page, crawler, log }) => {
        const { category, currentPage, itemsPerPage, maxPages } =
            request.userData;

        log.info(
            `Scraping category: ${category} - Page ${currentPage}/${maxPages}`,
        )

        // try {
        //     await page.waitForLoadState('networkidle');
        //     await page.waitForTimeout(2000);

        //     // Extract all product info from the category page
        //     const products = await page.evaluate((categoryName) => {
        //         const productContainers = document.querySelectorAll('ul.products > li');
        //         const extractedProducts: any[] = [];

        //         productContainers.forEach((container) => {
        //             const productUrl = container?.querySelector('div.pbox > a')?.getAttribute('href');
        //             const title = container?.querySelector('div.product-name')?.getAttribute('title') ?? '';


        //             if (productUrl) {
        //                 extractedProducts.push({
        //                     productUrl,
        //                     category: categoryName,
        //                     title,
        //                 });
        //             }
        //         });

        //         return extractedProducts;
        //     }, category);

        //     log.info(`Found ${products.length} products on page ${currentPage}`);

        //     // Limit products per page if specified
        //     const productsToProcess = itemsPerPage
        //         ? products.slice(0, itemsPerPage)
        //         : products;

        //     log.info(
        //         `Processing ${productsToProcess.length} products (itemsPerPage: ${itemsPerPage})`,
        //     );

        //     // Queue each product to get its URL via search
        //     for (let i = 0; i < products.length; i++) {
        //         const product = products[i];
        //         await crawler.addRequests([
        //             {
        //                 url: product.productUrl,
        //                 label: 'PRODUCT_DETAILS',
        //                 uniqueKey: `product-details-${category.slug}-${currentPage}-${i}`,
        //                 userData: {
        //                     productInfo: product,
        //                 },
        //             },
        //         ]);
        //     }

        //     // Check if we should continue to next page
        //     if (currentPage >= maxPages) {
        //         log.info(
        //             `Reached max pages limit (${maxPages}) for category: ${category}`,
        //         );
        //         return;
        //     }

        //     // Check for next page button
        //     const hasNextPage = await page.evaluate(() => {
        //         const nextButton = document.querySelector(
        //             'a i.icon-angle-right',
        //         );
        //         return nextButton !== null;
        //     });

        //     if (hasNextPage) {
        //         log.info(`Found next page for category ${category}`);

        //         await page.click('a i.icon-angle-right');
        //         await page.waitForTimeout(2000);

        //         await crawler.addRequests([
        //             {
        //                 url: page.url(),
        //                 label: 'SCRAPE_CATEGORY',
        //                 uniqueKey: `category-${category.slug}-page-${currentPage + 1}`,
        //                 userData: {
        //                     category,
        //                     currentPage: currentPage + 1,
        //                     itemsPerPage,
        //                     maxPages,
        //                 },
        //             },
        //         ]);
        //     } else {
        //         log.info(`✅ Completed category: ${category}`);
        //     }
        // } catch (error) {
        //     error &&
        //         log.error(
        //             `Error scraping category ${category} page ${currentPage}:`,
        //             error,
        //         );
        //     throw error;
        // }
    },
);

// Handler to get product URL via search
// router.addHandler('PRODUCT_DETAILS', async ({ request, page, log }) => {
//     const { productInfo } = request.userData as { productInfo: { productUrl: string, category: string, title: string } };

//     log.info(`Getting URL for product: ${productInfo.title}`);

//     try {
//         await page.waitForLoadState('networkidle');
//         await page.waitForTimeout(1000);

//         // let price = ''
//         // let smartPrice = ''

//         // let priceEl = document.querySelector('div.price3 > span.nm');
//         // if (priceEl) {
//         //     price = priceEl.innerHTML
//         // }

//         // let smartPriceEl = document.querySelector('div.price > span.nm');
//         // if (smartPriceEl) {
//         //     smartPrice = smartPriceEl.innerHTML
//         // }


//         // Create final product object
//         const product = {
//             store: 'Tehnomarket',
//             url: productInfo.productUrl,
//             // price,
//             // smartPrice,
//             ...productInfo,
//             scrapedAt: new Date().toISOString(),
//         };

//         await Dataset.pushData(product);
//         log.info(`✅ Saved product: ${product.title}`);

//     } catch (error) {
//         error && log.error(`Error getting URL for ${productInfo.title}:`, error);
//     }
// })