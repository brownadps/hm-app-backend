#!/bin/bash
source /etc/environment && \
docker build --build-arg HM_FILE_UPLOAD_PATH=${HM_FILE_UPLOAD_PATH} \
-t hm-${USER} . && \
docker run --name hm-${USER} \
--network=proxy \
--network-alias=hm-${USER} \
--env-file=${WEBSITE_ENV_PATH} \
-d hm-${USER}
