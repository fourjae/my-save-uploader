import { get } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { accountPrefix, loginOrRegister } from '@/lib/accounts';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get('name');
    const password = request.nextUrl.searchParams.get('password');
    const pathname = request.nextUrl.searchParams.get('pathname');

    if (!name || !password) {
      return NextResponse.json({ message: '이름과 비밀번호를 입력해라' }, { status: 401 });
    }

    if (!(await loginOrRegister(name, password))) {
      return NextResponse.json({ message: '이름 또는 비밀번호가 틀렸습니다' }, { status: 401 });
    }

    if (!pathname || !pathname.startsWith(accountPrefix(name))) {
      return NextResponse.json({ message: '권한 없음' }, { status: 403 });
    }

    const result = await get(pathname, { access: 'private' });

    if (!result) {
      return NextResponse.json({ message: '파일이 없음' }, { status: 404 });
    }

    const fileName = pathname.split('/').pop() ?? 'file';

    return new NextResponse(result.stream, {
      headers: {
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Type':
          result.headers.get('content-type') ?? 'application/octet-stream',
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: '다운로드 실패' }, { status: 500 });
  }
}
