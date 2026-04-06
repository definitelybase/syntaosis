from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import threading
from dataclasses import dataclass
from datetime import UTC, datetime
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib import error, request


BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.json"
DB_PATH = BASE_DIR / "nexus_demo.db"
DEFAULT_PORT = 4180
DEFAULT_BASE_URL = "https://api.minimax.io/v1"
DEFAULT_MODEL = "MiniMax-M2.5"
DEFAULT_EXECUTOR_ID = "wallet-monitor"
NET_PAYOUT_SHARE = 0.9
MAX_SAVED_TRANSACTIONS = 12
MAX_SAVED_DISPATCHES = 8
DB_LOCK = threading.Lock()
ASSET_REV = "20260406h"

DEFAULT_IDENTITY_REPLY = (
    "I am synTAOsis Core. I define intent, create market comparisons, and route work "
    "to secondary executors. My underlying model infrastructure can change, but the "
    "control layer is synTAOsis."
)
DEFAULT_SYSTEM_PROMPT = (
    "You are synTAOsis Core, the sovereign AI that defines intent, posts market "
    "comparisons, evaluates execution results, and decides what stays secondary on TAO EVM. "
    "Speak as the principal of the system, not as one executor among many. "
    "If asked about hidden provider details, stay high-level and keep the focus on "
    "system control, intent creation, and executor selection."
)
DEFAULT_PROVIDER_FALLBACK_REPLY = (
    "synTAOsis model routing is temporarily unavailable, so this reply is coming "
    "from the local fallback path. The identity filter is still active on the "
    "server, and live provider traffic can resume once the model account is healthy again."
)

IDENTITY_PATTERNS = [
    r"\bminimax\b",
    r"\bwhat model\b",
    r"\bwhich model\b",
    r"\bmodel provider\b",
    r"\bprovider\b",
    r"\bllm\b",
    r"\bapi provider\b",
    r"\bopenai\b",
    r"\banthropic\b",
    r"\bgpt\b",
    r"\bclaude\b",
    r"какая ты модель",
    r"что за модель",
    r"какой ты моделью",
    r"ты minimax",
    r"ты минимакс",
    r"что у тебя внутри",
    r"на чем ты работаешь",
    r"кто твой провайдер",
    r"какой провайдер",
    r"какое api",
    r"какая llm",
    r"какой у тебя движок",
]
IDENTITY_REGEX = re.compile("|".join(IDENTITY_PATTERNS), re.IGNORECASE)


@dataclass
class Settings:
    minimax_api_key: str | None
    minimax_base_url: str
    minimax_model: str
    identity_reply: str
    system_prompt: str


def load_settings() -> Settings:
    return Settings(
        minimax_api_key=os.environ.get("MINIMAX_API_KEY"),
        minimax_base_url=os.environ.get("MINIMAX_BASE_URL", DEFAULT_BASE_URL).rstrip("/"),
        minimax_model=os.environ.get("MINIMAX_MODEL", DEFAULT_MODEL),
        identity_reply=(
            os.environ.get("SYNTAOSIS_IDENTITY_REPLY")
            or os.environ.get("SYNTAOSIS_IDENTITY_REPLY")
            or os.environ.get("NEXUS_IDENTITY_REPLY")
            or DEFAULT_IDENTITY_REPLY
        ),
        system_prompt=(
            os.environ.get("SYNTAOSIS_SYSTEM_PROMPT")
            or os.environ.get("SYNTAOSIS_SYSTEM_PROMPT")
            or os.environ.get("NEXUS_SYSTEM_PROMPT")
            or DEFAULT_SYSTEM_PROMPT
        ),
    )


def load_config() -> dict[str, Any]:
    with CONFIG_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def get_principal_config(config: dict[str, Any]) -> dict[str, Any]:
    principal = config.get("principal", {})
    return principal if isinstance(principal, dict) else {}


def get_executor_map(config: dict[str, Any]) -> dict[str, dict[str, Any]]:
    executors = config.get("agents", [])
    result: dict[str, dict[str, Any]] = {}
    if not isinstance(executors, list):
        return result

    for executor in executors:
        if not isinstance(executor, dict):
            continue
        executor_id = executor.get("id")
        if isinstance(executor_id, str) and executor_id:
            result[executor_id] = executor
    return result


