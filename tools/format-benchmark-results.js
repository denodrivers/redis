function formatResultsAsMarkdown({ name, results }) {
  const keys = ["ops", "margin", "min", "max", "mean", "median", "samples"];
  const header = ["name", ...keys];
  const rows = results.map((result) => {
    const { name, details } = result;
    return [name, ...keys.map((key) => details[key])];
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
