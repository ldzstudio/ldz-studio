import { ContentForm } from "./form";
import { getSettings } from "@/lib/settings";

export default async function AdminContent() {
  const s = await getSettings();
  return (
    <>
      <div className="adm-top">
        <h1>Conteúdo do site</h1>
        <a href="/" target="_blank" className="btn ghost sm">Ver loja ↗</a>
      </div>
      <ContentForm initial={s} />
    </>
  );
}
