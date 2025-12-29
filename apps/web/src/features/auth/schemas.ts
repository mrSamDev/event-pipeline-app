import { z } from "zod";

export const signUpSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
	name: z.string().min(2, "Name must be at least 2 characters"),
});

export const signInSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
});

export const sessionSchema = z.object({
	user: z.object({
		id: z.string(),
		email: z.string().email(),
		name: z.string(),
		emailVerified: z.boolean().optional(),
		image: z.string().nullable().optional(),
		createdAt: z.coerce.date().optional(),
		updatedAt: z.coerce.date().optional(),
	}),
	session: z.object({
		id: z.string().optional(),
		token: z.string().optional(),
		expiresAt: z.coerce.date(),
		createdAt: z.coerce.date().optional(),
		updatedAt: z.coerce.date().optional(),
		ipAddress: z.string().optional(),
		userAgent: z.string().optional(),
	}),
});

export type {
	SessionData as Session,
	SignInData,
	SignUpData,
} from "@martech/types";
