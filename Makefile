redis:
	docker run -p 6379:6379 -d -t redis:5
test:
	deno --allow-net test.ts