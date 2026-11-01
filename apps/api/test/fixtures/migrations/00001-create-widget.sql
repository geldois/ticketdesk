-- Up Migration
CREATE TABLE widget (
  id int PRIMARY KEY,
  name text NOT NULL
);

-- Down Migration
DROP TABLE widget;
