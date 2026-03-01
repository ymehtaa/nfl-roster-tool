import { supabase } from '../lib/supabaseClient';

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
