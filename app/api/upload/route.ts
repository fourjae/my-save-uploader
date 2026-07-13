import { issueSignedToken, presignUrl } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { accountPrefix, loginOrRegister } from '@/lib/accounts';
import { MAX_FILE_SIZE } from '@/lib/paths';

export const runtime = 'nodejs';

// 파일 본체가 서버 함수를 거치지 않도록, 인증 후 10분짜리
// 업로드 전용 presigned URL을 발급한다 (OIDC 인증이라 RW 토큰 불필요)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, password, pathname } = body;

    if (typeof name !== 'string' || typeof password !== 'string' || !name || !password) {
      return NextResponse.json({ message: '이름과 비밀번호를 입력해라' }, { status: 401 });
    }

    if (!(await loginOrRegister(name, password))) {
      return NextResponse.json({ message: '이름 또는 비밀번호가 틀렸습니다' }, { status: 401 });
    }

    if (typeof pathname !== 'string' || !pathname.startsWith(accountPrefix(name))) {
      return NextResponse.json({ message: '권한 없음' }, { status: 403 });
    }

    // delegation에 pathname을 넣으면 서버가 %문자를 디코딩해 저장해서
    // 한글 계정 경로와 불일치(403)함. 와일드카드로 발급하되 실제 서명은
    // 아래 presignUrl에서 정확한 pathname에 고정되므로 클라이언트는
    // 다른 경로에 업로드할 수 없음(clientSigningToken은 서버 밖으로 안 나감).
    const signedToken = await issueSignedToken({
      pathname: '*',
      operations: ['put'],
      maximumSizeInBytes: MAX_FILE_SIZE,
      validUntil: Date.now() + 10 * 60 * 1000,
    });

    const { presignedUrl } = await presignUrl(signedToken, {
      operation: 'put',
      pathname,
      access: 'private',
      maximumSizeInBytes: MAX_FILE_SIZE,
      addRandomSuffix: false,
      allowOverwrite: false,
    });

    return NextResponse.json({ presignedUrl });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: '업로드 준비 실패' }, { status: 500 });
  }
}
