export type AnalyticsEvent =
  | "desk_viewed"
  | "invoices_triaged"
  | "collection_queue_exported"
  | "team_interest"
  | "feedback_intent";

declare global {
  interface Window {
    plausible?: (event: string) => void;
  }
}

export function track(event: AnalyticsEvent): void {
  if (typeof window !== "undefined") window.plausible?.(event);
}
