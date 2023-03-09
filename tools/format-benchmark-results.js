function formatResultsAsMarkdown({ name, results }) {
  const detailKeys = ["margin", "min", "max", "mean", "median"];
  const header = ["name", "opts", ...detailKeys, "samples"];
  const rows = results.map((result) => {
    const { name, ops, details, samples } = result;
    return [name, ops, ...detailKeys.map((key) => details[key]), samples];
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
