import { Fragment } from "react";

// The approved piece uses paragraphs, Markdown headings and bold emphasis.
// React escapes text; no HTML from the article is executed.
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : <Fragment key={index}>{part}</Fragment>
  );
}

export default function ManualEditorialBody({ content }: { content: string }) {
  return <div className="flex flex-col gap-4 text-base leading-[1.6] text-slate-800">{
    content.split(/\r?\n\s*\r?\n/).filter((block) => block.trim()).map((block, index) => {
      const heading = block.match(/^(#{1,6})[ \t]+([^\r\n]+)$/);
      if (heading) {
        const Heading = `h${heading[1].length}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
        return <Heading key={index} className="mt-1 first:mt-0 text-2xl font-black text-brand">{inline(heading[2])}</Heading>;
      }
      return <p key={index} className="whitespace-pre-wrap">{inline(block)}</p>;
    })
  }</div>;
}
