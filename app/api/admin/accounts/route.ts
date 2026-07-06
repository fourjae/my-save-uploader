import { NextRequest, NextResponse } from 'next/server';
import { getAccounts } from '@/lib/accounts';
import { safeEqual } from '@/lib/password';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const password = request.nextUrl.searchParams.get('password');
  const expected = process.env.ADMIN_PASSWORD ?? '';

  if (!password || !expected || !safeEqual(password, expected)) {
    return NextResponse.json({ message: '관리자 비밀번호가 틀렸습니다' }, { status: 401 });
  }

  return NextResponse.json({ accounts: getAccounts() });
}