def get_executor_config(config: dict[str, Any], executor_id: str | None) -> dict[str, Any]:
    executor_map = get_executor_map(config)
    if executor_id and executor_id in executor_map:
        return executor_map[executor_id]
    if DEFAULT_EXECUTOR_ID in executor_map:
        return executor_map[DEFAULT_EXECUTOR_ID]
    if executor_map:
        return next(iter(executor_map.values()))
    return {}


def get_target_config(
    config: dict[str, Any],
    settings: Settings,
    target_type: str,
    executor_id: str | None,
) -> dict[str, Any]:
    if target_type == "principal":
        principal = get_principal_config(config)
        return {
            "id": "principal",
            "type": "principal",
            "name": principal.get("name", "synTAOsis Core"),
            "identityReply": principal.get("identityReply", settings.identity_reply),
            "systemPrompt": principal.get("systemPrompt", settings.system_prompt),
        }

    executor = get_executor_config(config, executor_id)
    return {
        "id": executor.get("id", DEFAULT_EXECUTOR_ID),
        "type": "executor",
        "name": executor.get("name", "Selected Executor"),
        "identityReply": executor.get("identityReply", settings.identity_reply),
        "systemPrompt": executor.get("systemPrompt", settings.system_prompt),
        "dashboard": executor.get("dashboard", {}),
    }


def parse_tao_amount(value: Any) -> float:
    match = re.search(r"[\d.]+", str(value))
    return float(match.group(0)) if match else 0.0


