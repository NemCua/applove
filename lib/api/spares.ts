import { supabase } from '../supabase';

export type SpareProfile = {
  id: string;
  display_name: string;
};

export type MySpare = {
  relationshipId: string;
  spare: SpareProfile;
  createdAt: string;
};

export type OwnerOfMe = {
  relationshipId: string;
  owner: SpareProfile;
  createdAt: string;
};

// Những người mình đã thêm làm lốp (mình là owner)
export async function listMySpares(): Promise<MySpare[]> {
  const { data, error } = await supabase
    .from('spare_relationships')
    .select('id, created_at, spare:profiles!spare_relationships_spare_id_fkey(id, display_name)')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    relationshipId: row.id,
    spare: row.spare,
    createdAt: row.created_at,
  }));
}

// Những người mà mình là lốp của họ (mình là spare)
export async function listOwnersOfMe(): Promise<OwnerOfMe[]> {
  const { data, error } = await supabase
    .from('spare_relationships')
    .select('id, created_at, owner:profiles!spare_relationships_owner_id_fkey(id, display_name)')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    relationshipId: row.id,
    owner: row.owner,
    createdAt: row.created_at,
  }));
}

export async function removeSpareRelationship(relationshipId: string) {
  const { error } = await supabase.from('spare_relationships').delete().eq('id', relationshipId);
  if (error) throw error;
}
