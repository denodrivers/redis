import "./redis_test.ts";
import "./pubsub_test.ts";
import "./pipeline_test.ts";
import { runTests } from "https://deno.land/x/std@v0.2.11/testing/mod.ts";
runTests();
