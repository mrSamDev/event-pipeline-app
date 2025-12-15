import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { sessionMiddleware, authMiddleware } from './auth.middleware';
import * as authModule from '../auth';

vi.mock('../auth', () => ({
  getAuth: vi.fn(),
}));

describe('sessionMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockAuth: any;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockRequest = {
      headers: { authorization: 'Bearer token123' },
    };
    mockResponse = {};
    mockNext = vi.fn();

    mockAuth = {
      api: {
        getSession: vi.fn(),
      },
    };

    vi.mocked(authModule.getAuth).mockReturnValue(mockAuth);
  });

  it('sets user and session when auth succeeds', async () => {
    const mockSession = {
      user: { id: 'user123', email: 'test@test.com' },
      session: { id: 'session456', expiresAt: new Date() },
    };

    mockAuth.api.getSession.mockResolvedValue(mockSession);

    await sessionMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockRequest.user).toEqual(mockSession.user);
    expect(mockRequest.session).toEqual(mockSession.session);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('sets user and session to null when no session', async () => {
    mockAuth.api.getSession.mockResolvedValue(null);

    await sessionMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockRequest.user).toBeNull();
    expect(mockRequest.session).toBeNull();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('handles auth errors and sets user/session to null', async () => {
    mockAuth.api.getSession.mockRejectedValue(new Error('Auth failed'));

    await sessionMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockRequest.user).toBeNull();
    expect(mockRequest.session).toBeNull();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});

describe('authMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRequest = {};
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      status: statusMock,
    };
    mockNext = vi.fn();
  });

  it('calls next when user is authenticated', () => {
    mockRequest.user = { id: 'user123', email: 'test@test.com' };

    authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('returns 401 when user is not authenticated', () => {
    mockRequest.user = null;

    authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 when user is undefined', () => {
    mockRequest.user = undefined;

    authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
