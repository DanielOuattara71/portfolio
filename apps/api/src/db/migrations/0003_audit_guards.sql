-- Guards that must hold even if application code is wrong (docs/admin/04 and 05).
-- Note: in production the API also connects with a role that has no UPDATE/DELETE right on audit_log;
-- these triggers are the second line of defence and also protect local databases.

-- 1. audit_log is append-only. Only audit_log_purge() may delete, and only rows older than 12 months.
CREATE OR REPLACE FUNCTION audit_log_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('app.audit_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_log is append-only (% refused)', TG_OP;
END
$$;
--> statement-breakpoint
CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_guard();
--> statement-breakpoint
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_guard();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION audit_log_purge(older_than interval) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE
  n bigint;
BEGIN
  IF older_than < interval '365 days' THEN
    RAISE EXCEPTION 'audit retention is 12 months minimum';
  END IF;
  PERFORM set_config('app.audit_purge', 'on', true);
  DELETE FROM audit_log WHERE at < now() - older_than;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('app.audit_purge', 'off', true);
  RETURN n;
END
$$;
--> statement-breakpoint

-- 2. Roles are limited to the three known ones, and the last administrator cannot be removed or demoted.
ALTER TABLE "user" ADD CONSTRAINT user_role_check CHECK (role IN ('admin', 'editor', 'viewer'));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION user_keep_one_admin() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.role = 'admin' AND (TG_OP = 'DELETE' OR NEW.role <> 'admin') THEN
    IF NOT EXISTS (SELECT 1 FROM "user" WHERE role = 'admin' AND id <> OLD.id) THEN
      RAISE EXCEPTION 'at least one administrator is required';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER user_keep_one_admin BEFORE UPDATE OF role OR DELETE ON "user"
  FOR EACH ROW EXECUTE FUNCTION user_keep_one_admin();
