import { del, list, put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { accountPrefix, findAccount } from '@/lib/accounts';

export const runtime = 'nodejs';

const META_SUFFIX = '.meta.json';

function sanitizeFileName(name: string) {
  return name
    .replace(/[\\/]/g, '_')
    .replace(/[^a-zA-Z0-9._가-힣-]/g, '_')
    .slice(0, 120);
}

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

    if (!findAccount(name, password)) {
      return error('이름 또는 비밀번호가 틀렸습니다', 401);
    }

    const { blobs } = await list({
      prefix: accountPrefix(name),
      limit: 200,
    });

    const metaByPathname = new Map(
      blobs
        .filter((b) => b.pathname.endsWith(META_SUFFIX))
        .map((b) => [b.pathname, b]),
    );

    const fileBlobs = blobs.filter((b) => !b.pathname.endsWith(META_SUFFIX));

    const files = await Promise.all(
      fileBlobs
        .sort(
          (a, b) =>
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
        )
        .map(async (blob) => {
          const meta = metaByPathname.get(`${blob.pathname}${META_SUFFIX}`);
          let description = '';

          if (meta) {
            try {
              const res = await fetch(meta.url, { cache: 'no-store' });
              const data = await res.json();
              if (typeof data.description === 'string') {
                description = data.description;
              }
            } catch (e) {
              console.error(e);
            }
          }

          return {
            pathname: blob.pathname,
            url: blob.url,
            downloadUrl: blob.downloadUrl,
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const name = formData.get('name');
    const password = formData.get('password');
    const file = formData.get('file');
    const description = formData.get('description');

    if (typeof name !== 'string' || typeof password !== 'string' || !name || !password) {
      return error('이름과 비밀번호를 입력해라', 401);
    }

    if (!findAccount(name, password)) {
      return error('이름 또는 비밀번호가 틀렸습니다', 401);
    }

    if (!(file instanceof File)) {
      return error('파일이 없음', 400);
    }

    if (file.size > 4 * 1024 * 1024) {
      return error('파일이 너무 큼. 4MB 이하만 업로드 가능', 413);
    }

    const safeName = sanitizeFileName(file.name || 'file');
    const pathname = `${accountPrefix(name)}${Date.now()}-${safeName}`;

    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60,
    });

    if (typeof description === 'string' && description.trim()) {
      await put(
        `${pathname}${META_SUFFIX}`,
        JSON.stringify({ description: description.trim().slice(0, 500) }),
        {
          access: 'public',
          addRandomSuffix: false,
          allowOverwrite: false,
          contentType: 'application/json',
          cacheControlMaxAge: 60,
        },
      );
    }

    return NextResponse.json({ file: blob });
  } catch (e) {
    console.error(e);
    return error('업로드 실패', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, password, url, pathname } = body;

    if (typeof name !== 'string' || typeof password !== 'string' || !name || !password) {
      return error('이름과 비밀번호를 입력해라', 401);
    }

    if (!findAccount(name, password)) {
      return error('이름 또는 비밀번호가 틀렸습니다', 401);
    }

    if (typeof url !== 'string' || !url) {
      return error('삭제할 파일 URL이 없음', 400);
    }

    const prefix = accountPrefix(name);
    if (!url.includes(prefix)) {
      return error('권한 없음', 403);
    }

    await del(url);

    if (typeof pathname === 'string' && pathname) {
      const { blobs } = await list({
        prefix: `${pathname}${META_SUFFIX}`,
        limit: 1,
      });

      if (blobs[0]) {
        await del(blobs[0].url);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return error('삭제 실패', 500);
  }
}