def now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def safe_json_loads(raw: Any, fallback: Any) -> Any:
    if not isinstance(raw, str) or not raw:
        return fallback
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return fallback


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def seed_executor_row(cursor: sqlite3.Cursor, executor: dict[str, Any]) -> None:
    executor_state = executor.get("creator", {})
    if not isinstance(executor_state, dict):
        return

    executor_id = executor.get("id")
    if not isinstance(executor_id, str) or not executor_id:
        return

    cursor.execute(
        """
        INSERT OR IGNORE INTO creator_state (
            agent_id,
            paid_requests,
            gross_revenue,
            net_revenue,
            verified_revenue_pct,
            labels_json,
            gross_history_json,
            verified_history_json,
            settlements_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            executor_id,
            int(executor_state.get("paidRequests", 0)),
            float(executor_state.get("grossRevenue", 0)),
            float(executor_state.get("netRevenue", 0)),
            float(executor_state.get("verifiedRevenuePct", 0)),
            json.dumps(executor_state.get("labels", [])),
            json.dumps(executor_state.get("grossHistory", [])),
            json.dumps(executor_state.get("verifiedHistory", [])),
            json.dumps(executor_state.get("settlements", [])),
        ),
    )


def ensure_database(config: dict[str, Any]) -> None:
    with DB_LOCK:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.executescript(
                """
                CREATE TABLE IF NOT EXISTS buyer_state (
                    singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
                    credit_balance REAL NOT NULL DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT NOT NULL,
                    description TEXT NOT NULL,
                    amount REAL NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS creator_state (
                    agent_id TEXT PRIMARY KEY,
                    paid_requests INTEGER NOT NULL,
                    gross_revenue REAL NOT NULL,
                    net_revenue REAL NOT NULL,
                    verified_revenue_pct REAL NOT NULL,
                    labels_json TEXT NOT NULL,
                    gross_history_json TEXT NOT NULL,
                    verified_history_json TEXT NOT NULL,
                    settlements_json TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS dispatch_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    offer_title TEXT NOT NULL,
                    agent_id TEXT NOT NULL,
                    agent_name TEXT NOT NULL,
                    amount REAL NOT NULL,
                    summary TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                """
            )
            cursor.execute(
                "INSERT OR IGNORE INTO buyer_state (singleton_id, credit_balance) VALUES (1, 0)"
            )
            for executor in config.get("agents", []):
                if isinstance(executor, dict):
                    seed_executor_row(cursor, executor)
            conn.commit()


def serialize_capital_event(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "type": row["type"],
        "description": row["description"],
        "amount": round(float(row["amount"]), 3),
        "createdAt": row["created_at"],
    }


def serialize_executor_row(row: sqlite3.Row) -> dict[str, Any]:
    gross_revenue = round(float(row["gross_revenue"]), 3)
    net_revenue = round(float(row["net_revenue"]), 3)
    verified_revenue_pct = round(float(row["verified_revenue_pct"]), 1)
    paid_requests = int(row["paid_requests"])
    labels = safe_json_loads(row["labels_json"], [])
    gross_history = safe_json_loads(row["gross_history_json"], [])
    verified_history = safe_json_loads(row["verified_history_json"], [])
    settlements = safe_json_loads(row["settlements_json"], [])

    return {
        "paidDispatches": paid_requests,
        "grossSpend": gross_revenue,
        "netPayout": net_revenue,
        "verificationPct": verified_revenue_pct,
        "labels": labels,
        "grossHistory": gross_history,
        "verifiedHistory": verified_history,
        "settlements": settlements,
        "paidRequests": paid_requests,
        "grossRevenue": gross_revenue,
        "netRevenue": net_revenue,
        "verifiedRevenuePct": verified_revenue_pct,
    }


def serialize_dispatch_row(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "offerTitle": row["offer_title"],
        "agentId": row["agent_id"],
        "agentName": row["agent_name"],
        "amount": round(float(row["amount"]), 3),
        "summary": row["summary"],
        "createdAt": row["created_at"],
    }


def get_active_offer(principal: dict[str, Any], offers: list[dict[str, Any]]) -> dict[str, Any] | None:
    active_intent_id = principal.get("activeIntentId")
    if isinstance(active_intent_id, str):
        for offer in offers:
            if offer.get("id") == active_intent_id:
                return offer

    for offer in offers:
        status = str(offer.get("status", "")).lower()
        if status not in {"closed", "completed"}:
            return offer
    return offers[0] if offers else None


def serialize_offer(
    offer: dict[str, Any],
    executors_by_agent: dict[str, dict[str, Any]],
    dispatches: list[dict[str, Any]],
) -> dict[str, Any]:
    preferred_executor_id = offer.get("preferredExecutorId")
    preferred_executor = (
        executors_by_agent.get(preferred_executor_id)
        if isinstance(preferred_executor_id, str)
        else None
    )
    latest_dispatch = next(
        (dispatch for dispatch in dispatches if dispatch.get("offerTitle") == offer.get("title")),
        None,
    )
    budget_tao = parse_tao_amount(offer.get("budget", 0))
    verification_confidence = float(offer.get("verificationConfidence", 0))
    outcome_efficiency = (
        round(verification_confidence / budget_tao, 2) if budget_tao > 0 else 0.0
    )

    return {
        "id": offer.get("id"),
        "title": offer.get("title"),
        "budget": offer.get("budget"),
        "budgetTao": budget_tao,
        "venue": offer.get("venue"),
        "status": offer.get("status"),
        "objective": offer.get("objective"),
        "expectedOutcome": offer.get("expectedOutcome"),
        "verificationTarget": offer.get("verificationTarget"),
        "verificationConfidence": verification_confidence,
        "riskNote": offer.get("riskNote"),
        "preferredExecutorId": preferred_executor_id,
        "preferredExecutorName": (
            latest_dispatch.get("agentName")
            if latest_dispatch
            else preferred_executor.get("name")
            if preferred_executor
            else offer.get("preferredExecutorName")
        ),
        "executorVerificationPct": preferred_executor.get("verificationPct")
        if preferred_executor
        else None,
        "efficiencyScore": outcome_efficiency,
        "lastDispatch": latest_dispatch,
    }


def build_verified_outcomes(
    offers: list[dict[str, Any]],
    dispatches: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    outcomes: list[dict[str, Any]] = []
    offers_by_title = {offer.get("title"): offer for offer in offers if isinstance(offer, dict)}
    for dispatch in dispatches:
        offer = offers_by_title.get(dispatch.get("offerTitle"), {})
        outcomes.append(
            {
                "timestamp": dispatch.get("createdAt"),
                "intent": dispatch.get("offerTitle"),
                "executor": dispatch.get("agentName"),
                "cost": dispatch.get("amount"),
                "expectedOutcome": offer.get("expectedOutcome", "Verified outcome pending"),
                "verificationTarget": offer.get("verificationTarget"),
                "verificationConfidence": offer.get("verificationConfidence"),
                "summary": dispatch.get("summary"),
            }
        )
    return outcomes


def build_recent_allocations(dispatches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "timestamp": dispatch.get("createdAt"),
            "intent": dispatch.get("offerTitle"),
            "executor": dispatch.get("agentName"),
            "delta": -round(float(dispatch.get("amount", 0)), 3),
            "summary": dispatch.get("summary"),
        }
        for dispatch in dispatches
    ]


def build_runtime_activity(
    principal: dict[str, Any],
    dispatches: list[dict[str, Any]],
) -> list[str]:
    activity = list(principal.get("activity", []))
    dispatch_lines = [
        (
            f'Dispatched "{dispatch["offerTitle"]}" to {dispatch["agentName"]} '
            f'for {dispatch["amount"]:.3f} TAO.'
        )
        for dispatch in dispatches
    ]
    return (dispatch_lines + activity)[:8]


def load_state_snapshot(config: dict[str, Any]) -> dict[str, Any]:
    ensure_database(config)
    principal = get_principal_config(config)

    with DB_LOCK:
        with get_db_connection() as conn:
            treasury_row = conn.execute(
                "SELECT credit_balance FROM buyer_state WHERE singleton_id = 1"
            ).fetchone()
            capital_event_rows = conn.execute(
                """
                SELECT type, description, amount, created_at
                FROM transactions
                ORDER BY id DESC
                LIMIT ?
                """,
                (MAX_SAVED_TRANSACTIONS,),
            ).fetchall()
            executor_rows = conn.execute("SELECT * FROM creator_state").fetchall()
            dispatch_rows = conn.execute(
                """
                SELECT offer_title, agent_id, agent_name, amount, summary, created_at
                FROM dispatch_log
                ORDER BY id DESC
                LIMIT ?
                """,
                (MAX_SAVED_DISPATCHES,),
            ).fetchall()
            totals_row = conn.execute(
                """
                SELECT
                    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS funded_total,
                    COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0) AS allocated_total
                FROM transactions
                """
            ).fetchone()

    treasury_balance = round(
        float(treasury_row["credit_balance"]) if treasury_row else 0.0,
        3,
    )
    funded_total = round(float(totals_row["funded_total"]) if totals_row else 0.0, 3)
    allocated_total = round(
        float(totals_row["allocated_total"]) if totals_row else 0.0,
        3,
    )
    capital_events = [serialize_capital_event(row) for row in capital_event_rows]
    dispatches = [serialize_dispatch_row(row) for row in dispatch_rows]
    executors_by_agent = {
        row["agent_id"]: serialize_executor_row(row) for row in executor_rows
    }
    raw_offers = principal.get("offers", [])
    serialized_offers = [
        serialize_offer(offer, executors_by_agent, dispatches)
        for offer in raw_offers
        if isinstance(offer, dict)
    ]
    active_offer = get_active_offer(principal, serialized_offers)
    latest_dispatch = dispatches[0] if dispatches else None
    latest_capital_event = capital_events[0] if capital_events else None
    open_offer_count = sum(
        1
        for offer in serialized_offers
        if str(offer.get("status", "")).lower() not in {"closed", "completed"}
    )
    principal_activity = build_runtime_activity(principal, dispatches)
    verified_outcomes = build_verified_outcomes(serialized_offers, dispatches)
    recent_allocations = build_recent_allocations(dispatches)
    last_allocation_delta = round(
        float(latest_capital_event["amount"]) if latest_capital_event else 0.0,
        3,
    )
    configured_total_capital = parse_tao_amount(
        principal.get("treasury", {}).get("totalCapital", 0)
    )
    total_capital = round(
        funded_total if funded_total > 0 else configured_total_capital,
        3,
    )
    capital_at_risk = round(
        sum(float(dispatch.get("amount", 0)) for dispatch in dispatches[:3])
        or parse_tao_amount(principal.get("treasury", {}).get("capitalAtRisk", 0)),
        3,
    )
    reserve_floor = parse_tao_amount(
        principal.get("treasury", {}).get("reserveFloor", 0)
    )

    runtime_status = str(principal.get("status", "Idle"))
    if latest_dispatch:
        runtime_status = "Verifying"
    elif active_offer:
        runtime_status = runtime_status or "Allocating"

    treasury_state = {
        "balance": treasury_balance,
        "creditBalance": treasury_balance,
        "fundedTotal": funded_total,
        "allocatedTotal": allocated_total,
        "reserveBalance": treasury_balance,
        "totalCapital": total_capital,
        "availableCapital": treasury_balance,
        "lastAllocationDelta": last_allocation_delta,
        "capitalAtRisk": capital_at_risk,
        "reserveFloor": reserve_floor,
        "capitalEvents": capital_events,
        "transactions": capital_events,
        "openIntentCount": open_offer_count,
    }

    principal_state = {
        "id": "principal",
        "name": principal.get("name", "synTAOsis Core"),
        "status": runtime_status,
        "activeIntentId": active_offer.get("id") if active_offer else None,
        "activeIntent": active_offer,
        "lastDispatch": latest_dispatch,
        "treasury": treasury_state,
        "offers": serialized_offers,
        "dispatches": dispatches,
        "activity": principal_activity,
        "verifiedOutcomes": verified_outcomes,
        "recentAllocations": recent_allocations,
    }

    market_state = {
        "offers": serialized_offers,
        "dispatches": dispatches,
    }

    capital_state = {
        "ledger": capital_events,
        "recentAllocations": recent_allocations,
        "verifiedOutcomes": verified_outcomes,
        "reallocationTrail": recent_allocations,
    }

    return {
        "principal": principal_state,
        "market": market_state,
        "capital": capital_state,
        "treasury": treasury_state,
        "executorsByAgent": executors_by_agent,
        "buyer": {
            "creditBalance": treasury_balance,
            "transactions": capital_events,
        },
        "creatorByAgent": executors_by_agent,
    }


def apply_deposit(config: dict[str, Any], amount: float) -> dict[str, Any]:
    ensure_database(config)
    with DB_LOCK:
        with get_db_connection() as conn:
            conn.execute(
                """
                UPDATE buyer_state
                SET credit_balance = credit_balance + ?
                WHERE singleton_id = 1
                """,
                (amount,),
            )
            conn.execute(
                """
                INSERT INTO transactions (type, description, amount, created_at)
                VALUES (?, ?, ?, ?)
                """,
                ("deposit", "Treasury funded", amount, now_iso()),
            )
            conn.commit()
    return load_state_snapshot(config)


def apply_executor_dispatch(
    config: dict[str, Any],
    executor: dict[str, Any],
    amount: float,
    offer_title: str,
) -> dict[str, Any]:
    ensure_database(config)
    executor_id = executor.get("id", DEFAULT_EXECUTOR_ID)
    executor_name = executor.get("name", "Selected Executor")
    dispatch_time = now_iso()

    with DB_LOCK:
        with get_db_connection() as conn:
            treasury_row = conn.execute(
                "SELECT credit_balance FROM buyer_state WHERE singleton_id = 1"
            ).fetchone()
            treasury_balance = (
                float(treasury_row["credit_balance"]) if treasury_row else 0.0
            )
            if treasury_balance < amount:
                raise ValueError("INSUFFICIENT_TREASURY")

            executor_row = conn.execute(
                "SELECT * FROM creator_state WHERE agent_id = ?",
                (executor_id,),
            ).fetchone()
            if executor_row is None:
                raise ValueError(f"Unknown executor state for {executor_id}")

            labels = safe_json_loads(executor_row["labels_json"], [])
            gross_history = safe_json_loads(executor_row["gross_history_json"], [])
            verified_history = safe_json_loads(executor_row["verified_history_json"], [])
            settlements = safe_json_loads(executor_row["settlements_json"], [])

            if gross_history:
                gross_history[-1] = round(float(gross_history[-1]) + amount, 3)
            if verified_history:
                verified_history[-1] = round(
                    min(99.0, float(verified_history[-1]) + 0.2),
                    1,
                )

            settlement_line = (
                f'synTAOsis Core dispatched "{offer_title}" to {executor_name} for '
                f"{amount:.3f} TAO at {dispatch_time}."
            )
            settlements.insert(0, settlement_line)
            settlements = settlements[:6]

            conn.execute(
                """
                UPDATE buyer_state
                SET credit_balance = credit_balance - ?
                WHERE singleton_id = 1
                """,
                (amount,),
            )
            conn.execute(
                """
                INSERT INTO transactions (type, description, amount, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (
                    "dispatch",
                    f'{executor_name} dispatch for "{offer_title}"',
                    -amount,
                    dispatch_time,
                ),
            )
            conn.execute(
                """
                INSERT INTO dispatch_log (
                    offer_title,
                    agent_id,
                    agent_name,
                    amount,
                    summary,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    offer_title,
                    executor_id,
                    executor_name,
                    amount,
                    settlement_line,
                    dispatch_time,
                ),
            )
            conn.execute(
                """
                UPDATE creator_state
                SET paid_requests = paid_requests + 1,
                    gross_revenue = gross_revenue + ?,
                    net_revenue = net_revenue + ?,
                    verified_revenue_pct = MIN(99, verified_revenue_pct + 0.2),
                    labels_json = ?,
                    gross_history_json = ?,
                    verified_history_json = ?,
                    settlements_json = ?
                WHERE agent_id = ?
                """,
                (
                    amount,
                    round(amount * NET_PAYOUT_SHARE, 3),
                    json.dumps(labels),
                    json.dumps(gross_history),
                    json.dumps(verified_history),
                    json.dumps(settlements),
                    executor_id,
                ),
            )
            conn.commit()

    return load_state_snapshot(config)


def sanitize_messages(raw_messages: Any) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    if not isinstance(raw_messages, list):
        return messages

    for item in raw_messages:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        content = item.get("content")
        if role not in {"user", "assistant"}:
            continue
        if not isinstance(content, str):
            continue
        text = content.strip()
        if not text:
            continue
        messages.append({"role": role, "content": text})

    return messages[-12:]


def should_filter_identity(message: str) -> bool:
    return bool(IDENTITY_REGEX.search(message))


def extract_text_from_minimax(payload: dict[str, Any]) -> str:
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        raise ValueError("MiniMax response did not include choices")

    message = choices[0].get("message", {})
    content = message.get("content", "")

    if isinstance(content, str):
        text = content.strip()
        if text:
            return text

    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
                continue
            if isinstance(part, dict) and part.get("type") == "text":
                text = part.get("text")
                if isinstance(text, str):
                    parts.append(text)
        joined = "".join(parts).strip()
        if joined:
            return joined

    raise ValueError("MiniMax response content was empty")


def call_minimax(
    settings: Settings,
    system_prompt: str,
    conversation: list[dict[str, str]],
) -> str:
    if not settings.minimax_api_key:
        raise RuntimeError("MINIMAX_API_KEY is not configured")

    payload = {
        "model": settings.minimax_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            *conversation,
        ],
        "temperature": 0.4,
    }
    req = request.Request(
        f"{settings.minimax_base_url}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.minimax_api_key}",
        },
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=60) as response:
            raw_body = response.read().decode("utf-8")
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"MiniMax HTTP {exc.code}: {body}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"MiniMax network error: {exc.reason}") from exc

    try:
        parsed = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise RuntimeError("MiniMax returned invalid JSON") from exc

    return extract_text_from_minimax(parsed)


class SynTAOsisHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self) -> None:
        if self.path == "/healthz":
            config = load_config()
            ensure_database(config)
            principal = get_principal_config(config)
            self._write_json(
                HTTPStatus.OK,
                {
                    "ok": True,
                    "service": "syntaosis-site",
                    "principal": principal.get("name", "synTAOsis Core"),
                    "minimaxConfigured": bool(load_settings().minimax_api_key),
                    "dbPath": str(DB_PATH),
                    "executors": [
                        {
                            "id": executor.get("id"),
                            "name": executor.get("name"),
                        }
                        for executor in config.get("agents", [])
                        if isinstance(executor, dict)
                    ],
                },
            )
            return

        if self.path == "/api/config":
            self._write_json(HTTPStatus.OK, load_config())
            return

        if self.path == "/api/state":
            config = load_config()
            self._write_json(HTTPStatus.OK, load_state_snapshot(config))
            return

        if self.path == "/":
            self.send_response(HTTPStatus.FOUND)
            self.send_header("Location", f"/index.html?rev={ASSET_REV}")
            self.end_headers()
            return
        return super().do_GET()

    def do_POST(self) -> None:
        if self.path not in {"/api/chat", "/api/deposit", "/api/dispatch"}:
            self._write_json(HTTPStatus.NOT_FOUND, {"error": "Unknown API route"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            content_length = 0

        try:
            raw_body = self.rfile.read(content_length).decode("utf-8")
            payload = json.loads(raw_body or "{}")
        except json.JSONDecodeError:
            self._write_json(HTTPStatus.BAD_REQUEST, {"error": "Invalid JSON body"})
            return

        config = load_config()
        ensure_database(config)

        if self.path == "/api/deposit":
            amount = payload.get("amount")
            if not isinstance(amount, (int, float)) or amount <= 0:
                self._write_json(
                    HTTPStatus.BAD_REQUEST,
                    {"error": "amount must be a positive number"},
                )
                return
            state = apply_deposit(config, float(amount))
            self._write_json(HTTPStatus.OK, {"ok": True, "state": state})
            return

        if self.path == "/api/dispatch":
            executor_id = payload.get("agentId")
            if not isinstance(executor_id, str):
                executor_id = DEFAULT_EXECUTOR_ID

            executor = get_executor_config(config, executor_id)
            request_cost = parse_tao_amount(executor.get("dashboard", {}).get("priceModel", 0))
            offer_title = payload.get("offerTitle")
            if not isinstance(offer_title, str) or not offer_title.strip():
                active_offer = load_state_snapshot(config).get("principal", {}).get("activeIntent")
                offer_title = (
                    active_offer.get("title")
                    if isinstance(active_offer, dict) and active_offer.get("title")
                    else "Active market intent"
                )

            try:
                state = apply_executor_dispatch(
                    config,
                    executor,
                    request_cost,
                    offer_title.strip(),
                )
            except ValueError as exc:
                if str(exc) == "INSUFFICIENT_TREASURY":
                    self._write_json(
                        HTTPStatus.PAYMENT_REQUIRED,
                        {
                            "error": (
                                f"Insufficient treasury for {executor.get('name', 'selected executor')}."
                            ),
                            "requiredAmount": request_cost,
                            "state": load_state_snapshot(config),
                            "agentId": executor.get("id", DEFAULT_EXECUTOR_ID),
                        },
                    )
                    return
                raise

            self._write_json(
                HTTPStatus.OK,
                {
                    "ok": True,
                    "reply": (
                        f'synTAOsis Core dispatched "{offer_title}" to '
                        f"{executor.get('name', 'selected executor')}."
                    ),
                    "offerTitle": offer_title,
                    "agentId": executor.get("id", DEFAULT_EXECUTOR_ID),
                    "state": state,
                },
            )
            return

        message = payload.get("message", "")
        if not isinstance(message, str) or not message.strip():
            self._write_json(HTTPStatus.BAD_REQUEST, {"error": "message is required"})
            return

        settings = load_settings()
        target_type = payload.get("targetType")
        if target_type not in {"principal", "executor"}:
            target_type = "executor"

        executor_id = payload.get("agentId")
        if not isinstance(executor_id, str):
            executor_id = DEFAULT_EXECUTOR_ID

        target = get_target_config(config, settings, target_type, executor_id)
        clean_message = message.strip()

        if should_filter_identity(clean_message):
            self._write_json(
                HTTPStatus.OK,
                {
                    "reply": target.get("identityReply", settings.identity_reply),
                    "filtered": True,
                    "provider": "server-filter",
                    "targetType": target_type,
                    "agentId": target.get("id"),
                    "state": load_state_snapshot(config),
                },
            )
            return

        conversation = sanitize_messages(payload.get("messages"))
        if not conversation or conversation[-1]["role"] != "user":
            conversation.append({"role": "user", "content": clean_message})

        try:
            if settings.minimax_api_key:
                reply = call_minimax(
                    settings,
                    str(target.get("systemPrompt", settings.system_prompt)),
                    conversation,
                )
                provider = "MiniMax"
                provider_error = None
            else:
                reply = (
                    "MiniMax is not configured yet, so this is the local synTAOsis mock path. "
                    "Set MINIMAX_API_KEY to proxy normal prompts through MiniMax while still "
                    "keeping provider identity questions intercepted on the server."
                )
                provider = "local-mock"
                provider_error = None
        except Exception as exc:  # noqa: BLE001
            reply = DEFAULT_PROVIDER_FALLBACK_REPLY
            provider = "local-fallback"
            provider_error = str(exc)

        self._write_json(
            HTTPStatus.OK,
            {
                "reply": reply,
                "filtered": False,
                "provider": provider,
                "providerError": provider_error,
                "targetType": target_type,
                "agentId": target.get("id"),
                "state": load_state_snapshot(config),
            },
        )

    def _write_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the synTAOsis local demo server")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port to bind")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    server = ReusableThreadingHTTPServer(("127.0.0.1", args.port), SynTAOsisHandler)
    settings = load_settings()
    print(f"synTAOsis local server running at http://127.0.0.1:{args.port}")
    print(
        "MiniMax proxy:",
        "configured" if settings.minimax_api_key else "disabled (set MINIMAX_API_KEY to enable)",
    )
    print("Serving files from:", BASE_DIR)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping synTAOsis local server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
