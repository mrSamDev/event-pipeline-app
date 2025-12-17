// Session interface - represents a user session
export interface ISession {
	sessionId: string; // Unique session identifier
	userId: string; // Associated user
	startedAt: Date; // Session start time
	endedAt?: Date; // Session end time (optional, for active sessions)
	eventCount: number; // Number of events in this session
	device?: string; // Device type (mobile, desktop, tablet)
	browser?: string; // Browser name
	os?: string; // Operating system
	ipAddress?: string; // IP address (anonymized if needed)
	userAgent?: string; // User agent string
	metadata?: Record<string, any>; // Additional session properties
}

// Session creation payload
export interface ISessionCreate {
	sessionId: string;
	userId: string;
	startedAt: Date;
	device?: string;
	browser?: string;
	os?: string;
	ipAddress?: string;
	userAgent?: string;
	metadata?: Record<string, any>;
}

// Session statistics
export interface ISessionStats {
	sessionId: string;
	userId: string;
	startedAt: Date;
	endedAt?: Date;
	duration?: number; // Session duration in milliseconds
	eventCount: number;
	pageViewCount: number;
	uniquePages: number;
}
