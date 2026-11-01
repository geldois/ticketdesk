-- Up Migration
CREATE TABLE widget (id integer PRIMARY KEY, name text NOT NULL);

-- Down Migration
DROP TABLE widget;
