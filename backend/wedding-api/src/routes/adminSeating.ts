import { Env } from "../types";
import { AdminAuthError, authenticateAdmin } from "../lib/adminAuth";
import { withAdminCors } from "../lib/adminCors";

interface SeatingTableInput {
    id: string;
    tableNumber: number;
    positionX: number;
    positionY: number;
    seatCount: number;
    rotation: number;
}

interface SeatingAssignmentInput {
    guestId: number;
    tableId: string;
    seatNumber: number;
    locked: boolean;
}

interface SeatingFixtureInput {
    id: string;
    label: string;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
}

interface SeatingSaveInput {
    version: number;
    tables: SeatingTableInput[];
    assignments: SeatingAssignmentInput[];
    fixtures: SeatingFixtureInput[] | null;
}

function chunks<T>(items: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
        result.push(items.slice(index, index + size));
    }
    return result;
}

class SeatingValidationError extends Error {}

function responseError(request: Request, error: unknown): Response {
    if (!(error instanceof AdminAuthError) && !(error instanceof SeatingValidationError)) {
        console.error("Admin seating request failed", error);
    }
    const status = error instanceof AdminAuthError
        ? error.status
        : error instanceof SeatingValidationError
            ? 400
            : 500;
    const message = error instanceof AdminAuthError ||
        error instanceof SeatingValidationError
        ? error.message
        : "Unable to update the seating chart.";
    return withAdminCors(request, Response.json({ error: message }, { status }));
}

function finiteNumber(value: unknown, label: string): number {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        throw new SeatingValidationError(`${label} is invalid.`);
    }
    return number;
}

function validateSaveInput(value: unknown): SeatingSaveInput {
    if (!value || typeof value !== "object") {
        throw new SeatingValidationError("Seating chart data is required.");
    }
    const input = value as Record<string, unknown>;
    const version = finiteNumber(input.version, "Layout version");
    if (!Number.isInteger(version) || version < 0) {
        throw new SeatingValidationError("Layout version is invalid.");
    }
    if (!Array.isArray(input.tables) || input.tables.length < 1 || input.tables.length > 40) {
        throw new SeatingValidationError("The chart must contain between 1 and 40 tables.");
    }
    if (!Array.isArray(input.assignments)) {
        throw new SeatingValidationError("Seat assignments are invalid.");
    }

    const tableIds = new Set<string>();
    const tableNumbers = new Set<number>();
    const seatCounts = new Map<string, number>();
    const tables = input.tables.map((raw, index) => {
        if (!raw || typeof raw !== "object") {
            throw new SeatingValidationError(`Table ${index + 1} is invalid.`);
        }
        const table = raw as Record<string, unknown>;
        const id = String(table.id ?? "").trim();
        const tableNumber = finiteNumber(table.tableNumber, "Table number");
        const positionX = finiteNumber(table.positionX, "Table position");
        const positionY = finiteNumber(table.positionY, "Table position");
        const seatCount = finiteNumber(table.seatCount, "Seat count");
        const rotation = finiteNumber(table.rotation ?? 0, "Table rotation");
        if (!/^[A-Za-z0-9_-]{1,80}$/.test(id) || tableIds.has(id)) {
            throw new SeatingValidationError("Every table must have a unique valid ID.");
        }
        if (!Number.isInteger(tableNumber) || tableNumber < 1 || tableNumbers.has(tableNumber)) {
            throw new SeatingValidationError("Every table must have a unique positive number.");
        }
        if (positionX < 0 || positionX > 100 || positionY < 0 || positionY > 100) {
            throw new SeatingValidationError("Table positions must remain inside the ballroom.");
        }
        if (!Number.isInteger(seatCount) || seatCount < 1 || seatCount > 10) {
            throw new SeatingValidationError("Tables can contain between 1 and 10 seats.");
        }
        tableIds.add(id);
        tableNumbers.add(tableNumber);
        seatCounts.set(id, seatCount);
        return { id, tableNumber, positionX, positionY, seatCount, rotation };
    });

    const guestIds = new Set<number>();
    const occupiedSeats = new Set<string>();
    const assignments = input.assignments.map((raw) => {
        if (!raw || typeof raw !== "object") {
            throw new SeatingValidationError("A seat assignment is invalid.");
        }
        const assignment = raw as Record<string, unknown>;
        const guestId = finiteNumber(assignment.guestId, "Guest");
        const tableId = String(assignment.tableId ?? "").trim();
        const seatNumber = finiteNumber(assignment.seatNumber, "Seat number");
        const seatKey = `${tableId}:${seatNumber}`;
        if (!Number.isInteger(guestId) || guestId < 1 || guestIds.has(guestId)) {
            throw new SeatingValidationError("A guest cannot occupy more than one seat.");
        }
        if (!tableIds.has(tableId) || !Number.isInteger(seatNumber) ||
            seatNumber < 1 || seatNumber > (seatCounts.get(tableId) ?? 0) ||
            occupiedSeats.has(seatKey)) {
            throw new SeatingValidationError("A seat cannot contain more than one guest.");
        }
        guestIds.add(guestId);
        occupiedSeats.add(seatKey);
        return { guestId, tableId, seatNumber, locked: assignment.locked === true };
    });
    let fixtures: SeatingFixtureInput[] | null = null;
    if (input.fixtures !== undefined) {
        if (!Array.isArray(input.fixtures) || input.fixtures.length !== 2) {
            throw new SeatingValidationError("The sweetheart and DJ tables are required.");
        }
        const fixtureIds = new Set<string>();
        fixtures = input.fixtures.map((raw) => {
            if (!raw || typeof raw !== "object") {
                throw new SeatingValidationError("A ballroom fixture is invalid.");
            }
            const fixture = raw as Record<string, unknown>;
            const id = String(fixture.id ?? "").trim();
            const label = String(fixture.label ?? "").trim();
            const positionX = finiteNumber(fixture.positionX, "Fixture position");
            const positionY = finiteNumber(fixture.positionY, "Fixture position");
            const width = finiteNumber(fixture.width, "Fixture width");
            const height = finiteNumber(fixture.height, "Fixture height");
            if (!/^[A-Za-z0-9_-]{1,80}$/.test(id) || fixtureIds.has(id) || !label) {
                throw new SeatingValidationError("Every fixture must have a unique ID and label.");
            }
            if (positionX < 0 || positionX > 100 || positionY < 0 || positionY > 100 ||
                width < 3 || width > 30 || height < 2 || height > 15) {
                throw new SeatingValidationError("Ballroom fixtures must remain inside the ballroom.");
            }
            fixtureIds.add(id);
            return { id, label, positionX, positionY, width, height };
        });
        if (!fixtureIds.has("sweetheart") || !fixtureIds.has("dj")) {
            throw new SeatingValidationError("The sweetheart and DJ tables are required.");
        }
    }
    return { version, tables, assignments, fixtures };
}

