'use client';

import { FormEvent, useEffect, useState } from 'react';
import { MAX_FILE_SIZE, accountPrefix, sanitizeFileName } from '@/lib/paths';

type SaveFile = {
  pathname: string;
  size: number;
  uploadedAt: string;
  description: string;
};

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function fileNameFromPath(pathname: string) {
  return pathname.split('/').pop() ?? pathname;
}

function putWithProgress(
  url: string,
  file: File,
  onProgress: (percentage: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`업로드 실패 (${xhr.status})`));
    xhr.onerror = () => reject(new Error('업로드 중 네트워크 에러'));
    xhr.send(file);
  });
}

export default function Home() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<SaveFile[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('my-upload-name');
    const savedPassword = localStorage.getItem('my-upload-password');
    if (savedName) setName(savedName);
    if (savedPassword) setPassword(savedPassword);
  }, []);

  async function loadFiles(n = name, pw = password) {
    if (!n || !pw) {
      setMessage('이름과 비밀번호 입력해라');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(
        `/api/files?name=${encodeURIComponent(n)}&password=${encodeURIComponent(pw)}`,
        { cache: 'no-store' },
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || '목록 조회 실패');
        return;
      }

      localStorage.setItem('my-upload-name', n);
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

    if (!name || !password) {
      setMessage('이름과 비밀번호 입력해라');
      return;
    }

    if (!selectedFile) {
      setMessage('파일 선택해라');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setMessage('파일이 너무 큼. 100MB 이하만 업로드 가능');
      return;
    }

    setLoading(true);
    setMessage('업로드 중... 0%');

    try {
      const pathname = `${accountPrefix(name)}${Date.now()}-${sanitizeFileName(selectedFile.name || 'file')}`;

      const presignRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password, pathname }),
      });

      const presignData = await presignRes.json();

      if (!presignRes.ok) {
        setMessage(presignData.message || '업로드 실패');
        return;
      }

      await putWithProgress(presignData.presignedUrl, selectedFile, (pct) =>
        setMessage(`업로드 중... ${pct}%`),
      );

      if (description.trim()) {
        await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            password,
            pathname,
            description,
          }),
        });
      }

      setSelectedFile(null);
      setDescription('');
      setMessage('업로드 완료');
      await loadFiles(name, password);
    } catch (e) {
      console.error(e);
      setMessage(e instanceof Error && e.message ? e.message : '업로드 중 에러');
    } finally {
      setLoading(false);
    }
  }

  async function deleteFile(file: SaveFile) {
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
          name,
          password,
          pathname: file.pathname,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || '삭제 실패');
        return;
      }

      setMessage('삭제 완료');
      await loadFiles(name, password);
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
          <br />
          처음 쓰는 이름이면 입력한 비밀번호로 자동으로 새 계정이 만들어집니다.
        </p>

        <label className="label">이름</label>
        <input
          className="input"
          type="text"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="label">비밀번호</label>
        <input
          className="input"
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <form onSubmit={uploadFile} className="uploadBox">
          <label className="label">업로드 파일 (최대 100MB)</label>
          <input
            className="input"
            type="file"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />

          <label className="label">설명 (선택)</label>
          <input
            className="input"
            type="text"
            placeholder="이 파일에 대한 설명"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
              <li key={file.pathname} className="fileItem">
                <div>
                  <strong>{fileNameFromPath(file.pathname)}</strong>
                  <p>
                    {formatSize(file.size)} ·{' '}
                    {new Date(file.uploadedAt).toLocaleString()}
                  </p>
                  {file.description && <p>{file.description}</p>}
                </div>

                <div className="actions">
                  <a
                    className="linkButton"
                    href={`/api/download?name=${encodeURIComponent(name)}&password=${encodeURIComponent(password)}&pathname=${encodeURIComponent(file.pathname)}`}
                  >
                    다운로드
                  </a>
                  <button
                    className="danger"
                    type="button"
                    onClick={() => deleteFile(file)}
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
