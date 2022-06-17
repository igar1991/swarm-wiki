FROM node:16-alpine3.16

COPY ./docker-utils/indexer .
RUN npm ci

ENTRYPOINT ["node", "index.js"]