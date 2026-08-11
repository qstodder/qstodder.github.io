const allowedOrigins = new Set([
    "https://qstodder.github.io",
    "http://localhost:8000",
    "http://localhost:8080",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:8080"
]);

export function withAdminCors(
    request: Request,
    response: Response
): Response {
    const origin = request.headers.get("Origin");
    const headers = new Headers(response.headers);

    if (origin && allowedOrigins.has(origin)) {
        headers.set(
            "Access-Control-Allow-Origin",
            origin
        );
        headers.set(
            "Access-Control-Allow-Credentials",
            "true"
        );
    }

    headers.set("Vary", "Origin");

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}

export function adminPreflight(
    request: Request
): Response {
    const response = new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400"
        }
    });

    return withAdminCors(request, response);
}
