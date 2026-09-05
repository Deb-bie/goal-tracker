"use client";

import { useEffect, useState } from "react";
import { Calendar, Check, Copy, RefreshCw } from "lucide-react";
import { API_URL, calendarApi, ApiError } from "@/lib/api";

export default function CalendarSyncCard() {
  const [urlPath, setUrlPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const feed = await calendarApi.getFeed();
      setUrlPath(feed.url_path);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your calendar link.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const fullUrl = urlPath ? `${API_URL}${urlPath}` : null;

  async function handleCopy() {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy automatically — select the link and copy it manually.");
    }
  }

  async function handleRegenerate() {
    if (
      !confirm(
        "This retires your current calendar link. Any calendar app already subscribed will stop " +
          "updating until you re-subscribe with the new link. Continue?"
      )
    ) {
      return;
    }
    setRegenerating(true);
    setError(null);
    try {
      const feed = await calendarApi.regenerate();
      setUrlPath(feed.url_path);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not regenerate your calendar link.");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="card">
      <h2 className="mb-1 flex items-center gap-2 font-display font-semibold text-slate-800">
        <span className="icon-badge h-8 w-8 rounded-lg">
          <Calendar size={15} strokeWidth={2.25} />
        </span>
        Calendar sync
      </h2>
      <p className="mb-4 text-sm text-slate-500">
        Subscribe to this link from Google Calendar, Apple Calendar, or Outlook to see your goal
        deadlines, milestones, and todos (anything with a due date) alongside everything else on your
        calendar. It&apos;s a private link — anyone who has it can see your due dates, so only add it to
        calendars you control.
      </p>

      {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="mb-3 flex gap-2">
            <input
              className="input flex-1 font-mono text-xs"
              readOnly
              value={fullUrl || ""}
              onFocus={(e) => e.target.select()}
            />
            <button className="btn-secondary shrink-0 !py-1.5 text-sm" onClick={handleCopy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="mb-4">
            <button
              className="btn-secondary !py-1.5 text-xs"
              disabled={regenerating}
              onClick={handleRegenerate}
            >
              <RefreshCw size={13} className={regenerating ? "animate-spin" : ""} />
              {regenerating ? "Regenerating…" : "Regenerate link"}
            </button>
          </div>

          <details className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
            <summary className="cursor-pointer font-medium text-slate-600">How to subscribe</summary>
            <div className="mt-2 space-y-2">
              <p>
                <strong className="text-slate-700">Google Calendar</strong> (web): under &quot;Other
                calendars&quot; click + → &quot;From URL&quot; → paste the link → Add calendar.
              </p>
              <p>
                <strong className="text-slate-700">Apple Calendar</strong>: on a Mac, File → New Calendar
                Subscription → paste the link. On iPhone/iPad, Settings → Calendar → Accounts → Add
                Account → Other → Add Subscribed Calendar → paste the link.
              </p>
              <p>
                <strong className="text-slate-700">Outlook</strong>: Add calendar → Subscribe from web →
                paste the link.
              </p>
              <p className="text-xs text-slate-400">
                Subscribed calendars refresh periodically (often every few hours) rather than instantly —
                that refresh interval is set by your calendar app, not by Goal Tracker. Opening the link
                directly in a browser downloads a one-time snapshot instead, if that&apos;s all you need.
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
