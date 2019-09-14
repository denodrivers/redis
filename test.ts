import "./redis_test.ts";
import "./pubsub_test.ts";
import "./pipeline_test.ts";
import { runIfMain } from "./vendor/https/deno.land/std/testing/mod.ts";
runIfMain(import.meta);
