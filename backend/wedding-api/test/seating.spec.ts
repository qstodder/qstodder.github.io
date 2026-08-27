import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { getAdminSeating, saveAdminSeating } from "../src/routes/adminSeating";

beforeAll(async () => {
    await applyD1Migrations(env.wedding_rsvp_db, env.TEST_MIGRATIONS);
});

function request(method = "GET", body?: unknown): Request {
    return new Request("http://localhost:8787/api/admin/seating", {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined
    });
}

describe("Admin seating chart", () => {
    it("loads twelve default tables and active guest details", async () => {
        const response = await getAdminSeating(request(), env);
        const result = await response.json<any>();

        expect(response.status).toBe(200);
        expect(result.version).toBe(0);
        expect(result.tables).toHaveLength(12);
        expect(result.fixtures).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: "sweetheart", label: "Sweetheart Table" }),
            expect.objectContaining({ id: "dj", label: "DJ" })
        ]));
        expect(result.tables[0]).toMatchObject({
            id: "table-1",
            tableNumber: 1,
            seatCount: 10
        });
        expect(result.guests.length).toBeGreaterThan(0);
        expect(result.guests[0]).toHaveProperty("householdName");
        expect(result.guests[0]).toHaveProperty("rsvpStatus");
        expect(result.guests[0]).toHaveProperty("dietaryRestrictions");
    });

    it("saves table positions and assignments with a new version", async () => {
        const initialResponse = await getAdminSeating(request(), env);
        const initial = await initialResponse.json<any>();
        const guest = initial.guests[0];
        initial.tables[0].positionX = 24.5;
        initial.fixtures.find((fixture: any) => fixture.id === "sweetheart").positionX = 55;

        const response = await saveAdminSeating(request("PUT", {
            version: initial.version,
            tables: initial.tables,
            fixtures: initial.fixtures,
            assignments: [{
                guestId: guest.id,
                tableId: initial.tables[0].id,
                seatNumber: 1,
                locked: true
            }]
        }), env);
        const result = await response.json<any>();

        expect(response.status).toBe(200);
        expect(result.version).toBe(1);

        const savedResponse = await getAdminSeating(request(), env);
        const saved = await savedResponse.json<any>();
        expect(saved.tables[0].positionX).toBe(24.5);
        expect(saved.fixtures.find((fixture: any) => fixture.id === "sweetheart").positionX).toBe(55);
        expect(saved.assignments).toEqual([{
            guestId: guest.id,
            tableId: initial.tables[0].id,
            seatNumber: 1,
            locked: true
        }]);
    });

    it("rejects a stale layout version without replacing saved data", async () => {
        const currentResponse = await getAdminSeating(request(), env);
        const current = await currentResponse.json<any>();
        const staleTables = structuredClone(current.tables);
        staleTables[0].positionX = 90;

        const intervening = await saveAdminSeating(request("PUT", {
            version: current.version,
            tables: current.tables,
            assignments: current.assignments
        }), env);
        expect(intervening.status).toBe(200);

        const response = await saveAdminSeating(request("PUT", {
            version: current.version,
            tables: staleTables,
            assignments: []
        }), env);

        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({
            error: "The seating chart changed in another browser. Reload before saving again."
        });

        const afterResponse = await getAdminSeating(request(), env);
        const after = await afterResponse.json<any>();
        expect(after.tables[0].positionX).toBe(20);
        expect(after.assignments).toHaveLength(0);
    });

    it("rejects duplicate seat assignments", async () => {
        const currentResponse = await getAdminSeating(request(), env);
        const current = await currentResponse.json<any>();
        const [firstGuest, secondGuest] = current.guests;

        const response = await saveAdminSeating(request("PUT", {
            version: current.version,
            tables: current.tables,
            assignments: [firstGuest, secondGuest].map((guest) => ({
                guestId: guest.id,
                tableId: current.tables[0].id,
                seatNumber: 2,
                locked: false
            }))
        }), env);

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: "A seat cannot contain more than one guest."
        });
    });

    it("saves a full 120-seat chart without exceeding D1 batch limits", async () => {
        const household = await env.wedding_rsvp_db.prepare(
            "SELECT id FROM households ORDER BY id LIMIT 1"
        ).first<{ id: number }>();
        await env.wedding_rsvp_db.prepare(`
            WITH RECURSIVE sequence(number) AS (
                SELECT 1 UNION ALL SELECT number + 1 FROM sequence WHERE number < 120
            )
            INSERT INTO guests (household_id, first_name, last_name)
            SELECT ?, 'Capacity ' || number, 'Guest' FROM sequence
        `).bind(household!.id).run();

        const currentResponse = await getAdminSeating(request(), env);
        const current = await currentResponse.json<any>();
        const assignments = current.tables.flatMap((table: any) =>
            Array.from({ length: table.seatCount }, (_, index) => ({
                tableId: table.id,
                seatNumber: index + 1
            }))
        ).slice(0, 120).map((seat: any, index: number) => ({
            guestId: current.guests[index].id,
            ...seat,
            locked: false
        }));

        const response = await saveAdminSeating(request("PUT", {
            version: current.version,
            tables: current.tables,
            assignments
        }), env);

        expect(response.status).toBe(200);
        const savedResponse = await getAdminSeating(request(), env);
        const saved = await savedResponse.json<any>();
        expect(saved.assignments).toHaveLength(120);
    });
});
