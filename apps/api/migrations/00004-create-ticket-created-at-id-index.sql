-- Up Migration
-- pgls-ignore lockTimeoutWarning: the table holds no rows and no traffic when the migration runs
-- pgls-ignore requireConcurrentIndexCreation: the migration runs in a transaction, where CONCURRENTLY is refused
CREATE INDEX ticket_created_at_id_idx ON ticket USING btree (created_at DESC, id DESC);

-- Down Migration
-- pgls-ignore requireConcurrentIndexDeletion: the migration runs in a transaction, where CONCURRENTLY is refused
DROP INDEX ticket_created_at_id_idx;
