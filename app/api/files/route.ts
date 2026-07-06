import { del, list, put } from '@vercel/blob';
import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PREFIX = 'uploads/';

function isPasswordCorrect(password: string) {
  const expected = process.env.UPLOAD_PASSWORD ?? '';
  const a = Buffer.from(password);
  const b = Buffer.from(expected);

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

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
    const password = request.nextUrl.searchParams.get('password');

    if (!password) {
      return error('비밀번호 입력해라', 401);
    }

    if (!isPasswordCorrect(password)) {
      return error('비밀번호가 틀렸습니다', 401);
    }

    const { blobs } = await list({
      prefix: PREFIX,
      limit: 100,
    });

    const files = blobs
      .sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
      )
      .map((blob) => ({
        pathname: blob.pathname,
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
      }));

    return NextResponse.json({ files });
  } catch (e) {
    console.error(e);
    return error('목록 조회 실패', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const password = formData.get('password');
    const file = formData.get('file');

    if (!password || typeof password !== 'string') {
      return error('비밀번호 입력해라', 401);
    }

    if (!isPasswordCorrect(password)) {
      return error('비밀번호가 틀렸습니다', 401);
    }

    if (!(file instanceof File)) {
      return error('파일이 없음', 400);
    }

    if (file.size > 4 * 1024 * 1024) {
      return error('파일이 너무 큼. 4MB 이하만 업로드 가능', 413);
    }

    const safeName = sanitizeFileName(file.name || 'save.dat');
    const pathname = `${PREFIX}${Date.now()}-${safeName}`;

    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60,
    });

    return NextResponse.json({ file: blob });
  } catch (e) {
    console.error(e);
    return error('업로드 실패', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, url } = body;

    if (!password || typeof password !== 'string') {
      return error('비밀번호 입력해라', 401);
    }

    if (!isPasswordCorrect(password)) {
      return error('비밀번호가 틀렸습니다', 401);
    }

    if (typeof url !== 'string' || !url) {
      return error('삭제할 파일 URL이 없음', 400);
    }

    if (!url.includes(PREFIX)) {
      return error('권한 없음', 403);
    }

    await del(url);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return error('삭제 실패', 500);
  }
}
