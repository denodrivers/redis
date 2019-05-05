redis:
	docker run -p 6379:6379 -d -t redis:5
test:
	deno run --allow-net test.ts