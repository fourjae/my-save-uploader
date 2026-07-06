'use client';

import { FormEvent, useEffect, useState } from 'react';

type SaveFile = {
  pathname: string;
  url: string;
  downloadUrl: string;
  size: number;
  uploadedAt: string;
};

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function fileNameFromPath(pathname: string) {
  return pathname.split('/').pop() ?? pathname;
}

export default function Home() {
  const [password, setPassword] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [files, setFiles] = useState<SaveFile[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedPassword = localStorage.getItem('my-upload-password');
    if (savedPassword) {
      setPassword(savedPassword);
    }
  }, []);

  async function loadFiles(pw = password) {
    if (!pw) {
      setMessage('비밀번호 입력해라');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(`/api/files?password=${encodeURIComponent(pw)}`, {
        cache: 'no-store',
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || '목록 조회 실패');
        return;
      }

      localStorage.setItem('my-upload-password', pw);
      setFiles(data.files);
      setMessage(`파일 ${data.files.length}개 조회됨`);
    } catch (e) {
      console.error(e);
      setMessage('목록 조회 중 에러');
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!password) {
      setMessage('비밀번호 입력해라');
      return;
    }

    if (!selectedFile) {
      setMessage('파일 선택해라');
      return;
    }

    const formData = new FormData();
    formData.append('password', password);
    formData.append('file', selectedFile);

    setLoading(true);
    setMessage('업로드 중...');

    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || '업로드 실패');
        return;
      }

      setSelectedFile(null);
      setMessage('업로드 완료');
      await loadFiles(password);
    } catch (e) {
      console.error(e);
      setMessage('업로드 중 에러');
    } finally {
      setLoading(false);
    }
  }

  async function deleteFile(url: string) {
    const ok = confirm('진짜 삭제할거임?');
    if (!ok) return;

    setLoading(true);
    setMessage('삭제 중...');

    try {
      const res = await fetch('/api/files', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          url,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || '삭제 실패');
        return;
      }

      setMessage('삭제 완료');
      await loadFiles(password);
    } catch (e) {
      console.error(e);
      setMessage('삭제 중 에러');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <section className="card">
        <h1>나의 업로드 저장소</h1>
        <p className="sub">
          어디서든 파일 올리고, 어디서든 다시 받는 나만의 저장소.
        </p>

        <label className="label">비밀번호</label>
        <input
          className="input"
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <form onSubmit={uploadFile} className="uploadBox">
          <label className="label">업로드 파일</label>
          <input
            className="input"
            type="file"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />

          <button className="button" type="submit" disabled={loading}>
            업로드
          </button>
        </form>

        <button
          className="button secondary"
          type="button"
          onClick={() => loadFiles()}
          disabled={loading}
        >
          목록 새로고침
        </button>

        {message && <p className="message">{message}</p>}
      </section>

      <section className="card">
        <h2>저장된 파일</h2>

        {files.length === 0 ? (
          <p className="empty">아직 파일 없음</p>
        ) : (
          <ul className="fileList">
            {files.map((file) => (
              <li key={file.url} className="fileItem">
                <div>
                  <strong>{fileNameFromPath(file.pathname)}</strong>
                  <p>
                    {formatSize(file.size)} ·{' '}
                    {new Date(file.uploadedAt).toLocaleString()}
                  </p>
                </div>

                <div className="actions">
                  <a className="linkButton" href={file.downloadUrl}>
                    다운로드
                  </a>
                  <button
                    className="danger"
                    type="button"
                    onClick={() => deleteFile(file.url)}
                    disabled={loading}
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
