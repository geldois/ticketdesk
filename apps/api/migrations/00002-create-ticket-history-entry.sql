-- Up Migration
CREATE TABLE ticket_history_entry (
  id bigint GENERATED ALWAYS AS IDENTITY,
  ticket_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  resolution_note text,
  reopen_reason text,
  at timestamptz NOT NULL,
  CONSTRAINT ticket_history_entry_pkey PRIMARY KEY (id),
  CONSTRAINT ticket_history_entry_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES ticket (id),
  CONSTRAINT ticket_history_entry_from_status_set_check CHECK (from_status IS NULL OR
  from_status IN ('open', 'in_progress', 'resolved')),
  CONSTRAINT ticket_history_entry_to_status_set_check CHECK (to_status IN ('open', 'in_progress', 'resolved')),
  CONSTRAINT ticket_history_entry_status_pair_check CHECK ((from_status IS NULL OR from_status = 'resolved') =
  (to_status = 'open') AND
  (from_status = 'open') = (to_status = 'in_progress') AND
  (from_status = 'in_progress') = (to_status = 'resolved')),
  CONSTRAINT ticket_history_entry_resolution_note_presence_check CHECK ((to_status = 'resolved') =
  (resolution_note IS NOT NULL)),
  CONSTRAINT ticket_history_entry_reopen_reason_presence_check CHECK ((to_status = 'open' AND from_status IS NOT NULL) =
  (reopen_reason IS NOT NULL)),
  CONSTRAINT ticket_history_entry_resolution_note_length_check CHECK (char_length(resolution_note) BETWEEN 1 AND 2000),
  CONSTRAINT ticket_history_entry_reopen_reason_length_check CHECK (char_length(reopen_reason) BETWEEN 1 AND 500)
);

-- Down Migration
-- pgls-ignore banDropTable: the down side reverts the up side on purpose
DROP TABLE ticket_history_entry;
