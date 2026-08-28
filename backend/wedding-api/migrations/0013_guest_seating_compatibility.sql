ALTER TABLE guests ADD COLUMN generation TEXT
    CHECK (generation IN ('Y', 'XM'));

ALTER TABLE guests ADD COLUMN social_group TEXT
    CHECK (social_group IN (
        'Q_FM', 'Q_FD', 'Q_A', 'Q_B', 'Q_C', 'Q_D',
        'S_FM', 'S_FD', 'S_A', 'S_B', 'S_C', 'S_D'
    ));

CREATE TABLE guest_seating_compatibility_import (
    household_key TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    generation TEXT NOT NULL,
    social_group TEXT NOT NULL
);

INSERT INTO guest_seating_compatibility_import (
    household_key, first_name, last_name, generation, social_group
) VALUES
    ('jeanette', 'Jeanette', 'Tan', 'Y', 'Q_FM'),
    ('dave-and-carmen', 'Dave', 'Stodder', 'Y', 'Q_FD'),
    ('dave-and-carmen', 'Carmen', 'Lo Maglio', 'Y', 'Q_FD'),
    ('jenny', 'Jensen', 'Stodder', 'XM', 'Q_B'),
    ('team-jerk', 'Jez', 'Lee', 'XM', 'Q_FD'),
    ('team-jerk', 'Mark', 'Espinosa', 'XM', 'Q_FD'),
    ('shaun-katie-sulay-and-dylan', 'Shaun', 'Stodder', 'XM', 'Q_FD'),
    ('shaun-katie-sulay-and-dylan', 'Katie', '', 'XM', 'Q_FD'),
    ('shaun-katie-sulay-and-dylan', 'Sulay', 'Stodder', 'XM', 'Q_FD'),
    ('shaun-katie-sulay-and-dylan', 'Dylan', 'Stodder', 'XM', 'Q_FD'),
    ('sabrina', 'Sabrina', 'Coryell', 'Y', 'Q_A'),
    ('lili-and-enzo', 'Lili', 'Coryell Jenkins', 'XM', 'Q_A'),
    ('lili-and-enzo', 'Enzo', 'Nieuwendijk', 'XM', 'Q_A'),
    ('uncle-eric-and-aunt-rita', 'Eric', 'Stodder', 'Y', 'Q_FD'),
    ('uncle-eric-and-aunt-rita', 'Rita', 'Stodder', 'Y', 'Q_FD'),
    ('aunt-lorrie-and-uncle-sam', 'Sam', 'Stodder', 'Y', 'Q_FD'),
    ('aunt-lorrie-and-uncle-sam', 'Lorrie', 'Stodder', 'Y', 'Q_FD'),
    ('uncle-mark-and-aunt-brook', 'Mark', 'Stodder', 'Y', 'Q_FD'),
    ('uncle-mark-and-aunt-brook', 'Brook', 'Stodder', 'Y', 'Q_FD'),
    ('uncle-fred', 'Fred', 'Stodder', 'Y', 'Q_FD'),
    ('celina', 'Celina', 'Stodder', 'XM', 'Q_FD'),
    ('aunt-karin-uncle-john-and-jodi', 'Karin', 'Matta', 'Y', 'Q_FD'),
    ('aunt-karin-uncle-john-and-jodi', 'John', 'Matta', 'Y', 'Q_FD'),
    ('aunt-karin-uncle-john-and-jodi', 'Jodi', 'Matta', 'XM', 'Q_FD'),
    ('aunt-monica-uncle-doug-and-joel', 'Monica', 'Spindler', 'Y', 'Q_FD'),
    ('aunt-monica-uncle-doug-and-joel', 'Doug', 'Spindler', 'Y', 'Q_FD'),
    ('aunt-monica-uncle-doug-and-joel', 'Joel', 'Spindler', 'XM', 'Q_FD'),
    ('jennie-and-dale', 'Jennie', 'Stodder', 'XM', 'Q_FD'),
    ('jennie-and-dale', 'Dale', 'Timm', 'XM', 'Q_FD'),
    ('kristina-and-jason', 'Kristina', 'Stodder', 'XM', 'Q_FD'),
    ('kristina-and-jason', 'Jason', 'Garland', 'XM', 'Q_FD'),
    ('tori-and-alex', 'Tori', 'Trumble', 'XM', 'Q_FD'),
    ('tori-and-alex', 'Alex', 'Trumble', 'XM', 'Q_FD'),
    ('noah-and', 'Noah', 'Stodder', 'XM', 'Q_FD'),
    ('noah-and', 'Noah''s GF', '', 'XM', 'Q_FD'),
    ('jonas', 'Jonas', 'Spindler', 'XM', 'Q_FD'),
    ('aunt-dawn-and-uncle-sonny', 'Dawn', 'Tan', 'Y', 'Q_FM'),
    ('aunt-dawn-and-uncle-sonny', 'Sonny', 'Tan', 'Y', 'Q_FM'),
    ('zane', 'Zane', 'Tan', 'Y', 'Q_FM'),
    ('britany', 'Britany', 'Tan', 'Y', 'Q_FM'),
    ('grandma-sherry', 'Sherry', '', 'Y', 'Q_FM'),
    ('auntie-jackie-and-jim', 'Jackie', 'Tan', 'Y', 'Q_FM'),
    ('auntie-jackie-and-jim', 'Jim', 'Showalter', 'Y', 'Q_FM'),
    ('karen-and-chuck', 'Karen', 'Tan', 'Y', 'Q_FM'),
    ('karen-and-chuck', 'Chuck', '', 'Y', 'Q_FM'),
    ('sheyner-weyner-and-mattie', 'Sheyne', 'Anderson', 'XM', 'Q_B'),
    ('sheyner-weyner-and-mattie', 'Mattie', 'Quigley', 'XM', 'Q_B'),
    ('meghan-and-nick', 'Meghan', 'Baransky', 'XM', 'Q_B'),
    ('meghan-and-nick', 'Nick', 'Baransky', 'XM', 'Q_B'),
    ('victoria-and-jason', 'Victoria', 'Thai', 'XM', 'Q_C'),
    ('victoria-and-jason', 'Jason', 'Mayeda', 'XM', 'Q_C'),
    ('qh', 'QH', 'Vu', 'XM', 'Q_C'),
    ('camille-and-blake', 'Camille', 'Beltran', 'XM', 'Q_C'),
    ('camille-and-blake', 'Blake', 'Cornel', 'XM', 'Q_C'),
    ('doruh-and-alexa', 'Doruh', 'Trieu', 'XM', 'Q_C'),
    ('doruh-and-alexa', 'Alexa', 'Reynoso', 'XM', 'Q_C'),
    ('uhlaine-and-seth', 'Uhlaine', 'Silverstone', 'XM', 'Q_C'),
    ('uhlaine-and-seth', 'Seth', 'Minor', 'XM', 'Q_C'),
    ('uhmanda-and-theresa', 'Uhmanda', 'Cabreros', 'XM', 'Q_C'),
    ('uhmanda-and-theresa', 'Theresa', 'Vo', 'XM', 'Q_C'),
    ('mia-and-kyle', 'Mia', 'Casciani', 'XM', 'Q_C'),
    ('mia-and-kyle', 'Kyle', 'Hunt', 'XM', 'Q_C'),
    ('natalie', 'Natalie', 'Gilmore', 'XM', 'Q_C'),
    ('nirha-and-abhinav', 'Nirha', 'Gupta', 'XM', 'Q_C'),
    ('nirha-and-abhinav', 'Abhinav', 'Gupta', 'XM', 'Q_C'),
    ('claire', 'Claire', 'Stone', 'XM', 'Q_D'),
    ('burs', 'Claire', 'Heney-Lees', 'XM', 'Q_D'),
    ('taylor', 'Taylor', 'Weber', 'XM', 'Q_D'),
    ('cosmo-and-amy', 'Cosmo', 'Hahn', 'XM', 'Q_D'),
    ('cosmo-and-amy', 'Amy', 'Kealoha', 'XM', 'Q_D'),
    ('john-and-carol', 'John', 'Andrews', 'Y', 'Q_D'),
    ('john-and-carol', 'Carol', 'Andrews', 'Y', 'Q_D'),
    ('tessie', 'Tessie', '', 'Y', 'Q_FM'),
    ('christine-and-donald', 'Dylan', 'Boyle', 'XM', 'S_D'),
    ('christine-and-donald', 'Christine', 'Brown', 'XM', 'S_D'),
    ('deenis', 'Dennis', 'Ren', 'XM', 'S_A'),
    ('deenis', 'Deenah', 'Sanchez', 'XM', 'S_A'),
    ('colin', 'Colin', 'Barry', 'XM', 'S_B'),
    ('ale-and-kendall', 'Ale', 'Izu', 'XM', 'S_C'),
    ('ale-and-kendall', 'Kendal', '', 'XM', 'S_C'),
    ('bassel', 'Bassel', 'Hatoum', 'XM', 'S_C'),
    ('justin-warren', 'Justin', 'Warren', 'XM', 'S_D'),
    ('t-hammer', 'Treven', 'Moore', 'XM', 'S_B'),
    ('erica', 'Erica', 'Brown', 'XM', 'S_D'),
    ('patty-and-andy', 'Patty', 'Brown', 'Y', 'S_FM'),
    ('patty-and-andy', 'Andy', 'Brown', 'Y', 'S_FM'),
    ('ryan-and-moleigh', 'Ryan', 'Pompilio', 'XM', 'S_D'),
    ('ryan-and-moleigh', 'Moleigh', 'Pompilio', 'XM', 'S_D'),
    ('moises-and-monica', 'Moises', 'Mercado', 'XM', 'S_C'),
    ('moises-and-monica', 'Monica', 'Mercado', 'XM', 'S_C'),
    ('chinmay-and-katie', 'Chinmay', 'Joshi', 'XM', 'S_C'),
    ('chinmay-and-katie', 'Katie', '', 'XM', 'S_C'),
    ('lisa-and-andrew', 'Lisa', 'Kowal', 'Y', 'S_FM'),
    ('lisa-and-andrew', 'Andrew', 'Kowal', 'Y', 'S_FM'),
    ('ken-and-carla', 'Ken', 'LaMorta', 'Y', 'S_FM'),
    ('ken-and-carla', 'Carla', 'LaMorta', 'Y', 'S_FM'),
    ('aunt-linda-and-uncle-blake', 'Linda', 'Gall', 'Y', 'S_FM'),
    ('aunt-linda-and-uncle-blake', 'Blake', 'Gall', 'Y', 'S_FM'),
    ('chris-and-andrea', 'Chris', 'Wharton', 'XM', 'S_FM'),
    ('chris-and-andrea', 'Andrea', 'Wharton', 'XM', 'S_FM'),
    ('lauren-and-sam', 'Lauren', 'Bonsail', 'Y', 'S_FM'),
    ('lauren-and-sam', 'Sam', 'Bonsail', 'Y', 'S_FM'),
    ('justin-and-cat', 'Justin', 'Dufner', 'XM', 'S_FM'),
    ('justin-and-cat', 'Cat', 'Dufner', 'XM', 'S_FM'),
    ('lynn-and-dave', 'Lynn', 'Dufner', 'Y', 'S_FM'),
    ('lynn-and-dave', 'Dave', 'Dufner', 'Y', 'S_FM'),
    ('bill-yvonne-and-patrick', 'Bill', 'Meade', 'Y', 'S_FM'),
    ('bill-yvonne-and-patrick', 'Patrick', 'Meade', 'XM', 'S_FM'),
    ('bill-yvonne-and-patrick', 'Yvonne', 'Hyland', 'Y', 'S_FM'),
    ('henry', 'Henry', 'Meade', 'XM', 'S_FM'),
    ('philipp-and-selena', 'Philipp', 'Arndt', 'XM', 'S_B'),
    ('philipp-and-selena', 'Selena', 'Chen', 'XM', 'S_B'),
    ('marius', 'Marius', 'Ruh', 'XM', 'S_B'),
    ('luke', 'Luke', 'Colosi', 'XM', 'S_B'),
    ('tommy', 'Tommy', '', 'XM', 'S_D'),
    ('tyler-zam', 'Tyler', '', 'XM', 'S_D'),
    ('tim-and-sheila', 'Tim', 'Brown', 'Y', 'S_FD'),
    ('tim-and-sheila', 'Sheila', 'Brown', 'Y', 'S_FD'),
    ('melody', 'Melody', '', 'XM', 'Q_C');

UPDATE guests
SET generation = (
        SELECT imported.generation
        FROM guest_seating_compatibility_import imported
        JOIN households
            ON households.household_key = imported.household_key
        WHERE households.id = guests.household_id
          AND imported.first_name = guests.first_name
          AND imported.last_name = COALESCE(guests.last_name, '')
    ),
    social_group = (
        SELECT imported.social_group
        FROM guest_seating_compatibility_import imported
        JOIN households
            ON households.household_key = imported.household_key
        WHERE households.id = guests.household_id
          AND imported.first_name = guests.first_name
          AND imported.last_name = COALESCE(guests.last_name, '')
    )
WHERE EXISTS (
    SELECT 1
    FROM guest_seating_compatibility_import imported
    JOIN households
        ON households.household_key = imported.household_key
    WHERE households.id = guests.household_id
      AND imported.first_name = guests.first_name
      AND imported.last_name = COALESCE(guests.last_name, '')
);

DROP TABLE guest_seating_compatibility_import;

CREATE INDEX guests_generation_index ON guests(generation);
CREATE INDEX guests_social_group_index ON guests(social_group);
