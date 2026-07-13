import { supabase } from '../supabase';

export async function createInviteCode(): Promise<{ code: string; expiresAt: string }> {
  const { data, error } = await supabase
    .from('invite_codes')
    .insert({})
    .select('code, expires_at')
    .single();

  if (error) throw error;
  return { code: data.code, expiresAt: data.expires_at };
}

export type RedeemResult = {
  ownerId: string;
  ownerDisplayName: string;
};

const REDEEM_ERROR_MESSAGES: Record<string, string> = {
  invite_not_found: 'Mã mời không tồn tại.',
  invite_already_used: 'Mã mời này đã được dùng rồi.',
  invite_expired: 'Mã mời đã hết hạn (quá 24 giờ).',
  cannot_redeem_own_code: 'Bạn không thể dùng mã mời của chính mình.',
};

export async function redeemInviteCode(code: string): Promise<RedeemResult> {
  const { data, error } = await supabase.rpc('redeem_invite_code', { p_code: code.trim() });

  if (error) {
    const known = Object.keys(REDEEM_ERROR_MESSAGES).find((key) => error.message.includes(key));
    throw new Error(known ? REDEEM_ERROR_MESSAGES[known] : error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Không tìm thấy chủ mã mời.');

  return { ownerId: row.result_owner_id, ownerDisplayName: row.result_owner_display_name };
}
