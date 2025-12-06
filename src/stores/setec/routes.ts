import { createPlaywrightRouter, Dataset } from 'crawlee';
import { extractUniqueMainCategories } from './transform.js';
import { config } from './config.js';
import { Product, ProductBasicInfo } from './types.js';

export const router = createPlaywrightRouter();

// Handler to extract all categories from JavaScript
router.addHandler(
	'EXTRACT_CATEGORIES',
	async ({ request, page, crawler, log }) => {
		const { itemsPerPage, maxPages } = request.userData;

		log.info('========== Extracting categories from JavaScript ==========');

		try {
			// Wait for page to load
			await page.waitForLoadState('networkidle');
			await page.waitForTimeout(2000);

			// Extract all script tags and find the one with main_categories
			const scriptContent = await page.evaluate(() => {
				const scripts = Array.from(document.querySelectorAll('script'));

				for (const script of scripts) {
					const content = script.innerHTML;
					if (content.includes('main_categories')) {
						return content;
					}
				}

				return null;
			});

			if (!scriptContent) {
				log.error('Could not find script with main_categories');
				return;
			}

			log.info('Found script with main_categories, extracting...');

			// Extract categories using our helper function
			const categories = extractUniqueMainCategories(scriptContent);

			log.info(`✅ Extracted ${categories.length} categories`);

			// Queue each category for scraping
			for (const category of categories) {
				log.info(`Queuing category: ${category.name} (${category.slug})`);
				await crawler.addRequests([
					{
						url: `${config.initialRequest.url}/category/${category.slug}`,
						label: 'SCRAPE_CATEGORY',
						uniqueKey: `category-${category.slug}`,
						userData: {
							category: category.name,
							categorySlug: category.slug,
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

// Handler to scrape products from a category page
router.addHandler(
	'SCRAPE_CATEGORY',
	async ({ request, page, crawler, log }) => {
		const { category, categorySlug, currentPage, itemsPerPage, maxPages } =
			request.userData;

		log.info(
			`Scraping category: ${category} - Page ${currentPage}/${maxPages}`,
		);

		try {
			await page.waitForLoadState('networkidle');
			await page.waitForTimeout(2000);

			// Extract all product info from the category page
			const products = await page.evaluate((categoryName) => {
				const productContainers = document.querySelectorAll('div.grid > div');
				const extractedProducts: any[] = [];

				productContainers.forEach((container) => {
					const hoverDiv = container.querySelector(
						'div.hover\\:cursor-pointer',
					);
					if (!hoverDiv) return;

					// Brand
					const brand = hoverDiv.querySelector('p')?.textContent?.trim() || '';

					// Title - try multiple selectors
					const titleElement =
						hoverDiv.querySelector('p + h3') ||
						hoverDiv.querySelector('h3.text-lg');
					const title = titleElement?.textContent?.trim() || '';

					// Club price
					const clubPriceElement = container.querySelector(
						'p.text-orange.text-sm',
					);
					let clubPrice = '';
					if (clubPriceElement?.textContent?.includes('Клуб цена:')) {
						const priceSpan = clubPriceElement.querySelector('span.text-xl');
						clubPrice = priceSpan?.textContent?.trim() || '';
					}

					// Regular price
					const regularPriceElement = container.querySelector(
						'p.text-blackSecondary.text-xs',
					);
					let regularPrice = '';
					if (regularPriceElement?.textContent?.includes('Редовна цена:')) {
						const priceSpan = regularPriceElement.querySelector('span.text-sm');
						regularPrice = priceSpan?.textContent?.trim() || '';
					}

					// SKU
					let sku = '';
					const paragraphs = container.querySelectorAll('p');
					paragraphs.forEach((p) => {
						const text = p.textContent || '';
						if (text.includes('Шифра:')) {
							sku = text.replace('Шифра:', '').trim();
						}
					});

					// Image - find img with alt matching the title
					const img =
						container.querySelector('img.object-cover') ||
						container.querySelector('img');
					const imageUrl = img?.getAttribute('src') || '';

					if (title) {
						extractedProducts.push({
							title,
							brand,
							clubPrice,
							regularPrice,
							sku,
							imageUrl,
							category: categoryName,
						});
					}
				});

				return extractedProducts;
			}, category);

			log.info(`Found ${products.length} products on page ${currentPage}`);

			// Limit products per page if specified
			const productsToProcess = itemsPerPage
				? products.slice(0, itemsPerPage)
				: products;

			log.info(
				`Processing ${productsToProcess.length} products (itemsPerPage: ${itemsPerPage})`,
			);

			// Queue each product to get its URL via search
			for (let i = 0; i < products.length; i++) {
				const product = products[i];
				await crawler.addRequests([
					{
						url: `${config.initialRequest.url}`,
						label: 'GET_PRODUCT_URL',
						uniqueKey: `product-url-${categorySlug}-${currentPage}-${i}`,
						userData: {
							productInfo: product,
						},
					},
				]);
			}

			// Check if we should continue to next page
			if (currentPage >= maxPages) {
				log.info(
					`Reached max pages limit (${maxPages}) for category: ${category}`,
				);
				return;
			}

			// Check for next page button
			const hasNextPage = await page.evaluate(() => {
				const nextButton = document.querySelector(
					'button:not([disabled]) > img[alt="Arrow right"]',
				);
				return nextButton !== null;
			});

			if (hasNextPage) {
				log.info(`Found next page for category ${category}`);

				await page.click('button:not([disabled]) > img[alt="Arrow right"]');
				await page.waitForTimeout(2000);

				await crawler.addRequests([
					{
						url: page.url(),
						label: 'SCRAPE_CATEGORY',
						uniqueKey: `category-${categorySlug}-page-${currentPage + 1}`,
						userData: {
							category,
							categorySlug,
							currentPage: currentPage + 1,
							itemsPerPage,
							maxPages,
						},
					},
				]);
			} else {
				log.info(`✅ Completed category: ${category}`);
			}
		} catch (error) {
			error &&
				log.error(
					`Error scraping category ${category} page ${currentPage}:`,
					error,
				);
			throw error;
		}
	},
);

// Handler to get product URL via search
router.addHandler('GET_PRODUCT_URL', async ({ request, page, log }) => {
	const { productInfo } = request.userData as { productInfo: ProductBasicInfo };

	log.info(`Getting URL for product: ${productInfo.title}`);

	try {
		await page.waitForLoadState('networkidle');
		await page.waitForTimeout(1000);

		// Find the search input
		const searchInput = await page.$('div > input');
		if (!searchInput) {
			log.warning('Could not find search input');
			return;
		}

		// Focus and type the product title
		await searchInput.focus();
		await searchInput.fill(productInfo.title);

		// Wait for search results
		await page.waitForTimeout(2500);

		// Extract product URL from search results
		const productUrl = await page.evaluate(() => {
			const resultsContainer = document.querySelector(
				'div.absolute.w-full.max-w-md',
			);
			if (!resultsContainer) return null;

			const link = resultsContainer.querySelector('a');
			return link?.getAttribute('href') || null;
		});

		// Close search results
		const closeButton = await page.$(
			'button[aria-label="Close search results"]',
		);
		if (closeButton) {
			await closeButton.click();
			await page.waitForTimeout(500);
		}

		if (!productUrl) {
			log.warning(`Could not find URL for product: ${productInfo.title}`);
			return;
		}

		// Construct full URL
		const fullUrl = productUrl.startsWith('http')
			? productUrl
			: `${config.initialRequest.url}${productUrl}`;

		// Create final product object
		const product: Product = {
			store: 'setec',
			url: fullUrl,
			...productInfo,
			scrapedAt: new Date().toISOString(),
		};

		await Dataset.pushData(product);
		log.info(`✅ Saved product: ${product.title}`);
	} catch (error) {
		error && log.error(`Error getting URL for ${productInfo.title}:`, error);
	}
});
