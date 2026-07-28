import { Env } from "../types";

import {
    ContactInfo,
    saveContactInfo
} from "../db/contact";

import {
    GuestRsvp,
    saveGuestRsvps
} from "../db/guestRsvps";

import {
    GuestDietary,
    saveGuestDietary
} from "../db/guestDietary";

import {
    Acknowledgements,
    saveAcknowledgements
} from "../db/acknowledgements";

export interface CompleteRsvp {

    contact: ContactInfo;

    guestRsvps: GuestRsvp[];

    guestDietary: GuestDietary[];

    acknowledgements: Acknowledgements;
}

export async function saveCompleteRsvp(
    env: Env,
    rsvp: CompleteRsvp
) {

    await saveContactInfo(
        env,
        rsvp.contact
    );

    await saveGuestRsvps(
        env,
        rsvp.guestRsvps
    );

    await saveGuestDietary(
        env,
        rsvp.guestDietary
    );

    await saveAcknowledgements(
        env,
        rsvp.acknowledgements
    );
}