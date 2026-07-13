// 클라이언트/서버 양쪽에서 쓰는 경로 유틸. 서버 전용 코드를 넣지 말 것.

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function accountPrefix(name: string) {
  return `uploads/${encodeURIComponent(name)}/`;
}

export function sanitizeFileName(name: string) {
  return name
    .replace(/[\\/]/g, '_')
    .replace(/[^a-zA-Z0-9._가-힣-]/g, '_')
    .slice(0, 120);
}
