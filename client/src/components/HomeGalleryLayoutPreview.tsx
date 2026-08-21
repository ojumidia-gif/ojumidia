const galleryFrames = [
  "aspect-[4/5]",
  "aspect-[4/3]",
  "aspect-[16/10]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-[16/10]",
  "aspect-[4/5]",
];

export function HomeGalleryLayoutPreview() {
  return <section className="border-b border-dashed border-[#806817]/40 bg-[#fff8e5]" aria-label="Prévia técnica da galeria de fotografias"><div className="container py-10 sm:py-14"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="editorial-kicker">Prévia técnica temporária</p><h2 className="mt-2 font-serif text-3xl tracking-tight">Galeria de fotografia em escala</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#655e52]">Estas molduras não são matérias nem imagens do acervo. Elas existem apenas para validar a grade, as proporções e a leitura visual enquanto os conteúdos reais ainda não foram publicados.</p></div><span className="rounded-full border border-[#806817]/30 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#806817]">Apenas para teste local</span></div><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{galleryFrames.map((frame, index) => <div key={index} className={`relative overflow-hidden rounded-xl border border-[#242017]/10 bg-[#e8e3d6] ${frame}`}><div className={`absolute inset-0 opacity-80 ${index % 3 === 0 ? "bg-[radial-gradient(circle_at_20%_20%,#d5b353,transparent_35%),linear-gradient(135deg,#262117,#806817)]" : index % 3 === 1 ? "bg-[linear-gradient(135deg,#c8c0ad,#f5ebd0_45%,#8c7751)]" : "bg-[radial-gradient(circle_at_80%_25%,#f6d978,transparent_24%),linear-gradient(135deg,#343126,#b7a17a)]"}`} /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-4 pb-3 pt-10"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-white/90">Moldura de foto {String(index + 1).padStart(2, "0")}</p></div></div>)}</div></div></section>;
}
