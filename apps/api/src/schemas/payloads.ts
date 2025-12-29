export interface PageViewPayload {
	url: string;
	title?: string;
	referrer?: string;
}

export interface SearchPayload {
	query: string;
	resultsCount?: number;
	filters?: Record<string, string | number | boolean>;
}

export interface PurchasePayload {
	orderId: string;
	revenue: number;
	currency: string;
	items: Array<{
		productId: string;
		name: string;
		quantity: number;
		price: number;
	}>;
}

export interface AddToCartPayload {
	productId: string;
	name: string;
	price: number;
	quantity: number;
	currency?: string;
}

export interface RemoveFromCartPayload {
	productId: string;
	quantity: number;
}

export interface ButtonClickPayload {
	buttonId?: string;
	buttonText?: string;
	elementClass?: string;
	targetUrl?: string;
}

export interface FormSubmitPayload {
	formId: string;
	formName?: string;
	fields?: Record<string, unknown>;
}

export interface VideoPlayPayload {
	videoId: string;
	videoTitle?: string;
	duration?: number;
	currentTime?: number;
}

export interface VideoPausePayload {
	videoId: string;
	currentTime: number;
	percentWatched?: number;
}

export interface SessionStartPayload {
	deviceType?: string;
	browser?: string;
	os?: string;
	screenResolution?: string;
	timezone?: string;
	language?: string;
}

export type EventPayload =
	| PageViewPayload
	| SearchPayload
	| PurchasePayload
	| AddToCartPayload
	| RemoveFromCartPayload
	| ButtonClickPayload
	| FormSubmitPayload
	| VideoPlayPayload
	| VideoPausePayload
	| SessionStartPayload
	| Record<string, unknown>;
