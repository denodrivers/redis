import { dirname, join } from "node:path";

const pathToDenoJSON = join(dirname(import.meta.dirname), "deno.json");
const denoJSON = JSON.parse(await Deno.readTextFile(pathToDenoJSON));
if (denoJSON.imports) {
  // deno-lint-ignore no-console
  console.error(
    "`imports` should not be defined in `deno.json`. Use `import_map.test.json` instead.",
  );
  Deno.exit(1);
}

if (denoJSON.importMap) {
  // deno-lint-ignore no-console
  console.error(
    "`importMap` should not be defined in `deno.json`. Use `import_map.test.json` instead.",
  );
  Deno.exit(1);
}

// deno-lint-ignore no-console
console.info("✅ OK");
