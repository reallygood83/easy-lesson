"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

function SettingsPage() {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const k = localStorage.getItem("ai_planner_api_key") || "";
    setKey(k);
  }, []);

  function save() {
    if (typeof window === "undefined") return;
    localStorage.setItem("ai_planner_api_key", key.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function clearKey() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("ai_planner_api_key");
    setKey("");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl md:text-2xl font-semibold text-ink mt-6">설정 · API 키</h1>
      <div className="card p-6 md:p-8 mt-4">
        <label className="block text-sm text-ink/80">Gemini API 키</label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="gk-..."
          className="mt-2 w-full rounded-md border border-ink/20 bg-white/70 px-3 py-2 text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-peach-200"
        />
        <div className="mt-3 flex gap-2">
          <button onClick={save} className="px-3 py-1.5 rounded-md bg-peach-200 text-ink hover:opacity-90">저장</button>
          <button onClick={clearKey} className="px-3 py-1.5 rounded-md bg-peach-100 text-ink/80 hover:opacity-95">삭제</button>
        </div>
        {saved && <p className="mt-2 text-sm text-ink/70">저장되었습니다. (이 키는 브라우저에만 저장됩니다)</p>}
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(SettingsPage), { ssr: false });