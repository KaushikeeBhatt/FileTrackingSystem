/// <reference types="next" />
/// <reference types="next/image-types/global" />

// Add type declarations for Node.js and other global objects
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    MONGODB_URI: string;
    JWT_SECRET: string;
    // Add other environment variables here
  }
}

// Add type declarations for modules that don't have type definitions
declare module 'bcryptjs' {
  export function hashSync(password: string, salt: number): string;
  export function compareSync(password: string, hash: string): boolean;
  // Add other bcryptjs methods you use
}

declare module 'jsonwebtoken' {
  export interface JwtPayload {
    userId: string;
    role: string;
    // Add other JWT payload fields you use
  }
  
  export function sign(payload: string | object | Buffer, secretOrPrivateKey: string, options?: any): string;
  export function verify(token: string, secretOrPublicKey: string, options?: any): JwtPayload;
  // Add other jsonwebtoken methods you use
}
