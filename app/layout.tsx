import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '나의 업로드 저장소',
  description: '개인용 파일 업로드 저장소',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
