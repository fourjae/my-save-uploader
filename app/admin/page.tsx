'use client';

import { FormEvent, useState } from 'react';

type Account = {
  name: string;
  password: string;
};

export default function AdminPage() {
  const [adminPassword, setAdminPassword] = useState('');
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadAccounts(e: FormEvent) {
    e.preventDefault();

    if (!adminPassword) {
      setMessage('관리자 비밀번호 입력해라');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch(
        `/api/admin/accounts?password=${encodeURIComponent(adminPassword)}`,
        { cache: 'no-store' },
      );
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || '조회 실패');
        setAccounts(null);
        return;
      }

      setAccounts(data.accounts);
      setRevealed(new Set());
    } catch (err) {
      console.error(err);
      setMessage('조회 중 에러');
    } finally {
      setLoading(false);
    }
  }

  function toggleReveal(index: number) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <main className="container">
      <section className="card">
        <h1>관리자</h1>
        <p className="sub">등록된 계정과 비밀번호를 확인합니다.</p>

        <form onSubmit={loadAccounts}>
          <label className="label">관리자 비밀번호</label>
          <input
            className="input"
            type="password"
            placeholder="관리자 비밀번호"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
          />

          <button className="button" type="submit" disabled={loading}>
            확인
          </button>
        </form>

        {message && <p className="message">{message}</p>}
      </section>

      {accounts && (
        <section className="card">
          <h2>계정 목록</h2>

          {accounts.length === 0 ? (
            <p className="empty">등록된 계정이 없음</p>
          ) : (
            <ul className="fileList">
              {accounts.map((account, index) => (
                <li key={account.name} className="fileItem">
                  <div>
                    <strong>{account.name}</strong>
                    <p>{revealed.has(index) ? account.password : '••••••••'}</p>
                  </div>

                  <div className="actions">
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => toggleReveal(index)}
                    >
                      {revealed.has(index) ? '숨기기' : '보기'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
