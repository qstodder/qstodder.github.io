import { Env } from "./types";

export function db(env: Env) {
    return env.wedding_rsvp_db;
}