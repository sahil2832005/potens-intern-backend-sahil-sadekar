CREATE OR REPLACE FUNCTION prevent_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'log_entries is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_update
  BEFORE UPDATE ON log_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_log_mutation();

CREATE TRIGGER no_delete
  BEFORE DELETE ON log_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_log_mutation();
