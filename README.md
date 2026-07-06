# 나의 업로드 저장소

어디서든 파일을 업로드하고, 다른 곳에서 다시 다운로드하기 위한 개인용 파일 업로드 사이트입니다.

## 기능

- 이름 + 비밀번호로 계정별 업로드/목록/삭제 보호 (계정마다 파일 공간 분리)
- 파일 업로드 시 설명(description) 함께 저장
- Vercel Blob에 파일 저장
- 저장된 파일 목록 조회
- 다운로드
- 삭제
- 관리자 페이지(`/admin`)에서 계정/비밀번호 목록 조회 (비밀번호 잊었을 때 확인용)

## 로컬 실행

```bash
npm install
cp .env.example .env.local
```

`.env.local` 파일을 열어서 계정과 관리자 비밀번호를 바꿉니다.

```env
USER_ACCOUNTS=[{"name":"me","password":"니가쓸비밀번호"},{"name":"friend","password":"친구비밀번호"}]
ADMIN_PASSWORD=관리자비밀번호
```

계정은 `USER_ACCOUNTS`에 `{name, password}` 목록으로 원하는 만큼 추가/삭제할 수 있습니다.

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
USER_ACCOUNTS=[{"name":"me","password":"니가쓸비밀번호"},{"name":"friend","password":"친구비밀번호"}]
ADMIN_PASSWORD=관리자비밀번호
```

6. Deploy

## 관리자 페이지

`/admin`에서 관리자 비밀번호(`ADMIN_PASSWORD`)를 입력하면 등록된 계정 이름과 비밀번호 목록을 볼 수 있습니다.  
비밀번호를 잊었을 때 여기서 확인하면 됩니다. (계정 자체를 추가/삭제하려면 여전히 `USER_ACCOUNTS` 환경변수를 직접 수정해야 합니다.)

## 주의

이 예제는 Vercel Blob `public` 파일로 저장합니다.  
목록 조회/업로드/삭제는 이름+비밀번호가 필요하지만, 다운로드 URL을 아는 사람은 파일을 받을 수 있습니다.  
개인용 소형 파일 보관 용도로만 쓰는 것을 권장합니다.

Vercel Function의 요청/응답 body 제한이 있으므로 4MB 이하 파일만 업로드하도록 제한했습니다.
