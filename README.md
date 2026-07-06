# 나의 업로드 저장소

어디서든 파일을 업로드하고, 다른 곳에서 다시 다운로드하기 위한 개인용 파일 업로드 사이트입니다.

## 기능

- 비밀번호로 업로드/목록/삭제 보호
- Vercel Blob에 파일 저장
- 저장된 파일 목록 조회
- 다운로드
- 삭제

## 로컬 실행

```bash
npm install
cp .env.example .env.local
```

`.env.local` 파일을 열어서 비밀번호를 바꿉니다.

```env
UPLOAD_PASSWORD=니가쓸비밀번호
```

실행:

```bash
npm run dev
```

브라우저에서 접속:

```txt
http://localhost:3000
```

## Vercel 배포

1. 이 폴더를 GitHub 저장소에 업로드
2. Vercel에서 New Project → GitHub 저장소 Import
3. Vercel 프로젝트의 Storage 탭에서 Blob 생성
4. Blob Store를 이 프로젝트에 연결
5. Vercel 프로젝트 Settings → Environment Variables에 추가

```env
UPLOAD_PASSWORD=니가쓸비밀번호
```

6. Deploy

## 주의

이 예제는 Vercel Blob `public` 파일로 저장합니다.  
목록 조회/업로드/삭제는 비밀번호가 필요하지만, 다운로드 URL을 아는 사람은 파일을 받을 수 있습니다.  
개인용 소형 파일 보관 용도로만 쓰는 것을 권장합니다.

Vercel Function의 요청/응답 body 제한이 있으므로 4MB 이하 파일만 업로드하도록 제한했습니다.
