FROM node:16-alpine3.16

RUN apk add --no-cache make gcc g++ python3
COPY ./docker-utils/topuper .
COPY ./docker-utils/utils ./utils
RUN npm ci

ENTRYPOINT ["node", "index.js"]