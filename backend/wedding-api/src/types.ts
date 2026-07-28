export interface Env {
    wedding_rsvp_db: D1Database;
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