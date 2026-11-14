// Types for the plain-JavaScript PostgREST Lambda adapter (index.mjs).

export type HttpApiEvent = {
  rawPath?: string;
  rawQueryString?: string;
  headers?: Record<string, string>;
  cookies?: string[];
  body?: string | null;
  isBase64Encoded?: boolean;
  requestContext: { http: { method: string } };
};

export type HttpApiResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded: boolean;
};

export declare function toRequest(
  event: HttpApiEvent,
  base: string,
): {
  url: string;
  init: { method: string; headers: Record<string, string>; body?: string | Buffer };
};
export declare function toResult(res: Response): Promise<HttpApiResult>;
export declare function handler(event: HttpApiEvent): Promise<HttpApiResult>;
