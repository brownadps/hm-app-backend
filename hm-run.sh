#!/bin/bash
docker build -t hm . && \
docker run --name hm \
--network=proxy \
--network-alias=hm \
--env-file "../.env" \
-d hm
