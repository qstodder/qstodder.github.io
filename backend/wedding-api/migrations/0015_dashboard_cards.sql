CREATE TABLE admin_dashboard_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page TEXT NOT NULL CHECK (page IN ('households', 'guests')),
    metric TEXT NOT NULL,
    label TEXT NOT NULL,
    tone TEXT NOT NULL DEFAULT 'default' CHECK (tone IN ('default', 'alert')),
    display_order INTEGER NOT NULL,
    UNIQUE(page, metric)
);

INSERT INTO admin_dashboard_cards (page, metric, label, tone, display_order) VALUES
    ('households', 'missingAddress', 'Addresses needed', 'alert', 1),
    ('households', 'missingEmail', 'Email needed', 'alert', 2),
    ('households', 'all', 'Households', 'default', 3),
    ('households', 'submitted', 'RSVP submitted', 'default', 4),
    ('households', 'ceremonyAttending', 'Ceremony households', 'default', 5),
    ('guests', 'missingAddress', 'Address needed', 'alert', 1),
    ('guests', 'missingEmail', 'Email needed', 'alert', 2),
    ('guests', 'all', 'Guests', 'default', 3),
    ('guests', 'submitted', 'RSVP submitted', 'default', 4),
    ('guests', 'ceremonyAttending', 'Ceremony attendees', 'default', 5);
