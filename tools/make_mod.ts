#!/usr/bin/env deno run --allow-read --allow-write --allow-run

import { readAll, readerFromStreamReader } from "../deps/std/io.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface Node {
  kind: string;
  name: string;
  declarationKind: "export" | "private";
}

interface Doc {
  nodes: Array<Node>;
}

async function doc(fileName: string): Promise<Doc> {
  const deno = new Deno.Command(Deno.execPath(), {
    args: ["doc", "--json", fileName],
  });
  const { stdout } = await deno.output();
  return JSON.parse(decoder.decode(stdout));
}

async function fmt(content: string): Promise<string> {
  const deno = new Deno.Command(Deno.execPath(), {
    args: ["fmt", "-"],
    stdin: "piped",
    stdout: "piped",
  }).spawn();
  const stdin = deno.stdin.getWriter();
  await stdin.ready;
  await stdin.write(encoder.encode(content));
  await stdin.ready;
  await stdin.close();
  await deno.status;
  const stdout = await readAll(readerFromStreamReader(deno.stdout.getReader()));
  const formattedContent = decoder.decode(stdout);
  return formattedContent;
}

function collectSourceFilesInRootDir(): Array<string> {
  return [...Deno.readDirSync(".")].filter((f) => {
    const name = f.name;
    if (!name || name === "mod.ts") return false;
    return name.endsWith(".ts") && !name.endsWith("_test.ts") &&
      !name.endsWith(".d.ts");
  }).map((f) => f.name);
}

const files = [...collectSourceFilesInRootDir(), "protocol/shared/types.ts"]
  .sort();
let content = `// Generated by tools/make_mod.ts. Don't edit.\n`;

// Expose public variables from protocol/shared/types.ts
{
  const fileName = "protocol/shared/types.ts";
  const variables = (await doc(fileName)).nodes.filter((node) => {
    return node.kind === "variable";
  }).map((node) => node.name);
  content += `export { ${variables.join(",")} } from "./${fileName}";\n`;
}

// Expose public functions from redis.ts.
{
  const fileName = "redis.ts";
  const functions = (await doc(fileName)).nodes.filter((node) => {
    return node.kind === "function";
  }).map((node) => node.name);
  content += `export { ${functions.join(",")} } from "./${fileName}";\n`;
}

// Expose public classes from errors.ts
{
  const fileName = "errors.ts";
  const classes = (await doc(fileName)).nodes.filter((node) => {
    return node.kind === "class";
  }).map((node) => node.name);
  content += `export { ${classes.join(",")} } from "./${fileName}";\n`;
}

// Expose types from *.ts.
for (const f of files) {
  const types = (await doc(f)).nodes.filter((node) => {
    return (node.kind === "interface" || node.kind === "typeAlias") &&
      node.declarationKind !== "private";
  }).map((node) => node.name);
  if (types.length > 0) {
    content += `export type { ${types.join(",")} } from "./${f}"\n`;
  }
}
Deno.writeFileSync("mod.ts", encoder.encode(await fmt(content)));
