export type ModerationDetail = {
  code?: string;
  message?: string;
  strikes?: number;
  suspended?: boolean;
  remaining?: number;
};

export function parseApiDetail(detail: unknown): string {
  if (typeof detail === "string") {
    return detail;
  }
  if (detail && typeof detail === "object" && "message" in detail) {
    const mod = detail as ModerationDetail;
    if (typeof mod.message === "string") {
      return mod.message;
    }
  }
  return "Request failed.";
}

export function isAccountSuspendedDetail(detail: unknown): boolean {
  if (detail && typeof detail === "object" && "code" in detail) {
    return (detail as ModerationDetail).code === "account_suspended";
  }
  return false;
}
