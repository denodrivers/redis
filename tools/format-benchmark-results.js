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
const paths = Array.from(Deno.readDirSync(resultsDir)).map((x) =>
  join(resultsDir.pathname, x.name)
).sort();
for (const path of paths) {
  const results = JSON.parse(await Deno.readTextFile(path));
  const markdown = formatResultsAsMarkdown(results);
  console.log(markdown);
}
