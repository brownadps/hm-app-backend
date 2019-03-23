#!/bin/bash -i
docker build -t hm-${USER} . && \
docker run --name hm-${USER} \
--network=proxy \
--network-alias=hm-${USER} \
--env-file=${WEBSITE_ENV_PATH} \
-d hm-${USER}
