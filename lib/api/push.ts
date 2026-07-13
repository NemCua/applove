import { createClient } from '../supabase/client';

export async function saveMyPushSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const myId = userData.user?.id;
  if (!myId || !subscription.endpoint || !subscription.keys) return;

  const { error } = await supabase.from('push_tokens').upsert({
    profile_id: myId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}
