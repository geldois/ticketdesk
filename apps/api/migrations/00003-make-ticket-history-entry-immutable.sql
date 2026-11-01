-- Up Migration
CREATE FUNCTION refuse_ticket_history_entry_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
  BEGIN
    RAISE EXCEPTION 'ticket history entries are immutable';
  END;
$$;

-- pgls-ignore avoidCreateTrigger: the database itself must refuse the change
CREATE TRIGGER ticket_history_entry_row_immutable_trigger
BEFORE DELETE OR UPDATE
ON ticket_history_entry
FOR EACH ROW
EXECUTE FUNCTION refuse_ticket_history_entry_change();

-- pgls-ignore avoidCreateTrigger: the database itself must refuse the change
CREATE TRIGGER ticket_history_entry_table_immutable_trigger
BEFORE TRUNCATE
ON ticket_history_entry
FOR EACH STATEMENT
EXECUTE FUNCTION refuse_ticket_history_entry_change();

-- Down Migration
-- pgls-ignore banDropTrigger: the down side reverts the up side on purpose
DROP TRIGGER ticket_history_entry_row_immutable_trigger ON ticket_history_entry;

-- pgls-ignore banDropTrigger: the down side reverts the up side on purpose
DROP TRIGGER ticket_history_entry_table_immutable_trigger ON ticket_history_entry;

DROP FUNCTION refuse_ticket_history_entry_change;
