// deno-lint-ignore-file no-console deno-lint-plugin-extra-rules/no-exit -- This file is a script, not a library module.
import { dirname, join } from "node:path";

const pathToDenoJSON = join(dirname(import.meta.dirname), "deno.json");
const denoJSON = JSON.parse(await Deno.readTextFile(pathToDenoJSON));
if (denoJSON.imports) {
  console.error(
    "`imports` should not be defined in `deno.json`. Use `import_map.test.json` instead.",
  );
  Deno.exit(1);
}

if (denoJSON.importMap) {
  console.error(
    "`importMap` should not be defined in `deno.json`. Use `import_map.test.json` instead.",
  );
  Deno.exit(1);
}

console.info("✅ OK");
