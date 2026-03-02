import { supabase } from '../lib/supabaseClient';
import { log } from './logService';
import { track } from '@vercel/analytics';

// ── Roster shares ────────────────────────────────────────────────────────────

export async function createShare(name, players, creatorUserId = null) {
  const { data, error } = await supabase
    .from('shared_rosters')
    .insert({ name, players, creator_user_id: creatorUserId })
    .select('share_id')
    .single();
  if (error) {
    log('roster_share_create_failed', { name, count: players.length, error: error.message });
    throw error;
  }
  log('roster_share_created', { shareId: data.share_id, name, count: players.length, userId: creatorUserId });
  track('roster_share_created', { count: players.length });
  return data.share_id;
}

export async function fetchShare(shareId) {
  const { data, error } = await supabase
    .from('shared_rosters')
    .select('name, players')
    .eq('share_id', shareId)
    .single();
  if (error) {
    log('roster_share_fetch_failed', { shareId, error: error.message });
    throw error;
  }
  log('roster_share_fetched', { shareId, name: data.name, count: data.players?.length });
  return data; // { name, players }
}

// ── Comparison shares ────────────────────────────────────────────────────────

export async function createComparisonShare(name, left, right, creatorUserId = null) {
  const { data, error } = await supabase
    .from('shared_comparisons')
    .insert({ name, left_data: left, right_data: right, creator_user_id: creatorUserId })
    .select('share_id')
    .single();
  if (error) {
    log('comparison_share_create_failed', { name, error: error.message });
    throw error;
  }
  log('comparison_share_created', { shareId: data.share_id, name, userId: creatorUserId });
  track('comparison_share_created');
  return data.share_id;
}

export async function fetchComparisonShare(shareId) {
  const { data, error } = await supabase
    .from('shared_comparisons')
    .select('name, left_data, right_data')
    .eq('share_id', shareId)
    .single();
  if (error) {
    log('comparison_share_fetch_failed', { shareId, error: error.message });
    throw error;
  }
  log('comparison_share_fetched', { shareId, name: data.name });
  return { name: data.name, left: data.left_data, right: data.right_data };
}
