"""
NFL Roster Architect — Vercel Python Serverless Function
Identical logic to backend/main.py but packaged as a single ASGI handler
that Vercel routes all /api/* requests to via vercel.json rewrites.

Note: Vercel functions are stateless — the in-memory caches (_season_cache,
_depth_cache) survive within a single warm instance but reset on cold starts.
Each cold start re-fetches data from nflverse. This is expected behaviour.
"""

from __future__ import annotations

import json
import uuid

import polars as pl
from fastapi import FastAPI, HTTPException, Query, Request
from nflreadpy import load_rosters, load_depth_charts

app = FastAPI()


def _log(event: str, **kwargs) -> None:
    """Print a structured JSON log line to stdout — captured by Vercel."""
    print(json.dumps({"source": "server", "event": event, **kwargs}), flush=True)


# ---------------------------------------------------------------------------
# In-memory caches (warm-instance only — reset on cold start)
# ---------------------------------------------------------------------------
_season_cache: dict[int, pl.DataFrame] = {}
_depth_cache: dict[int, pl.DataFrame] = {}

# ---------------------------------------------------------------------------
# Historical team abbreviation mappings
# nflverse uses three distinct abbreviation schemes across history:
#   2000–2001: ARI, BAL, CLE, STL  (original)
#   2002–2015: ARZ, BLT, CLV, HST, SL  (different scheme)
#   2016+:     ARI, BAL, CLE, HOU, LA   (modern)
#
# Each entry is either:
#   (historical_abbr, last_season)              — applies from beginning through last_season
#   (historical_abbr, first_season, last_season) — applies only within the given range
# ---------------------------------------------------------------------------
_RELOCATION_MAP: dict[str, list[tuple]] = {
    # True relocations
    "LAC": [("SD",  2016)],        # San Diego Chargers through 2016
    "LV":  [("OAK", 2019)],        # Oakland Raiders through 2019
    # Rams: STL 2000-2001, then SL 2002-2015 (nflverse quirk), then LA 2016+
    "LA":  [("STL", 2001), ("SL", 2015)],
    # Teams with non-standard nflverse abbreviations in 2002-2015 only
    "ARI": [("ARZ", 2002, 2015)],  # Arizona Cardinals
    "BAL": [("BLT", 2002, 2015)],  # Baltimore Ravens
    "CLE": [("CLV", 2002, 2015)],  # Cleveland Browns
    "HOU": [("HST", 2002, 2015)],  # Houston Texans (expansion team, starts 2002)
}


def _resolve_team_abbr(team: str, season: int) -> str:
    """Return the nflverse abbreviation used for *team* in *season*."""
    for entry in _RELOCATION_MAP.get(team, []):
        if len(entry) == 3:
            historical_abbr, first_season, last_season = entry
            if first_season <= season <= last_season:
                return historical_abbr
        else:
            historical_abbr, last_season = entry
            if season <= last_season:
                return historical_abbr
    return team


def _normalize_depth_df(df: pl.DataFrame) -> pl.DataFrame:
    """Coerce varying depth-chart schemas into a canonical form with team/dt/pos_rank."""
    cols = set(df.columns)
    if "club_code" in cols and "team" not in cols:
        df = df.rename({"club_code": "team"})
    if "week" in cols and "dt" not in cols:
        df = df.with_columns(pl.col("week").cast(pl.Utf8).alias("dt")).drop("week")
    if "depth_team" in cols and "pos_rank" not in cols:
        df = df.rename({"depth_team": "pos_rank"})
    return df


def _get_depth_df(season: int) -> pl.DataFrame | None:
    if season < 2001:
        return None
    if season not in _depth_cache:
        try:
            df = load_depth_charts(seasons=season)
            _depth_cache[season] = _normalize_depth_df(df)
        except Exception:
            return None
    return _depth_cache[season]


def _get_season_df(season: int) -> pl.DataFrame:
    if season not in _season_cache:
        try:
            df = load_rosters(seasons=season)
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to load roster data for {season}: {exc}",
            ) from exc
        _season_cache[season] = df
    return _season_cache[season]


# ---------------------------------------------------------------------------
# Player mapping
# ---------------------------------------------------------------------------

def _build_stats_summary(row: dict) -> str:
    parts: list[str] = []
    if row.get("height"):
        parts.append(f"Ht: {row['height']}")
    if row.get("weight"):
        parts.append(f"Wt: {row['weight']} lbs")
    if row.get("college"):
        parts.append(f"College: {row['college']}")
    if row.get("years_exp") is not None:
        parts.append(f"Exp: {row['years_exp']} yr(s)")
    return " | ".join(parts) or "No additional data"


def _row_to_player(row: dict, season: int) -> dict:
    team = row.get("team") or "N/A"
    gsis_id = row.get("gsis_id") or ""
    full_name = row.get("full_name") or row.get("player_name") or "Unknown"
    position = row.get("position") or row.get("depth_chart_position") or "N/A"
    return {
        "id": f"{season}-{team}-{gsis_id or full_name}-{uuid.uuid4().hex[:6]}",
        "name": full_name,
        "position": position,
        "team": team,
        "year": season,
        "jerseyNumber": row.get("jersey_number"),
        "gamesPlayed": 0,
        "statsSummary": _build_stats_summary(row),
        "headshotUrl": row.get("headshot_url"),
        "status": row.get("status"),
        "depthRank": row.get("pos_rank"),
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/rosters")
def get_roster(
    season: int = Query(..., ge=2000, le=2025),
    team: str = Query(..., min_length=2, max_length=3),
):
    cache_hit = season in _season_cache
    team_upper = _resolve_team_abbr(team.upper(), season)

    try:
        df = _get_season_df(season)
    except HTTPException as exc:
        _log("roster_fetch_failed", team=team_upper, season=season, status=exc.status_code)
        raise

    filtered = df.filter(pl.col("team") == team_upper)

    if filtered.is_empty():
        available = sorted(df["team"].drop_nulls().unique().to_list())
        _log("roster_not_found", team=team_upper, season=season, available_count=len(available))
        raise HTTPException(
            status_code=404,
            detail={
                "message": f"No players found for team '{team_upper}' in {season}.",
                "available_teams": available,
            },
        )

    depth_df = _get_depth_df(season)
    if depth_df is not None and not depth_df.is_empty():
        team_depth = depth_df.filter(pl.col("team") == team_upper)
        if not team_depth.is_empty():
            team_depth = (
                team_depth
                .sort("dt")
                .group_by("gsis_id")
                .last()
                .select(["gsis_id", "pos_rank"])
            )
            filtered = filtered.join(team_depth, on="gsis_id", how="left")
        else:
            filtered = filtered.with_columns(pl.lit(None).cast(pl.Int64).alias("pos_rank"))
    else:
        filtered = filtered.with_columns(pl.lit(None).cast(pl.Int64).alias("pos_rank"))

    filtered = filtered.sort(
        ["pos_rank", "years_exp"],
        descending=[False, True],
        nulls_last=True,
    )

    players = [_row_to_player(row, season) for row in filtered.to_dicts()]
    _log("roster_fetched", team=team_upper, season=season, count=len(players), cache_hit=cache_hit)
    return {"season": season, "team": team_upper, "count": len(players), "players": players}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/log")
async def client_log(request: Request):
    """Receive structured log events from the frontend and print to stdout."""
    try:
        body = await request.json()
        if isinstance(body, dict):
            print(json.dumps({"source": "client", **body}), flush=True)
    except Exception:
        pass
    return {"ok": True}
