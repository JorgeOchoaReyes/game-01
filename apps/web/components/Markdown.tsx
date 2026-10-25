import { Fragment } from "react";

// Just enough Markdown for the practices page: #/## headings, - lists,
// `code` and **bold**. The source is our own text, not user input.
function inline(text: string) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**")) return <b key={i}>{part.slice(2, -2)}</b>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function Markdown({ source }: { source: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={blocks.length}>{list.map((li, i) => <li key={i}>{inline(li)}</li>)}</ul>);
    list = [];
  };
  for (const line of source.split("\n")) {
    if (line.startsWith("- ")) { list.push(line.slice(2)); continue; }
    if (line.startsWith("  ") && list.length) { list[list.length - 1] += " " + line.trim(); continue; }
    flush();
    if (line.startsWith("## ")) blocks.push(<h2 key={blocks.length}>{inline(line.slice(3))}</h2>);
    else if (line.startsWith("# ")) blocks.push(<h1 key={blocks.length}>{inline(line.slice(2))}</h1>);
    else if (line.trim()) blocks.push(<p key={blocks.length}>{inline(line)}</p>);
  }
  flush();
  return <>{blocks}</>;
}
