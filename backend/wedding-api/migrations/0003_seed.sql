INSERT INTO households (household_name)
VALUES
("Stodder Family"),
("Smith Family"),
("Johnson");

INSERT INTO guests
(
household_id,
first_name,
last_name,
email,
mailing_address
)

VALUES

(
1,
"Quiana",
"Stodder",
"quiana@example.com",
"123 Main St"
),

(
1,
"John",
"Stodder",
"quiana@example.com",
"123 Main St"
),

(
2,
"Alice",
"Smith",
"alice@example.com",
"456 Oak Ave"
),

(
2,
"Bob",
"Smith",
"alice@example.com",
"456 Oak Ave"
),

(
3,
"Emily",
"Johnson",
"emily@example.com",
"789 Pine Rd"
);