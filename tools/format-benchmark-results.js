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

const tmpDir = new URL("../tmp", import.meta.url).pathname;
for (const driver of ["deno-redis", "ioredis"]) {
  console.log(
    formatResultsAsMarkdown(
      JSON.parse(await Deno.readTextFile(`${tmpDir}/${driver}-bench.json`)),
    ),
  );
}
