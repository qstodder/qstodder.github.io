import { withCors } from "./cors";

export function ok(data: unknown): Response {

    return withCors(
        Response.json(data)
    );
}

export function badRequest(message: string): Response {

    return withCors(
        Response.json(
            { error: message },
            { status: 400 }
        )
    );
}

export function notFound(message = "Not found"): Response {

    return withCors(
        Response.json(
            { error: message },
            { status: 404 }
        )
    );
}
