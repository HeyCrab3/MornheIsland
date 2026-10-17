/**
 * 极简 Markdown 渲染（看板公告用）。
 *
 * 为什么不用 marked / markdown-it：
 *   · 不想为了一个公告栏加依赖；
 *   · 更重要的是**安全**——第三方渲染器默认放行原始 HTML，而这个内容来自用户自己
 *     在设置里写的东西，将来还可能被塞进 URL。这里的做法是**先整体转义 HTML，再套 Markdown**，
 *     所以 `<script>`、`<img onerror>` 这类原始 HTML 一律原样显示成文本，不会被执行。
 *
 * 支持：标题、粗体、斜体、删除线、行内代码、围栏代码块、有序/无序列表、引用、分隔线、链接、换行。
 * 不支持：原始 HTML、表格、图片语法（如需图片，用 Markdown 链接即可）。
 */

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 行内语法。入参必须是**已转义**的文本。 */
function renderInline(escaped: string): string {
  // 行内代码先抠出来，避免里面的 * _ 被当成强调
  const codes: string[] = [];
  let out = escaped.replace(/`([^`]+)`/g, (_m, code: string) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });

  // 链接：只放行 http(s)、站内绝对路径、锚点和 mailto，挡掉 javascript: 之类
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, text: string, url: string) => {
    if (!/^(https?:\/\/|\/|#|mailto:)/i.test(url)) return text;
    const safe = url.replace(/"/g, "%22");
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });

  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

  out = out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => `<code>${codes[Number(i)]}</code>`);
  return out;
}

export function renderMarkdownLite(source: string): string {
  const lines = String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];

    // 围栏代码块
    const fence = raw.match(/^\s*```(\S*)\s*$/);
    if (fence) {
      const lang = fence[1] || "";
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        body.push(escapeHtml(lines[i]));
        i++;
      }
      i++; // 跳过收尾的 ```
      html.push(
        `<pre class="md-pre"><code${lang ? ` data-lang="${escapeHtml(lang)}"` : ""}>${body.join("\n")}</code></pre>`,
      );
      continue;
    }

    // 空行
    if (!raw.trim()) {
      i++;
      continue;
    }

    // 标题
    const heading = raw.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${renderInline(escapeHtml(heading[2].trim()))}</h${level}>`);
      i++;
      continue;
    }

    // 分隔线
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(raw)) {
      html.push("<hr>");
      i++;
      continue;
    }

    // 引用（可多行）
    if (/^\s*>\s?/.test(raw)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(renderInline(escapeHtml(lines[i].replace(/^\s*>\s?/, ""))));
        i++;
      }
      html.push(`<blockquote>${buf.join("<br>")}</blockquote>`);
      continue;
    }

    // 列表（不处理嵌套，够用就行）
    const bullet = raw.match(/^\s*([-*+])\s+(.*)$/);
    const ordered = raw.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || ordered) {
      const isOrdered = !!ordered;
      const items: string[] = [];
      while (i < lines.length) {
        const m = isOrdered
          ? lines[i].match(/^\s*\d+[.)]\s+(.*)$/)
          : lines[i].match(/^\s*[-*+]\s+(.*)$/);
        if (!m) break;
        items.push(`<li>${renderInline(escapeHtml(m[1]))}</li>`);
        i++;
      }
      const tag = isOrdered ? "ol" : "ul";
      html.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    // 普通段落：连续非空行，用 <br> 连接
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*```/.test(lines[i]) &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !/^\s*([-*_])(\s*\1){2,}\s*$/.test(lines[i])
    ) {
      para.push(renderInline(escapeHtml(lines[i])));
      i++;
    }
    if (para.length) html.push(`<p>${para.join("<br>")}</p>`);
  }

  return html.join("\n");
}

export function useMarkdownLite() {
  return { renderMarkdownLite };
}
