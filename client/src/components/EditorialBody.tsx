import { parseEditorialBody } from "@/lib/editorialBody";

export function EditorialBody({ text, className = "" }: { text?: string | null; className?: string }) {
  const blocks = parseEditorialBody(text);
  if (!blocks.length) return null;
  return (
    <div className={`max-w-[42rem] font-serif text-[1.15rem] leading-[1.85] text-[#ece6dc] ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === "h2") return <h2 key={index} className="mb-4 mt-12 font-serif text-3xl leading-tight text-white" dangerouslySetInnerHTML={{ __html: block.html }} />;
        if (block.type === "quote") return <blockquote key={index} className="my-8 border-l-2 border-[#9aacd8] pl-5 text-[1.35rem] leading-snug text-[#d5deef]" dangerouslySetInnerHTML={{ __html: block.html }} />;
        return <p key={index} className="mb-6" dangerouslySetInnerHTML={{ __html: block.html }} />;
      })}
    </div>
  );
}
