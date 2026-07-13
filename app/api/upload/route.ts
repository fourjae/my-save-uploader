import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { accountPrefix, loginOrRegister } from '@/lib/accounts';
import { MAX_FILE_SIZE } from '@/lib/paths';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let name = '';
        let password = '';

        try {
          const data = JSON.parse(clientPayload ?? '{}');
          if (typeof data.name === 'string') name = data.name;
          if (typeof data.password === 'string') password = data.password;
        } catch {
          // 파싱 실패 시 아래 인증에서 걸러짐
        }

        if (!name || !password || !(await loginOrRegister(name, password))) {
          throw new Error('이름 또는 비밀번호가 틀렸습니다');
        }

        if (!pathname.startsWith(accountPrefix(name))) {
          throw new Error('권한 없음');
        }

        return {
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : '업로드 실패' },
      { status: 400 },
    );
  }
}
