"use client";
import { useRef, useState } from "react";
import { imgSrc } from "@/lib/format";

export function ImageUploader({ value, onChange, max = 20 }: { value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setErr("");
    const fd = new FormData();
    Array.from(files).slice(0, max - value.length).forEach((f) => fd.append("files", f));
    try {
      const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha no envio");
      onChange([...value, ...j.ids]);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const move = (i: number, d: number) => {
    const next = [...value];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="img-grid">
        {value.map((src, i) => (
          <div className="img-tile" key={src + i}>
            <img src={imgSrc(src)} alt="" />
            <button type="button" className="x" onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label="Remover">✕</button>
            {value.length > 1 && (
              <div className="mv">
                <button type="button" onClick={() => move(i, -1)} aria-label="Mover para a esquerda">←</button>
                <button type="button" onClick={() => move(i, 1)} aria-label="Mover para a direita">→</button>
              </div>
            )}
            {i === 0 && max > 1 && <span className="badge" style={{ position: "absolute", top: 4, left: 4, height: 20, fontSize: 10 }}>Capa</span>}
          </div>
        ))}
        {value.length < max && (
          <label className="img-add">
            {busy ? "Enviando…" : "+ Adicionar foto"}
            <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" multiple={max > 1} hidden onChange={(e) => upload(e.target.files)} />
          </label>
        )}
      </div>
      {err && <span className="small" style={{ color: "var(--bad)" }}>{err}</span>}
    </div>
  );
}