export async function getAdminSeating(request: Request, env: Env): Promise<Response> {
    try {
        const admin = await authenticateAdmin(request, env);
        const [layout, tableResult, fixtureResult, assignmentResult, guestResult, dietaryResult] =
            await Promise.all([
                env.wedding_rsvp_db.prepare(
                    "SELECT version, updated_at FROM seating_layout WHERE id = 1"
                ).first<{ version: number; updated_at: string }>(),
                env.wedding_rsvp_db.prepare(`
                    SELECT id, table_number, position_x, position_y, seat_count, rotation
                    FROM seating_tables ORDER BY table_number
                `).all<any>(),
                env.wedding_rsvp_db.prepare(`
                    SELECT id, label, position_x, position_y, width, height
                    FROM seating_fixtures ORDER BY id
                `).all<any>(),
                env.wedding_rsvp_db.prepare(`
                    SELECT guest_id, table_id, seat_number, is_locked
                    FROM seating_assignments ORDER BY table_id, seat_number
                `).all<any>(),
                env.wedding_rsvp_db.prepare(`
                    SELECT g.id, g.first_name, g.last_name, h.household_name,
                           gr.attending_wedding, gr.updated_at AS rsvp_updated_at
                    FROM guests g
                    JOIN households h ON h.id = g.household_id
                    LEFT JOIN guest_rsvps gr ON gr.guest_id = g.id
                    WHERE g.archived_at IS NULL AND h.archived_at IS NULL
                    ORDER BY LOWER(h.household_name), LOWER(g.last_name), LOWER(g.first_name)
                `).all<any>(),
                env.wedding_rsvp_db.prepare(`
                    SELECT gdr.guest_id, dr.name, gdr.notes
                    FROM guest_dietary_restrictions gdr
                    JOIN dietary_restrictions dr ON dr.id = gdr.restriction_id
                    JOIN guests g ON g.id = gdr.guest_id
                    WHERE g.archived_at IS NULL
                    ORDER BY dr.display_order
                `).all<any>()
            ]);

        const dietaryByGuest = new Map<number, Array<{ name: string; notes: string | null }>>();
        for (const item of dietaryResult.results) {
            const entries = dietaryByGuest.get(item.guest_id) ?? [];
            entries.push({ name: item.name, notes: item.notes });
            dietaryByGuest.set(item.guest_id, entries);
        }

        return withAdminCors(request, Response.json({
            admin: { email: admin.email },
            version: layout?.version ?? 0,
            updatedAt: layout?.updated_at ?? null,
            tables: tableResult.results.map((table) => ({
                id: table.id,
                tableNumber: table.table_number,
                positionX: table.position_x,
                positionY: table.position_y,
                seatCount: table.seat_count,
                rotation: table.rotation
            })),
            fixtures: fixtureResult.results.map((fixture) => ({
                id: fixture.id,
                label: fixture.label,
                positionX: fixture.position_x,
                positionY: fixture.position_y,
                width: fixture.width,
                height: fixture.height
            })),
            assignments: assignmentResult.results.map((assignment) => ({
                guestId: assignment.guest_id,
                tableId: assignment.table_id,
                seatNumber: assignment.seat_number,
                locked: Boolean(assignment.is_locked)
            })),
            guests: guestResult.results.map((guest) => {
                const dietary = dietaryByGuest.get(guest.id) ?? [];
                return {
                    id: guest.id,
                    firstName: guest.first_name,
                    lastName: guest.last_name,
                    householdName: guest.household_name,
                    rsvpStatus: !guest.rsvp_updated_at
                        ? "pending"
                        : guest.attending_wedding ? "yes" : "no",
                    dietaryRestrictions: dietary
                        .filter((item) => item.name !== "Other")
                        .map((item) => item.name),
                    dietaryOther: dietary
                        .filter((item) => item.name === "Other")
                        .map((item) => item.notes)
                        .filter(Boolean)
                        .join("; ")
                };
            })
        }));
    } catch (error) {
        return responseError(request, error);
    }
}

