FROM node:11

ARG HM_FILE_UPLOAD_PATH

RUN mkdir -p $HM_FILE_UPLOAD_PATH

RUN chown -R node:node $HM_FILE_UPLOAD_PATH

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./

USER node

RUN npm install

COPY --chown=node:node . .

EXPOSE 8080

CMD [ "node", "server.js" ]
