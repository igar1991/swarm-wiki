FROM node:16-alpine3.16

RUN apk add --no-cache make gcc g++ python3
COPY ./docker-utils/uploader .
RUN npm ci

ENTRYPOINT ["node", "index.js"]