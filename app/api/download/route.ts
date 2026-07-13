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

    // put()은 pathname을 인코딩해 전송하지만 get()은 URL에 그대로 이어붙이므로,
    // 저장된 경로와 일치하려면 세그먼트별로 한 번 더 인코딩해야 함
    const encodedPathname = pathname.split('/').map(encodeURIComponent).join('/');
    const result = await get(encodedPathname, { access: 'private' });

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
