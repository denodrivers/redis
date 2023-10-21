import { join } from "node:path";

function formatResultsAsMarkdown({ name, results }) {
  const detailKeys = ["min", "max", "mean", "median"];
  const header = ["name", "ops", "margin", ...detailKeys, "samples"];
  const rows = results.map((result) => {
    const { name, ops, margin, details, samples } = result;
    return [
      name,
      ops,
      margin,
      ...detailKeys.map((key) => details[key]),
      samples,
    ];
  });
  const table = [
    header,
    header.map(() => ":---:"),
    ...rows,
  ]
    .map(makeTableRow)
    .join("\n");
  return `## ${name}\n\n${table}\n`;
}

function makeTableRow(columns) {
  return `|${columns.join("|")}|`;
}

const resultsDir = new URL("../tmp/benchmark", import.meta.url);
for await (const entry of Deno.readDir(resultsDir)) {
  const results = JSON.parse(
    await Deno.readTextFile(join(resultsDir.pathname, entry.name)),
  );
  const markdown = formatResultsAsMarkdown(results);
  console.log(markdown);
}
