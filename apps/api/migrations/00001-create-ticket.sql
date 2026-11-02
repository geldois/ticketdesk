-- Up Migration
CREATE TABLE ticket (
  id uuid DEFAULT uuidv7(),
  customer_name text NOT NULL,
  description text NOT NULL,
  channel text NOT NULL,
  priority text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  resolution_note text,
  version int DEFAULT 1 NOT NULL,
  CONSTRAINT ticket_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_customer_name_length_check CHECK (char_length(customer_name) BETWEEN 1 AND 120),
  CONSTRAINT ticket_description_length_check CHECK (char_length(description) BETWEEN 1 AND 4000),
  CONSTRAINT ticket_channel_set_check CHECK (channel IN ('chat', 'email', 'phone')),
  CONSTRAINT ticket_priority_set_check CHECK (priority IN ('low', 'medium', 'high')),
  CONSTRAINT ticket_status_set_check CHECK (status IN ('open', 'in_progress', 'resolved')),
  CONSTRAINT ticket_resolution_note_length_check CHECK (char_length(resolution_note) BETWEEN 1 AND 2000),
  CONSTRAINT ticket_resolution_note_presence_check CHECK ((status = 'resolved') = (resolution_note IS NOT NULL)),
  CONSTRAINT ticket_version_min_check CHECK (version >= 1)
);

-- Down Migration
-- pgls-ignore banDropTable: the down side reverts the up side on purpose
DROP TABLE ticket;
