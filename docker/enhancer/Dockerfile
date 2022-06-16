FROM node:16-alpine3.16

COPY ./docker-utils/enhancer .
RUN npm ci

ENTRYPOINT ["node", "index.js"]