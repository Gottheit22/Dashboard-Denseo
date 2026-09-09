'use client';
import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';

const STORAGE_KEY = 'wd_unlocked';

export default function PasscodeGate({ children }) {
  const required = process.env.NEXT_PUBLIC_APP_PASSCODE;
  const [unlocked, setUnlocked] = useState(!required);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!required) return;
    if (typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === required) {
      setUnlocked(true);
    }
  }, [required]);

  if (unlocked) return children;

  function submit(e) {
    e.preventDefault();
    if (input === required) {
      sessionStorage.setItem(STORAGE_KEY, input);
      setUnlocked(true);
    } else {
      setError(true);
    }
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#F7F8F6]">
      <form onSubmit={submit} className="bg-white border border-[#E2E5E0] rounded-2xl p-6 w-full max-w-xs flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[#1C2530]">
          <Lock className="w-4 h-4" />
          <span className="text-[14px] font-semibold">Zugangscode</span>
        </div>
        <input
          type="password"
          autoFocus
          className="w-full border border-[#DCE0DA] rounded-lg px-3 py-2 text-[13px]"
          value={input}
          onChange={e => { setInput(e.target.value); setError(false); }}
          placeholder="Code eingeben"
        />
        {error && <span className="text-[12px] text-[#C1553A]">Falscher Code, bitte erneut versuchen.</span>}
        <button type="submit" className="bg-[#1C2530] text-white text-[13px] font-medium py-2 rounded-lg hover:bg-[#2A3644]">
          Öffnen
        </button>
      </form>
    </div>
  );
}
