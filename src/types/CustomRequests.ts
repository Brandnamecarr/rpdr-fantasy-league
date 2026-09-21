// Doc: Custom Express Request type definitions.
// Doc: Extends base Express Request types with specific body structures for different endpoints.
import {Request} from 'express';
import { UserTokenPayload } from './Interfaces';

export interface LoginRequest extends Request {
    body: {
        email?: string;
        password?: string;
    };
}

// Doc: Extended Express Request with authenticated user information
// Doc: Properties: user (UserTokenPayload?) - optional decoded JWT payload attached by auth middleware
// Doc: Generic ReqBody param lets callers type req.body (e.g. AuthRequest<UpdateDisplayNameBody>)
// Doc: instead of falling back to Request's default `any` body type. Defaults to `unknown` so a
// Doc: caller that doesn't need a typed body still can't destructure it without narrowing first.
export interface AuthRequest<ReqBody = unknown> extends Request<Record<string, string>, unknown, ReqBody> {
    user?: UserTokenPayload;
}
