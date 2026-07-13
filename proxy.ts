import { type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Loại api/ ra khỏi proxy: các API route (như webhook nhận từ Supabase) không
  // có session đăng nhập, không được redirect về /login. Chúng tự xác thực bằng
  // secret riêng.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
