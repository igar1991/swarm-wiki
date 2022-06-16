FROM node:16-alpine3.16

COPY ./docker-utils/bee-waiter .
RUN npm ci

ENTRYPOINT ["node", "index.js"]