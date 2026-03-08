import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface TrackerEvent {
  user_id: string;
  state: string;
  district: string;
  category_selected: string;
  scheme_shown: string;
  action_type: "view" | "apply" | "browse";
  timestamp: string;
}

export interface UsageDatasetRecord {
  user_id: string;
  state: string;
  district: string;
  category_selected: string;
  scheme_shown: string;
  applied: "Yes" | "No";
  approved: "Yes" | "No";
  income_band: "Low" | "Middle" | "High";
  age_group: "18-25" | "26-40" | "41-60" | "60+";
  timestamp: string;
}

const DATASET_TARGET_SIZE = 5000;
const FLUSH_INTERVAL_MS = 12000;
const CSV_HEADERS = [
  "user_id",
  "state",
  "district",
  "category_selected",
  "scheme_shown",
  "applied",
  "approved",
  "income_band",
  "age_group",
  "timestamp",
] as const;

const datasetPath = join(process.cwd(), "public", "government_usage_dataset.csv");

let pendingEvents: TrackerEvent[] = [];
let simulationStarted = false;
let flushTimer: ReturnType<typeof setInterval> | null = null;

function csvEscape(value: string): string {
  const normalized = value ?? "";
  if (normalized.includes(",") || normalized.includes("\"") || normalized.includes("\n")) {
    return `"${normalized.replace(/\"/g, '""')}"`;
  }
  return normalized;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseExistingDataset(): UsageDatasetRecord[] {
  if (!existsSync(datasetPath)) {
    return [];
  }

  const content = readFileSync(datasetPath, "utf-8").trim();
  if (!content) {
    return [];
  }

  const lines = content.split(/\r?\n/);
  if (lines.length <= 1) {
    return [];
  }

  return lines.slice(1).map((line) => {
    const [
      user_id,
      state,
      district,
      category_selected,
      scheme_shown,
      applied,
      approved,
      income_band,
      age_group,
      timestamp,
    ] = parseCsvLine(line);

    return {
      user_id,
      state,
      district,
      category_selected,
      scheme_shown,
      applied: applied === "Yes" ? "Yes" : "No",
      approved: approved === "Yes" ? "Yes" : "No",
      income_band: ["Low", "Middle", "High"].includes(income_band)
        ? (income_band as "Low" | "Middle" | "High")
        : "Middle",
      age_group: ["18-25", "26-40", "41-60", "60+"].includes(age_group)
        ? (age_group as "18-25" | "26-40" | "41-60" | "60+")
        : "26-40",
      timestamp,
    };
  });
}

function toCsv(records: UsageDatasetRecord[]): string {
  const rows = records.map((record) =>
    [
      record.user_id,
      record.state,
      record.district,
      record.category_selected,
      record.scheme_shown,
      record.applied,
      record.approved,
      record.income_band,
      record.age_group,
      record.timestamp,
    ]
      .map((cell) => csvEscape(String(cell)))
      .join(",")
  );

  return `${CSV_HEADERS.join(",")}\n${rows.join("\n")}`;
}

function deterministicScore(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function pickIncomeBand(seed: string): "Low" | "Middle" | "High" {
  const score = deterministicScore(`income:${seed}`);
  if (score < 0.52) return "Low";
  if (score < 0.85) return "Middle";
  return "High";
}

function pickAgeGroup(seed: string): "18-25" | "26-40" | "41-60" | "60+" {
  const score = deterministicScore(`age:${seed}`);
  if (score < 0.22) return "18-25";
  if (score < 0.62) return "26-40";
  if (score < 0.9) return "41-60";
  return "60+";
}

function transformEvent(event: TrackerEvent): UsageDatasetRecord {
  const applied = event.action_type === "apply" ? "Yes" : "No";
  const approvedThreshold = deterministicScore(`approval:${event.user_id}:${event.timestamp}:${event.scheme_shown}`);
  const approved: "Yes" | "No" =
    applied === "Yes" && approvedThreshold < 0.7 ? "Yes" : "No";

  return {
    user_id: event.user_id,
    state: event.state || "India",
    district: event.district || "",
    category_selected: event.category_selected || "",
    scheme_shown: event.scheme_shown || "",
    applied,
    approved,
    income_band: pickIncomeBand(`${event.user_id}:${event.timestamp}`),
    age_group: pickAgeGroup(`${event.user_id}:${event.timestamp}:${event.action_type}`),
    timestamp: event.timestamp,
  };
}

function flushPendingEvents(): void {
  if (pendingEvents.length === 0) {
    return;
  }

  const batch = pendingEvents.splice(0, pendingEvents.length);
  const transformed = batch.map(transformEvent);
  const existing = parseExistingDataset();
  const merged = [...existing, ...transformed];
  const rolled = merged.length > DATASET_TARGET_SIZE ? merged.slice(-DATASET_TARGET_SIZE) : merged;

  writeFileSync(datasetPath, toCsv(rolled), "utf-8");
}

export function enqueueTrackerEvents(events: TrackerEvent[]): void {
  if (!events.length) {
    return;
  }

  pendingEvents.push(...events);
  startDatasetSimulation();
}

export function getPendingEventCount(): number {
  return pendingEvents.length;
}

export function runDatasetBuildNow(): void {
  flushPendingEvents();
}

export function startDatasetSimulation(): void {
  if (simulationStarted) {
    return;
  }

  simulationStarted = true;
  flushTimer = setInterval(() => {
    try {
      flushPendingEvents();
    } catch (error) {
      console.error("Dataset simulation flush failed:", error);
    }
  }, FLUSH_INTERVAL_MS);

  if (typeof flushTimer.unref === "function") {
    flushTimer.unref();
  }
}

export function stopDatasetSimulation(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  simulationStarted = false;
}
