import { createPlaywrightRouter, Dataset } from 'crawlee';
import { PricelistResponse, ProductDetail } from './types.js';

export const router = createPlaywrightRouter();

// Handler for fetching pricelist (paginated)
router.addHandler('PRICELIST', async ({ request, page, crawler, log }) => {
	const { currentPage, itemsPerPage, maxPages } = request.userData;

	log.info(`========== STARTING PRICELIST HANDLER ==========`);
	log.info(`Fetching pricelist page ${currentPage}/${maxPages}`);

	try {
		// Make API request to get pricelist
		const response = await page.evaluate(
			async ({ page, perPage }) => {
				const res = await fetch('https://www.neptun.mk/Product/GetPricelist', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						CurrentPage: page,
						ItemsPerPage: perPage,
						ShopId: null,
					}),
				});
				return res.json();
			},
			{ page: currentPage, perPage: itemsPerPage },
		);

		const data = response as PricelistResponse;

		if (!data.Data || !data.Data.Items || data.Data.Items.length === 0) {
			log.warning(`No items found on page ${currentPage}`);
			return;
		}

		log.info(`Found ${data.Data.Items.length} products on page ${currentPage}`);

		// First, queue all product detail requests with UNIQUE URLs
		for (let i = 0; i < data.Data.Items.length; i++) {
			const item = data.Data.Items[i];
			const uniqueUrl = `https://www.neptun.mk/Product/SearchProductsAutocomplete#p${currentPage}i${i}`;
			log.info(
				`Queuing product ${i + 1}/${data.Data.Items.length}: ${item.Title} (${uniqueUrl})`,
			);
			await crawler.addRequests(
				[
					{
						// CRITICAL: Each URL must be unique to avoid deduplication
						// Using hash with page and index makes each request unique
						url: uniqueUrl,
						label: 'PRODUCT_DETAIL',
						uniqueKey: `product-${currentPage}-${i}-${item.Title}`, // Explicit unique key
						userData: {
							productTitle: item.Title,
							pricelistData: item,
						},
					},
				],
				{ forefront: false },
			); // Add to back of queue
		}
		log.info(`Queued ${data.Data.Items.length} product detail requests`);

		// THEN queue next page if within limit (at the end, after all products)
		if (currentPage < maxPages) {
			log.info(`Preparing to queue page ${currentPage + 1}`);
			await crawler.addRequests(
				[
					{
						// Use unique URL with hash fragment for each page
						url: `https://www.neptun.mk/Product/GetPricelist#page${currentPage + 1}`,
						label: 'PRICELIST',
						uniqueKey: `pricelist-page-${currentPage + 1}`, // Explicit unique key for pagination
						userData: {
							currentPage: currentPage + 1,
							itemsPerPage,
							maxPages,
						},
					},
				],
				{ forefront: false },
			); // Add to back of queue, not front
			log.info(`Successfully queued page ${currentPage + 1}`);
		} else {
			log.info('Reached max pages limit');
		}
	} catch (error) {
		error && log.error(`Error fetching pricelist page ${currentPage}:`, error);
		throw error;
	}
});

// Handler for fetching product details
router.addHandler('PRODUCT_DETAIL', async ({ request, page, log }) => {
	const { productTitle, pricelistData } = request.userData;

	log.info(`Fetching details for: ${productTitle}`);

	try {
		// Make API request to get product details
		const response = await page.evaluate(async (title) => {
			const res = await fetch(
				'https://www.neptun.mk/Product/SearchProductsAutocomplete',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						itemsPerPage: 1,
						page: 1,
						term: title,
					}),
				},
			);
			return res.json();
		}, productTitle);

		// Extract product details from response
		if (response.ProductsResult?.results?.[0]) {
			const detail = response.ProductsResult.results[0] as ProductDetail;

			// Combine pricelist data with detailed data
			const product = {
				// Basic info
				title: detail.Title,
				manufacturer: detail.Manufacturer,
				category: pricelistData.CategoryName,

				// URLs and images
				url: `https://www.neptun.mk${detail.Url}`,
				imageUrl: detail.ImagePath
					? `https://www.neptun.mk/Content/Images/Proizvodi/${detail.ImagePath}`
					: null,

				// Identifiers
				barcode: detail.Barcode,
				modelNumber: detail.ModelNumber,
				codeNumber: detail.CodeNumber,

				// Pricing
				regularPrice: pricelistData.RegularPrice,
				discountPrice: pricelistData.DiscountPrice,
				discountPercent: pricelistData.DiscountPercent,
				hasDiscount: detail.HasDiscount,

				// Availability
				availableWebshop: pricelistData.AvailableWebshop,
				availableInShops: pricelistData.AvailableInShops,

				// Promotion
				promotionName: pricelistData.PromotionName,
				promotionFrom: pricelistData.From,
				promotionTo: pricelistData.To,

				// Description
				shortDescription: detail.ShortDescription,

				// Metadata
				scrapedAt: new Date().toISOString(),
			};

			// Save to dataset
			await Dataset.pushData(product);
			log.info(`Saved product: ${product.title}`);
		} else {
			log.warning(`No details found for: ${productTitle}`);
		}
	} catch (error) {
		error && log.error(`Error fetching details for ${productTitle}:`, error);
		// Don't throw - continue with other products
	}
});
