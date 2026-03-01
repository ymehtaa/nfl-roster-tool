import { supabase } from '../lib/supabaseClient';

// ── Roster shares ────────────────────────────────────────────────────────────

export async function createShare(name, players, creatorUserId = null) {
  const { data, error } = await supabase
    .from('shared_rosters')
    .insert({ name, players, creator_user_id: creatorUserId })
    .select('share_id')
    .single();
  if (error) throw error;
  return data.share_id;
}

export async function fetchShare(shareId) {
  const { data, error } = await supabase
    .from('shared_rosters')
    .select('name, players')
    .eq('share_id', shareId)
    .single();
  if (error) throw error;
  return data; // { name, players }
}

// ── Comparison shares ────────────────────────────────────────────────────────

export async function createComparisonShare(name, left, right, creatorUserId = null) {
  const { data, error } = await supabase
    .from('shared_comparisons')
    .insert({ name, left_data: left, right_data: right, creator_user_id: creatorUserId })
    .select('share_id')
    .single();
  if (error) throw error;
  return data.share_id;
}

export async function fetchComparisonShare(shareId) {
  const { data, error } = await supabase
    .from('shared_comparisons')
    .select('name, left_data, right_data')
    .eq('share_id', shareId)
    .single();
  if (error) throw error;
  return { name: data.name, left: data.left_data, right: data.right_data };
}
