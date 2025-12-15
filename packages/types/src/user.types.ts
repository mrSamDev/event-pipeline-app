// User interface - represents a user in the system
export interface IUser {
  userId: string;           // Unique user identifier
  email?: string;           // Optional email address
  name?: string;            // Optional user name
  createdAt: Date;          // When the user was created
  updatedAt: Date;          // Last time user was updated
  metadata?: Record<string, any>;  // Additional user properties
}

// User creation payload
export interface IUserCreate {
  userId: string;
  email?: string;
  name?: string;
  metadata?: Record<string, any>;
}

// User update payload
export interface IUserUpdate {
  email?: string;
  name?: string;
  metadata?: Record<string, any>;
}

// User profile with statistics
export interface IUserProfile extends IUser {
  eventCount: number;       // Total number of events
  lastEventAt?: Date;       // Timestamp of most recent event
  sessionCount: number;     // Total number of sessions
}
