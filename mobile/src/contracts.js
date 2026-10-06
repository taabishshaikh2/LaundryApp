import { z } from 'zod';
export const roles = ['CUSTOMER', 'RIDER', 'LAUNDRY_PARTNER', 'ADMIN'];
export const password = z.string().min(8, 'Use at least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number');
export const loginSchema = z.object({ email: z.string().trim().email('Enter a valid email'), password: z.string().min(1, 'Enter your password') });
export const registerSchema = loginSchema.extend({ name: z.string().trim().min(1, 'Enter your name'), phone: z.string().trim().min(1, 'Enter your phone number'), password });
export const userSchema = z.object({ id: z.string(), name: z.string(), email: z.string(), role: z.enum(roles), onboarding: z.object({ completed: z.boolean().optional() }).passthrough().optional() }).passthrough();
export const sessionSchema = z.object({ token: z.string().min(1), refreshToken: z.string().min(1), user: userSchema }).passthrough();
export function hasPermission(user, permission) { return user?.role === 'ADMIN' && (!user.adminPermissions?.length || user.adminPermissions.includes(permission)); }
export function homeFor(user) { if (!user) return '/login'; if (user.role === 'CUSTOMER' && !user.onboarding?.completed) return '/onboarding'; return '/dashboard'; }
