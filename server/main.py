"""
NFL Roster Architect — Python backend
Uses nflreadpy.load_rosters() to serve roster data via a FastAPI REST endpoint.
"""

from __future__ import annotations

import uuid
from functools import lru_cache

import polars as pl
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from nflreadpy import load_rosters, load_depth_charts

app = FastAPI(title="NFL Roster Architect API")

# Allow the Vite dev server (and any local origin) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-memory season cache — load_rosters() makes a network call, so we cache
# the raw Polars DataFrame per season to avoid redundant fetches.
# ---------------------------------------------------------------------------
_season_cache: dict[int, pl.DataFrame] = {}
_depth_cache: dict[int, pl.DataFrame] = {}


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
    """Return the depth chart DataFrame for `season`, or None if unavailable."""
    if season < 2001:          # nflreadpy depth charts start at 2001
        return None
    if season not in _depth_cache:
        try:
            df = load_depth_charts(seasons=season)
            _depth_cache[season] = _normalize_depth_df(df)
        except Exception:
            return None        # Soft-fail — ordering degrades gracefully
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
    position = row.get("dc_position") or row.get("depth_chart_position") or row.get("position") or "N/A"
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
    season: int = Query(..., ge=2000, le=2025, description="NFL season year"),
    team: str = Query(..., min_length=2, max_length=3, description="Team abbreviation, e.g. NE"),
):
    """Return the roster for a given season and team as a list of Player objects."""
    df = _get_season_df(season)

    team_upper = team.upper()
    filtered = df.filter(pl.col("team") == team_upper)

    if filtered.is_empty():
        # Surface the distinct teams present so the caller can debug abbreviation mismatches.
        available = sorted(df["team"].drop_nulls().unique().to_list())
        raise HTTPException(
            status_code=404,
            detail={
                "message": f"No players found for team '{team_upper}' in {season}.",
                "available_teams": available,
            },
        )

    # Attempt depth chart join
    depth_df = _get_depth_df(season)
    if depth_df is not None and not depth_df.is_empty():
        team_depth = depth_df.filter(pl.col("team") == team_upper)
        if not team_depth.is_empty():
            # Keep only the latest snapshot per player (depth data can be weekly)
            dc_select_cols = ["gsis_id", "pos_rank"]
            if "position" in team_depth.columns:
                dc_select_cols.append("position")
            team_depth = (
                team_depth
                .sort("dt")
                .group_by("gsis_id")
                .last()
                .select(dc_select_cols)
            )
            if "position" in team_depth.columns:
                team_depth = team_depth.rename({"position": "dc_position"})
            filtered = filtered.join(team_depth, on="gsis_id", how="left")
        else:
            filtered = filtered.with_columns(pl.lit(None).cast(pl.Int64).alias("pos_rank"))
    else:
        filtered = filtered.with_columns(pl.lit(None).cast(pl.Int64).alias("pos_rank"))

    # Sort: starters (rank 1) first, then ascending rank, nulls last; tiebreak by years_exp desc
    filtered = filtered.sort(
        ["pos_rank", "years_exp"],
        descending=[False, True],
        nulls_last=True,
    )

    players = [_row_to_player(row, season) for row in filtered.to_dicts()]

    return {
        "season": season,
        "team": team_upper,
        "count": len(players),
        "players": players,
    }


@app.get("/api/health")
def health():
    return {"status": "ok"}
