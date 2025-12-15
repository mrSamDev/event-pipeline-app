// Extensible event types - add new types here as needed
export enum EventType {
  SESSION_START = 'session_start',
  PAGE_VIEW = 'page_view',
  SEARCH = 'search',
  PURCHASE = 'purchase',
  ADD_TO_CART = 'add_to_cart',
  REMOVE_FROM_CART = 'remove_from_cart',
  BUTTON_CLICK = 'button_click',
  FORM_SUBMIT = 'form_submit',
  VIDEO_PLAY = 'video_play',
  VIDEO_PAUSE = 'video_pause',
}

// Canonical event shape - all events conform to this structure
export interface IEvent {
  eventId: string;          // UUID v4 for global uniqueness
  userId: string;           // Client-provided user identifier
  sessionId: string;        // Client-provided session identifier
  type: EventType;          // Event type from enum
  payload: Record<string, any>;  // Flexible JSON payload for event-specific data
  occurredAt: Date;         // Client-reported timestamp (when event happened)
  receivedAt: Date;         // Server timestamp (authoritative, prevents clock skew issues)
}

// Event creation payload (what clients send)
export interface IEventCreate {
  eventId: string;
  userId: string;
  sessionId: string;
  type: EventType;
  payload: Record<string, any>;
  occurredAt: Date;
}

// Batch event ingestion request
export interface IEventBatchRequest {
  events: IEventCreate[];
}

// Event ingestion response
export interface IEventIngestionResponse {
  success: boolean;
  receivedCount: number;
  message?: string;
}
