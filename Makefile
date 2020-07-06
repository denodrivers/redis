TESTDATA_DIR=testdata

redis:
	docker run -p 6379:6379 -d -t redis:5
test:
	deno test -A *_test.ts	
lint:
	deno fmt --check
	deno lint --unstable

# The following targets are adopted from go-redis (https://github.com/go-redis/redis/blob/dc52593c8c63bc2a05796ec44efd317fd3e14b64/Makefile):
# * `testdeps`
# * `${TESTDATA_DIR}/redis`
# * `${TESTDATA_DIR}/redis/src/redis-server`
#
# Copyright (c) 2013 The github.com/go-redis/redis Authors.
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are
# met:
#
#    * Redistributions of source code must retain the above copyright
# notice, this list of conditions and the following disclaimer.
#    * Redistributions in binary form must reproduce the above
# copyright notice, this list of conditions and the following disclaimer
# in the documentation and/or other materials provided with the
# distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
# A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
# OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
# LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
# DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
# THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
testdeps: ${TESTDATA_DIR}/redis/src/redis-server

.PHONY: testdeps

${TESTDATA_DIR}/redis:
	mkdir -p $@
	wget -qO- http://download.redis.io/releases/redis-6.0.5.tar.gz | tar xvz --strip-components=1 -C $@

${TESTDATA_DIR}/redis/src/redis-server: ${TESTDATA_DIR}/redis
	cd $< && make all

start-redis:
	${TESTDATA_DIR}/redis/src/redis-server --port 6379 --daemonize yes

kill-redis:
	${TESTDATA_DIR}/redis/src/redis-cli -p 6379 shutdown