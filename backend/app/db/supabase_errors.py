from postgrest.exceptions import APIError

SETUP_HINT = (
    "Database tables are missing. Open Supabase Dashboard → SQL Editor, "
    "paste and run supabase/migrations/001_initial_schema.sql, then retry."
)


def is_missing_table_error(exc: BaseException, table: str | None = None) -> bool:
    if not isinstance(exc, APIError):
        return False
    code = getattr(exc, "code", None)
    if code == "PGRST205":
        return True
    # FK violations (23503) mention other tables — never treat as missing table.
    if code and str(code) not in ("PGRST205",):
        return False
    message = str(exc).lower()
    if table:
        # Avoid false positives: "posts" is a substring of "profiles".
        needles = (
            f"public.{table}",
            f'table "{table}"',
            f"table '{table}'",
            f"'{table}' in the schema cache",
        )
        return any(n in message for n in needles)
    return "schema cache" in message
