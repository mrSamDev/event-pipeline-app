export interface PageViewPayload extends Record<string, unknown> {
	url: string;
	title?: string;
	referrer?: string;
}

export interface SearchPayload extends Record<string, unknown> {
	query: string;
	resultsCount?: number;
	filters?: Record<string, string | number | boolean>;
}

export interface PurchasePayload extends Record<string, unknown> {
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

export interface AddToCartPayload extends Record<string, unknown> {
	productId: string;
	name: string;
	price: number;
	quantity: number;
	currency?: string;
}

export interface RemoveFromCartPayload extends Record<string, unknown> {
	productId: string;
	quantity: number;
}

export interface ButtonClickPayload extends Record<string, unknown> {
	buttonId?: string;
	buttonText?: string;
	elementClass?: string;
	targetUrl?: string;
}

export interface FormSubmitPayload extends Record<string, unknown> {
	formId: string;
	formName?: string;
	fields?: Record<string, unknown>;
}

export interface VideoPlayPayload extends Record<string, unknown> {
	videoId: string;
	videoTitle?: string;
	duration?: number;
	currentTime?: number;
}

export interface VideoPausePayload extends Record<string, unknown> {
	videoId: string;
	currentTime: number;
	percentWatched?: number;
}

export interface SessionStartPayload extends Record<string, unknown> {
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
