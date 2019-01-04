redis:
	docker run -p 6379:6379 -d -t redis:5
test:
	deno redis_test.ts --allow-net
	deno pubsub_test.ts --allow-net
	deno pipeline_test.ts --allow-net