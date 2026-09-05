"""Builds an iCalendar (.ics) feed of a user's goal deadlines, milestones, and todos.

Used for the subscribable calendar feed (GET /calendar/{user_id}/{token}.ics). Any
calendar app that supports "subscribe from URL" (Google Calendar, Apple Calendar,
Outlook, ...) can point at that URL and periodically refetch it, so the feed always
reflects whatever is in the app without any two-way sync or OAuth needed.
"""

import secrets
from datetime import date, datetime, timedelta

from app.models import Goal, Milestone, Todo, TodoStatus, User

_PRODID = "-//Goal Tracker//Personal Goal Tracker//EN"


def generate_token() -> str:
    """A URL-safe secret. Knowing it is what authorizes reading the feed."""
    return secrets.token_urlsafe(24)


def _escape(text: str) -> str:
    return (
        text.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\r\n", "\\n")
        .replace("\n", "\\n")
    )


def _fold(line: str) -> str:
    """Fold a content line to <=75 octets per RFC 5545 (continuation lines start with a space)."""
    encoded = line.encode("utf-8")
    if len(encoded) <= 75:
        return line

    chunks: list[str] = []
    start = 0
    limit = 75
    while start < len(encoded):
        end = min(start + limit, len(encoded))
        chunk = encoded[start:end]
        # Don't split a multi-byte UTF-8 sequence in half.
        while chunk and (chunk[-1] & 0b11000000) == 0b10000000:
            end -= 1
            chunk = encoded[start:end]
        chunks.append(chunk.decode("utf-8"))
        start = end
        limit = 74  # continuation lines get a leading space, so 74 + 1 = 75

    return "\r\n ".join(chunks)


def _event(uid: str, summary: str, day: date, description: str | None = None) -> list[str]:
    dtstamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    dtstart = day.strftime("%Y%m%d")
    dtend = (day + timedelta(days=1)).strftime("%Y%m%d")  # all-day events use an exclusive end date
    lines = [
        "BEGIN:VEVENT",
        f"UID:{uid}@goaltracker.app",
        f"DTSTAMP:{dtstamp}",
        f"DTSTART;VALUE=DATE:{dtstart}",
        f"DTEND;VALUE=DATE:{dtend}",
        f"SUMMARY:{_escape(summary)}",
    ]
    if description:
        lines.append(f"DESCRIPTION:{_escape(description)}")
    lines.append("END:VEVENT")
    return lines


def build_feed(user: User, goals: list[Goal], milestones: list[Milestone], todos: list[Todo]) -> str:
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:{_PRODID}",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Goal Tracker",
        "X-PUBLISHED-TTL:PT4H",
    ]

    goals_by_id = {g.id: g for g in goals}

    for goal in goals:
        if goal.target_date:
            lines += _event(
                uid=f"goal-{goal.id}",
                summary=f"Goal deadline: {goal.title}",
                day=goal.target_date,
                description=f'Target date for your goal "{goal.title}".',
            )

    for milestone in milestones:
        if milestone.due_date:
            goal = goals_by_id.get(milestone.goal_id)
            label = f" ({goal.title})" if goal else ""
            lines += _event(
                uid=f"milestone-{milestone.id}",
                summary=f"Milestone: {milestone.title}{label}",
                day=milestone.due_date,
                description=milestone.description,
            )

    for todo in todos:
        if todo.due_date:
            goal = goals_by_id.get(todo.goal_id) if todo.goal_id else None
            prefix = "[Done] " if todo.status == TodoStatus.completed else ""
            label = f" - {goal.title}" if goal else ""
            lines += _event(
                uid=f"todo-{todo.id}",
                summary=f"{prefix}{todo.title}{label}",
                day=todo.due_date,
                description=todo.description,
            )

    lines.append("END:VCALENDAR")
    return "\r\n".join(_fold(line) for line in lines) + "\r\n"
