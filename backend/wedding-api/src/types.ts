export interface Env {
    wedding_rsvp_db: D1Database;
    GMAIL_CLIENT_ID: string;
    GMAIL_CLIENT_SECRET: string;
    GMAIL_REFRESH_TOKEN: string;
    GMAIL_SENDER_EMAIL: string;
    ACCESS_TEAM_DOMAIN?: string;
    ACCESS_AUD?: string;
    ADMIN_EMAILS?: string;
    WEDDING_SITE_PASSWORD?: string;
    WEDDING_SESSION_SECRET?: string;
}
