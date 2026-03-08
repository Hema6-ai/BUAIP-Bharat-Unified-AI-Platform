import { NextRequest, NextResponse } from "next/server";
import { enqueueTrackerEvents, getPendingEventCount, startDatasetSimulation } from "@/app/lib/datasetBuilder";
import type { TrackerEvent } from "@/app/lib/datasetBuilder";

interface DatasetEventsPayload {
  events?: TrackerEvent[];
}

export function GET() {
  startDatasetSimulation();
  return NextResponse.json({ pendingEvents: getPendingEventCount() });
}

export async function POST(request: NextRequest) {
  try {
    const body: DatasetEventsPayload = await request.json();
    const events = Array.isArray(body?.events) ? body.events : [];

    if (events.length === 0) {
      return NextResponse.json({ accepted: 0, pendingEvents: getPendingEventCount() });
    }

    enqueueTrackerEvents(events);

    return NextResponse.json({
      accepted: events.length,
      pendingEvents: getPendingEventCount(),
    });
  } catch (error) {
    console.error("Failed to ingest dataset events:", error);
    return NextResponse.json(
      { error: "Invalid dataset event payload" },
      { status: 400 }
    );
  }
}
