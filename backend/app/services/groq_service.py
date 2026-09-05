import json
from datetime import date, timedelta

from groq import Groq # type: ignore

from app.config import get_settings

settings = get_settings()

TIMEFRAME_DAYS = {
    "1_week": 7,
    "2_weeks": 14,
    "1_month": 30,
    "3_months": 90,
    "6_months": 180,
    "1_year": 365,
    "custom": 30,
}


_BREAKDOWN_SCHEMA = {
    "type": "object",
    "properties": {
        "milestones": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "days_from_start": {"type": "integer"},
                    "todos": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string"},
                                "description": {"type": "string"},
                                "days_from_start": {"type": "integer"},
                                "priority": {"type": "string", "enum": ["low", "medium", "high"]},
                            },
                            "required": ["title", "description", "days_from_start", "priority"],
                            "additionalProperties": False,
                        },
                    },
                },
                "required": ["title", "description", "days_from_start", "todos"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["milestones"],
    "additionalProperties": False,
}

_SYSTEM_PROMPT = """You are an expert productivity and goal-planning coach.
Given a user's goal, break it into an ordered set of milestones, and under
each milestone a small set of concrete, actionable todos.

Rules:
- The timeframe is a ROLLING WINDOW measured in days from the given start
  date — e.g. "1 year" means exactly 365 days after the start date, whatever
  that date is. It is NOT the current calendar year and does NOT end on
  December 31st. If the start date is, say, August 24, a 1-year plan runs
  all the way to the following August 24 — do not stop early just because a
  calendar year, quarter, or month boundary is reached.
- Use the ENTIRE requested window. The final milestone's "days_from_start"
  should land in the last 15% of the total day count given (i.e. close to
  the end date), not bunched up near the start. Spread milestones roughly
  evenly across the full window for the requested granularity.
- Do not schedule anything beyond the total number of days given.
- Every milestone and todo needs an integer "days_from_start" (0 = the start
  date itself) telling us when it should be done by.
- Todos should be specific and doable in a single sitting (e.g. "Write
  outline for chapter 1", not "Write the book").
- Keep milestone count reasonable for the timeframe (roughly one per week for
  a "weekly" granularity, one per day for "daily", one per month for
  "monthly").
- priority is one of "low", "medium", "high".
- Respond with ONLY a JSON object matching this schema, no extra prose:

{
  "milestones": [
    {
      "title": "string",
      "description": "string",
      "days_from_start": 7,
      "todos": [
        {"title": "string", "description": "string", "days_from_start": 3, "priority": "medium"}
      ]
    }
  ]
}
"""


def _client() -> Groq:
    if not settings.groq_api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to backend/.env (see .env.example) "
            "and restart the server."
        )
    return Groq(api_key=settings.groq_api_key)


def _call_groq(system_prompt: str, user_prompt: str) -> dict:
    client = _client()
    try:
        completion = client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "goal_breakdown",
                    "schema": _BREAKDOWN_SCHEMA,
                    "strict": True,
                },
            },
        )
    except Exception as exc: 
        message = str(exc)
        if "model_not_found" in message or "does not exist" in message:
            raise RuntimeError(
                f"Groq model '{settings.groq_model}' is unavailable (it may have been "
                "deprecated). Check https://console.groq.com/docs/models for current "
                "model IDs and update GROQ_MODEL in backend/.env."
            ) from exc
        raise RuntimeError(f"Groq request failed: {message}") from exc

    raw = completion.choices[0].message.content
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Groq returned invalid JSON: {exc}\nRaw response: {raw[:500]}") from exc


def generate_breakdown(
    *,
    goal_title: str,
    goal_description: str | None,
    timeframe: str,
    granularity: str,
    start_date: date,
    extra_context: str | None = None,
) -> dict:
    """Returns {"milestones": [{"title", "description", "due_date", "todos": [...]}]}
    with real dates already computed.
    """
    total_days = TIMEFRAME_DAYS.get(timeframe, 30)
    end_date = start_date + timedelta(days=total_days)
    last_milestone_floor = int(total_days * 0.85)

    user_prompt = (
        f"Goal: {goal_title}\n"
        f"Description: {goal_description or '(none provided)'}\n"
        f"Start date: {start_date.isoformat()}\n"
        f"Total timeframe: {total_days} days ({timeframe.replace('_', ' ')}), running from "
        f"{start_date.isoformat()} to {end_date.isoformat()} — a rolling window, NOT bounded by "
        f"the calendar year.\n"
        f"Preferred granularity for milestones: {granularity}\n"
        f"Extra context from the user: {extra_context or '(none)'}\n\n"
        f"The last milestone's days_from_start must be between {last_milestone_floor} and "
        f"{total_days} (i.e. land on or shortly before {end_date.isoformat()}). Do not let the plan "
        "end early.\n\n"
        "Produce the milestone/todo breakdown JSON now."
    )

    data = _call_groq(_SYSTEM_PROMPT, user_prompt)
    return _apply_dates(data, start_date, total_days)


def generate_replan(
    *,
    goal_title: str,
    goal_description: str | None,
    timeframe: str,
    granularity: str,
    today: date,
    target_date: date | None,
    completed_titles: list[str],
    remaining_titles: list[str],
    reason: str | None,
) -> dict:
    days_left = max(1, (target_date - today).days) if target_date else TIMEFRAME_DAYS.get(timeframe, 30)
    end_date = today + timedelta(days=days_left)
    last_milestone_floor = int(days_left * 0.85)

    system_prompt = _SYSTEM_PROMPT + (
        "\n\nThe user already has a plan in progress and is asking you to REPLAN "
        "the remaining work only. Do not repeat anything already completed. "
        "Use `days_from_start` counted from the new start date given below "
        "(today), not the original goal start date."
    )

    user_prompt = (
        f"Goal: {goal_title}\n"
        f"Description: {goal_description or '(none provided)'}\n"
        f"Today (new start date for replanning): {today.isoformat()}\n"
        f"Days remaining until target date: {days_left} — a rolling window running from "
        f"{today.isoformat()} to {end_date.isoformat()}, NOT bounded by the calendar year.\n"
        f"Preferred granularity: {granularity}\n"
        f"Already completed (do not repeat): {', '.join(completed_titles) or '(nothing yet)'}\n"
        f"Still pending from the old plan (may be reused/adjusted): {', '.join(remaining_titles) or '(none)'}\n"
        f"Why the user is replanning: {reason or 'falling behind schedule'}\n\n"
        f"The last milestone's days_from_start must be between {last_milestone_floor} and "
        f"{days_left} (i.e. land on or shortly before {end_date.isoformat()}). Do not let the plan "
        "end early.\n\n"
        "Produce an updated milestone/todo breakdown JSON for the remaining time only."
    )

    data = _call_groq(system_prompt, user_prompt)
    return _apply_dates(data, today, days_left)


def _apply_dates(data: dict, start_date: date, total_days: int) -> dict:
    milestones = data.get("milestones", [])
    for m in milestones:
        offset = min(int(m.get("days_from_start", 0) or 0), total_days)
        m["due_date"] = (start_date + timedelta(days=offset)).isoformat()
        for t in m.get("todos", []):
            t_offset = min(int(t.get("days_from_start", offset) or 0), total_days)
            t["due_date"] = (start_date + timedelta(days=t_offset)).isoformat()
            t.setdefault("priority", "medium")
    return {"milestones": milestones}
