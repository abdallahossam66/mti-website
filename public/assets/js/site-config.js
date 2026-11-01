// Site configuration. Edit here; no build step is needed.

// Company-approved meeting-booking URL (brief §09). Leave empty until MTI supplies it:
// while empty, "Book a Consultation" opens the contact form instead of a booking page.
export const BOOKING_URL = '';

// Analytics hook. No analytics is loaded until MTI supplies account IDs and a consent model (brief §03).
// Every event is pushed to window.mtiDataLayer and dispatched as a `mti:track` DOM event, so a tag
// manager or analytics snippet can subscribe later without touching the site code. See README "Analytics".
export function track(event, props = {}) {
  const entry = { event, ...props, ts: Date.now() };
  (window.mtiDataLayer = window.mtiDataLayer || []).push(entry);
  document.dispatchEvent(new CustomEvent('mti:track', { detail: entry }));
}
