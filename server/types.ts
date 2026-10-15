export type RouteContext = { request: Request; url: URL; clientAddress: string };
export type RouteHandler = (context: RouteContext) => Promise<Response> | Response;
