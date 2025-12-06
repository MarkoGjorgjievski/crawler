export interface Category {
    name: string;
    slug: string;
}

export interface ProductBasicInfo {
    title: string;
    brand: string;
    clubPrice: string;
    regularPrice: string;
    sku: string;
    imageUrl: string;
    category: string;
}

export interface Product extends ProductBasicInfo {
    store: string;
    url: string;
    scrapedAt: string;
}