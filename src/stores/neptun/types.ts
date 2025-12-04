export interface PricelistItem {
    Title: string;
    RegularPrice: number;
    CategoryName: string;
    AvailableWebshop: boolean;
    DiscountPrice: number;
    DiscountPercent: number;
    PromotionName: string | null;
    From: string | null;
    To: string | null;
    DiscountPriceType: string;
    AvailableInShops: boolean;
    OnlinePrice: number;
    ShowOnlinePrice: boolean;
}

export interface PricelistResponse {
    Data: {
        Config: {
            TotalItems: number;
            ItemsPerPage: number;
            MaxSize: number;
        };
        Items: PricelistItem[];
    };
}

export interface ProductDetail {
    Title: string;
    Url: string;
    Link: string;
    ShortDescription: string;
    Barcode: string;
    ModelNumber: string;
    CodeNumber: string;
    ImagePath: string;
    Image: string;
    Manufacturer: string;
    CategoryId: string;
    RegularPrice: number;
    DiscountPrice: number;
    HasDiscount: boolean;
    AvailableWebshop: boolean;
}