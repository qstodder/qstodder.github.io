export interface Env {
    wedding_rsvp_db: D1Database;
    GMAIL_CLIENT_ID: string;
    GMAIL_CLIENT_SECRET: string;
    GMAIL_REFRESH_TOKEN: string;
    GMAIL_SENDER_EMAIL: string;
    ACCESS_TEAM_DOMAIN?: string;
    ACCESS_AUD?: string;
    ADMIN_EMAILS?: string;
}

export interface RSVPRequest {
    householdId: number;

    email: string;

    street: string;
    city: string;
    state: string;
    zip: string;

    attendingWelcome: boolean;
    attendingWedding: boolean;
    attendingBrunch: boolean;

    dietaryVegetarian: boolean;
    dietaryVegan: boolean;
    dietaryGlutenFree: boolean;

    acknowledgeNoChildren: boolean;
    acknowledgeNoPlusOnes: boolean;
}
