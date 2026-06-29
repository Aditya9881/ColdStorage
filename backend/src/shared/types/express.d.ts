import { Query } from 'express-serve-static-core';

// Override Express's query type to simplify usage in route handlers
// Express query params can be string | string[] | ParsedQs | ParsedQs[]
// but in practice we always use them as string | undefined
declare module 'express-serve-static-core' {
  interface Request {
    query: Record<string, string | undefined>;
  }
}

export {};