export async function saveAdminSeating(request: Request, env: Env): Promise<Response> {
    try {
        await authenticateAdmin(request, env);
        let raw: unknown;
        try {
            raw = await request.json();
        } catch {
            throw new SeatingValidationError("A valid JSON body is required.");
        }
        const input = validateSaveInput(raw);

        const guestIds = input.assignments.map((item) => item.guestId);
        if (guestIds.length) {
            const guestChecks = await env.wedding_rsvp_db.batch(
                chunks(guestIds, 80).map((ids) => {
                    const placeholders = ids.map(() => "?").join(",");
                    return env.wedding_rsvp_db.prepare(`
                        SELECT COUNT(*) AS count
                        FROM guests g JOIN households h ON h.id = g.household_id
                        WHERE g.id IN (${placeholders})
                            AND g.archived_at IS NULL AND h.archived_at IS NULL
                    `).bind(...ids);
                })
            );
            const activeGuestCount = guestChecks.reduce((total, result) =>
                total + Number((result.results[0] as { count?: number } | undefined)?.count ?? 0), 0
            );
            if (activeGuestCount !== guestIds.length) {
                throw new SeatingValidationError("An assigned guest is unavailable.");
            }
        }

        const token = crypto.randomUUID();
        const guarded = `EXISTS (
            SELECT 1 FROM seating_layout WHERE id = 1 AND save_token = ?
        )`;
        const tableInsertStatements = chunks(input.tables, 10).map((tables) => {
            const rows = tables.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
            const values = tables.flatMap((table) => [
                table.id, table.tableNumber, table.positionX, table.positionY,
                table.seatCount, table.rotation
            ]);
            return env.wedding_rsvp_db.prepare(`
                WITH rows (
                    id, table_number, position_x, position_y, seat_count, rotation
                ) AS (VALUES ${rows})
                INSERT INTO seating_tables (
                    id, table_number, position_x, position_y, seat_count, rotation
                )
                SELECT id, table_number, position_x, position_y, seat_count, rotation
                FROM rows WHERE ${guarded}
            `).bind(...values, token);
        });
        const assignmentInsertStatements = chunks(input.assignments, 20).map((assignments) => {
            const rows = assignments.map(() => "(?, ?, ?, ?)").join(", ");
            const values = assignments.flatMap((assignment) => [
                assignment.guestId, assignment.tableId, assignment.seatNumber,
                assignment.locked ? 1 : 0
            ]);
            return env.wedding_rsvp_db.prepare(`
                WITH rows (guest_id, table_id, seat_number, is_locked) AS (VALUES ${rows})
                INSERT INTO seating_assignments (
                    guest_id, table_id, seat_number, is_locked
                )
                SELECT guest_id, table_id, seat_number, is_locked
                FROM rows WHERE ${guarded}
            `).bind(...values, token);
        });
        const fixtureStatements = input.fixtures ? [
            env.wedding_rsvp_db.prepare(`DELETE FROM seating_fixtures WHERE ${guarded}`).bind(token),
            ...input.fixtures.map((fixture) => env.wedding_rsvp_db.prepare(`
                INSERT INTO seating_fixtures (
                    id, label, position_x, position_y, width, height
                ) SELECT ?, ?, ?, ?, ?, ? WHERE ${guarded}
            `).bind(
                fixture.id, fixture.label, fixture.positionX, fixture.positionY,
                fixture.width, fixture.height, token
            ))
        ] : [];
        const statements = [
            env.wedding_rsvp_db.prepare(`
                UPDATE seating_layout
                SET version = version + 1, save_token = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = 1 AND version = ?
            `).bind(token, input.version),
            env.wedding_rsvp_db.prepare(`DELETE FROM seating_assignments WHERE ${guarded}`).bind(token),
            env.wedding_rsvp_db.prepare(`DELETE FROM seating_tables WHERE ${guarded}`).bind(token),
            ...fixtureStatements,
            ...tableInsertStatements,
            ...assignmentInsertStatements
        ];

        const results = await env.wedding_rsvp_db.batch(statements);
        if (Number(results[0].meta.changes ?? 0) !== 1) {
            return withAdminCors(request, Response.json({
                error: "The seating chart changed in another browser. Reload before saving again."
            }, { status: 409 }));
        }
        return withAdminCors(request, Response.json({
            success: true,
            version: input.version + 1,
            updatedAt: new Date().toISOString()
        }));
    } catch (error) {
        return responseError(request, error);
    }
}
