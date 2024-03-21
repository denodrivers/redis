import { dirname, join } from "node:path";
import type { RenderOptions } from "https://deno.land/x/gfm@0.3.0/mod.ts";
import { CSS, render, Renderer } from "https://deno.land/x/gfm@0.3.0/mod.ts";

function normalizeHref(href: string): string {
  const isAbsoluteURL = URL.canParse(href);
  if (isAbsoluteURL) return href;

  href = href.endsWith("/README.md")
    ? href.replace(/\/README\.md$/, "/index.html")
    : href;
  href = href.endsWith(".md") ? href.replace(/\.md$/, ".html") : href;
  return href;
}

class CustomRenderer extends Renderer {
  override link(href: string, title: string | null, text: string): string {
    return super.link(normalizeHref(href), title, text);
  }
}

async function main() {
  const baseUrl = Deno.env.get("WWW_BASE_URL") ||
    "https://denodrivers.github.io/redis/";
  const dist = new URL(import.meta.resolve("../www"));
  await Deno.mkdir(dist, { recursive: true });

  async function write(path: string, content: string): Promise<void> {
    await Deno.writeTextFile(join(dist.pathname, path), content);
  }

  async function readFromRoot(path: string): Promise<string> {
    const rootDir = new URL(import.meta.resolve("../"));
    const content = await Deno.readTextFile(join(rootDir.pathname, path));
    return content;
  }

  const markdownOptions: RenderOptions = {
    baseUrl,
    renderer: new CustomRenderer(),
  };
  function renderMarkdown(markdown: string) {
    return renderMarkdownToHTML(markdown, markdownOptions);
  }

  const entries: Array<[path: string, to: string]> = [
    ["README.md", "index.html"],
    ["experimental/README.md", "experimental/index.html"],
    ["experimental/cluster/README.md", "experimental/cluster/index.html"],
  ];

  // Ensure directories
  for (
    const dir of new Set(
      entries.map(([, to]) => dirname(join(dist.pathname, to))),
    )
  ) {
    await Deno.mkdir(dir, { recursive: true });
  }

  for (const [path, to] of entries) {
    await write(to, renderMarkdown(await readFromRoot(path)));
  }
}

function renderMarkdownToHTML(
  markdown: string,
  options: RenderOptions,
): string {
  const html = render(markdown, options);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
main {
  max-width: 768px;
  margin-left: auto;
  margin-right: auto;
  padding: 1rem;
}
${CSS}
</style>
</head>
<body>
<main
  data-color-mode="light"
  data-light-theme="light"
  data-dark-theme="dark"
  class="markdown-body">
${html}
</main>
</body>
</html>`;
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error);
    Deno.exit(1);
  }
}
