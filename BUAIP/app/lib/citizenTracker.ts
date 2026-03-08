export type CitizenActionType = "view" | "apply" | "browse";

export interface CitizenSessionLogRow {
  user_id: string;
  state: string;
  district: string;
  category_selected: string;
  scheme_shown: string;
  action_type: CitizenActionType;
  timestamp: string;
}

interface TrackCitizenEventInput {
  region?: string;
  categorySelected?: string;
  schemeShown?: string;
  actionType: CitizenActionType;
}

const DEFAULT_STATE = "India";
const SESSION_USER_ID_KEY = "citizen_dashboard_user_id";

let sessionUserIdCache: string | null = null;
const sessionLog: CitizenSessionLogRow[] = [];

function dispatchEventToDatasetBuilder(entry: CitizenSessionLogRow): void {
  if (typeof window === "undefined") {
    return;
  }

  fetch("/api/dataset-events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ events: [entry] }),
    keepalive: true,
  }).catch((error) => {
    console.error("Failed to dispatch tracking event to dataset builder:", error);
  });
}

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function getSessionUserId(): string {
  if (sessionUserIdCache) {
    return sessionUserIdCache;
  }

  if (typeof window !== "undefined") {
    const existing = window.sessionStorage.getItem(SESSION_USER_ID_KEY);
    if (existing && existing.trim().length > 0) {
      sessionUserIdCache = existing;
      return sessionUserIdCache;
    }

    const created = generateUuid();
    window.sessionStorage.setItem(SESSION_USER_ID_KEY, created);
    sessionUserIdCache = created;
    return sessionUserIdCache;
  }

  sessionUserIdCache = generateUuid();
  return sessionUserIdCache;
}

function parseRegion(region?: string): { state: string; district: string } {
  const normalized = region?.trim() || DEFAULT_STATE;

  for (const separator of [",", " - ", "|"]) {
    const separatorIndex = normalized.indexOf(separator);
    if (separatorIndex > -1) {
      const state = normalized.slice(0, separatorIndex).trim() || DEFAULT_STATE;
      const district = normalized.slice(separatorIndex + separator.length).trim();
      return { state, district };
    }
  }

  return { state: normalized, district: "" };
}

export function trackCitizenEvent({
  region,
  categorySelected,
  schemeShown,
  actionType,
}: TrackCitizenEventInput): CitizenSessionLogRow {
  const { state, district } = parseRegion(region);

  const entry: CitizenSessionLogRow = {
    user_id: getSessionUserId(),
    state,
    district,
    category_selected: categorySelected || "",
    scheme_shown: schemeShown || "",
    action_type: actionType,
    timestamp: new Date().toISOString(),
  };

  sessionLog.push(entry);
  dispatchEventToDatasetBuilder(entry);
  return entry;
}

export function getCitizenSessionLog(): CitizenSessionLogRow[] {
  return [...sessionLog];
}

export function clearCitizenSessionLog(): void {
  sessionLog.length = 0;
}

export function exportCitizenSessionLog(): { user_id: string; events: CitizenSessionLogRow[] } {
  return {
    user_id: getSessionUserId(),
    events: getCitizenSessionLog(),
  };
}
