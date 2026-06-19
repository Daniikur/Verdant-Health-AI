import React from "react";

// Minimal markdown renderer (headings, bold, lists, paragraphs)
export default function Markdown({ content }) {
  if (!content) return null;
  const lines = content.split("\n");
  const out = [];
  let listBuf = [];
  const flushList = (key) => {
    if (listBuf.length) {
      out.push(
        <ul key={`ul-${key}`} className="list-disc pl-5 space-y-1 my-2 text-sm">
          {listBuf.map((t, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(t) }} />)}
        </ul>
      );
      listBuf = [];
    }
  };
  const inline = (s) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, '<code class="bg-secondary px-1 rounded">$1</code>');

  lines.forEach((line, i) => {
    if (line.startsWith("## ")) {
      flushList(i);
      out.push(<h3 key={i} className="font-display text-lg font-medium mt-3 mb-1">{line.slice(3)}</h3>);
    } else if (line.startsWith("# ")) {
      flushList(i);
      out.push(<h2 key={i} className="font-display text-xl font-medium mt-3 mb-1">{line.slice(2)}</h2>);
    } else if (line.match(/^[-*]\s+/)) {
      listBuf.push(line.replace(/^[-*]\s+/, ""));
    } else if (line.trim() === "") {
      flushList(i);
    } else {
      flushList(i);
      out.push(<p key={i} className="text-sm leading-relaxed my-1" dangerouslySetInnerHTML={{ __html: inline(line) }} />);
    }
  });
  flushList("end");
  return <div className="markdown">{out}</div>;
}
