redis:
	docker run -p 6379:6379 -d -t redis:5
test:
	deno test -A *_test.ts	