import { PlaywrightCrawlerOptions, PlaywrightCrawlingContext, RouterHandler, Request } from "crawlee";

export interface Store {
    name: string;
    router: RouterHandler<PlaywrightCrawlingContext>;
    config: PlaywrightCrawlerOptions & { initialRequest: Partial<Request> };
}