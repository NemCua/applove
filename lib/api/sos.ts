import { createClient } from '../supabase/client';

export type SosMode = 'broadcast' | 'direct';
export type SosSessionStatus = 'active' | 'accepted' | 'ended';
export type SosResponseStatus = 'pending' | 'accepted' | 'declined';

export type SosSession = {
  id: string;
  ownerId: string;
  mode: SosMode;
  targetSpareId: string | null;
  status: SosSessionStatus;
  acceptedBy: string | null;
  createdAt: string;
  endedAt: string | null;
  endedBy: string | null;
};

export type SosResponse = {
  id: string;
  sessionId: string;
  spareId: string;
  status: SosResponseStatus;
  respondedAt: string | null;
  createdAt: string;
  spare: { id: string; display_name: string };
};

const CREATE_ERROR_MESSAGES: Record<string, string> = {
  no_spares: 'Bạn chưa có lốp nào để nhờ — thêm lốp trước đã.',
  not_your_spare: 'Người này không phải lốp của bạn.',
  target_spare_required: 'Cần chọn 1 người để nhờ.',
  invalid_mode: 'Chế độ cầu cứu không hợp lệ.',
};

const RESPOND_ERROR_MESSAGES: Record<string, string> = {
  session_not_found: 'Không tìm thấy phiên cầu cứu.',
  session_ended: 'Phiên cầu cứu này đã kết thúc.',
  not_invited: 'Bạn không được nhờ trong phiên này.',
  already_responded: 'Bạn đã phản hồi phiên này rồi.',
  already_taken_by_someone_else: 'Đã có người khác nhận giúp trước rồi.',
};

function mapKnownError(err: any, table: Record<string, string>): Error {
  const known = Object.keys(table).find((key) => err.message?.includes(key));
  return new Error(known ? table[known] : err.message ?? String(err));
}

export async function createSosSession(mode: SosMode, targetSpareId?: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('create_sos_session', {
    p_mode: mode,
    p_target_spare_id: targetSpareId ?? null,
  });
  if (error) throw mapKnownError(error, CREATE_ERROR_MESSAGES);
  return data as string;
}

export async function respondToSos(sessionId: string, accept: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('respond_to_sos', {
    p_session_id: sessionId,
    p_accept: accept,
  });
  if (error) throw mapKnownError(error, RESPOND_ERROR_MESSAGES);
}

export async function endSosSession(sessionId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('end_sos_session', { p_session_id: sessionId });
  if (error) throw error;
}

export type SosLocation = {
  sessionId: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
};

export async function updateSosLocation(sessionId: string, latitude: number, longitude: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('update_sos_location', {
    p_session_id: sessionId,
    p_lat: latitude,
    p_lng: longitude,
  });
  if (error) throw error;
}

export async function getSosLocation(sessionId: string): Promise<SosLocation | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sos_locations')
    .select('session_id, latitude, longitude, updated_at')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    sessionId: data.session_id,
    latitude: data.latitude,
    longitude: data.longitude,
    updatedAt: data.updated_at,
  };
}

export async function getSosSession(sessionId: string): Promise<SosSession | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sos_sessions')
    .select('id, owner_id, mode, target_spare_id, status, accepted_by, created_at, ended_at, ended_by')
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    ownerId: data.owner_id,
    mode: data.mode,
    targetSpareId: data.target_spare_id,
    status: data.status,
    acceptedBy: data.accepted_by,
    createdAt: data.created_at,
    endedAt: data.ended_at,
    endedBy: data.ended_by,
  };
}

export async function listSosResponses(sessionId: string): Promise<SosResponse[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sos_responses')
    .select('id, session_id, spare_id, status, responded_at, created_at, spare:profiles!sos_responses_spare_id_fkey(id, display_name)')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    sessionId: row.session_id,
    spareId: row.spare_id,
    status: row.status,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    spare: row.spare,
  }));
}

// Phiên cầu cứu đang active/accepted mà mình là owner (nếu có), để home screen
// hiện banner "đang cầu cứu" và cho vào lại màn hình sos/[sessionId].
export async function getMyActiveSosSession(): Promise<SosSession | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sos_sessions')
    .select('id, owner_id, mode, target_spare_id, status, accepted_by, created_at, ended_at, ended_by')
    .in('status', ['active', 'accepted'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    ownerId: data.owner_id,
    mode: data.mode,
    targetSpareId: data.target_spare_id,
    status: data.status,
    acceptedBy: data.accepted_by,
    createdAt: data.created_at,
    endedAt: data.ended_at,
    endedBy: data.ended_by,
  };
}

// Các phiên đang chờ mình phản hồi (mình là spare được nhờ, chưa trả lời, phiên chưa kết thúc).
export async function listIncomingSosRequests(): Promise<
  Array<{ response: SosResponse; session: SosSession; owner: { id: string; display_name: string } }>
> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('sos_responses')
    .select(
      'id, session_id, spare_id, status, responded_at, created_at, ' +
        'session:sos_sessions!inner(id, owner_id, mode, target_spare_id, status, accepted_by, created_at, ended_at, ended_by, owner:profiles!sos_sessions_owner_id_fkey(id, display_name))'
    )
    .eq('spare_id', userData.user?.id ?? '')
    .eq('status', 'pending')
    .eq('session.status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    response: {
      id: row.id,
      sessionId: row.session_id,
      spareId: row.spare_id,
      status: row.status,
      respondedAt: row.responded_at,
      createdAt: row.created_at,
      spare: { id: row.spare_id, display_name: '' },
    },
    session: {
      id: row.session.id,
      ownerId: row.session.owner_id,
      mode: row.session.mode,
      targetSpareId: row.session.target_spare_id,
      status: row.session.status,
      acceptedBy: row.session.accepted_by,
      createdAt: row.session.created_at,
      endedAt: row.session.ended_at,
      endedBy: row.session.ended_by,
    },
    owner: row.session.owner,
  }));
}
