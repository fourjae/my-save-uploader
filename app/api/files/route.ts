import { del, get, list, put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { accountPrefix, loginOrRegister } from '@/lib/accounts';

export const runtime = 'nodejs';

const META_SUFFIX = '.meta.json';

function error(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get('name');
    const password = request.nextUrl.searchParams.get('password');

    if (!name || !password) {
      return error('이름과 비밀번호를 입력해라', 401);
    }

    if (!(await loginOrRegister(name, password))) {
      return error('이름 또는 비밀번호가 틀렸습니다', 401);
    }

    const { blobs } = await list({
      prefix: accountPrefix(name),
      limit: 200,
    });

    const metaPathnames = new Set(
      blobs.filter((b) => b.pathname.endsWith(META_SUFFIX)).map((b) => b.pathname),
    );

    const fileBlobs = blobs.filter((b) => !b.pathname.endsWith(META_SUFFIX));

    const files = await Promise.all(
      fileBlobs
        .sort(
          (a, b) =>
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
        )
        .map(async (blob) => {
          let description = '';
          const metaPathname = `${blob.pathname}${META_SUFFIX}`;

          if (metaPathnames.has(metaPathname)) {
            try {
              const meta = await get(
                metaPathname.split('/').map(encodeURIComponent).join('/'),
                { access: 'private' },
              );
              if (meta) {
                const data = JSON.parse(await new Response(meta.stream).text());
                if (typeof data.description === 'string') {
                  description = data.description;
                }
              }
            } catch (e) {
              console.error(e);
            }
          }

          return {
            pathname: blob.pathname,
            size: blob.size,
            uploadedAt: blob.uploadedAt,
            description,
          };
        }),
    );

    return NextResponse.json({ files });
  } catch (e) {
    console.error(e);
    return error('목록 조회 실패', 500);
  }
}

// 파일 본체는 /api/upload(클라이언트 업로드)로 올라가고, 여기선 설명 메타만 저장
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, password, pathname, description } = body;

    if (typeof name !== 'string' || typeof password !== 'string' || !name || !password) {
      return error('이름과 비밀번호를 입력해라', 401);
    }

    if (!(await loginOrRegister(name, password))) {
      return error('이름 또는 비밀번호가 틀렸습니다', 401);
    }

    if (typeof pathname !== 'string' || !pathname.startsWith(accountPrefix(name))) {
      return error('권한 없음', 403);
    }

    if (typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ ok: true });
    }

    await put(
      `${pathname}${META_SUFFIX}`,
      JSON.stringify({ description: description.trim().slice(0, 500) }),
      {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      },
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return error('설명 저장 실패', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, password, pathname } = body;

    if (typeof name !== 'string' || typeof password !== 'string' || !name || !password) {
      return error('이름과 비밀번호를 입력해라', 401);
    }

    if (!(await loginOrRegister(name, password))) {
      return error('이름 또는 비밀번호가 틀렸습니다', 401);
    }

    if (typeof pathname !== 'string' || !pathname) {
      return error('삭제할 파일이 없음', 400);
    }

    if (!pathname.startsWith(accountPrefix(name))) {
      return error('권한 없음', 403);
    }

    await del([pathname, `${pathname}${META_SUFFIX}`]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return error('삭제 실패', 500);
  }
}
