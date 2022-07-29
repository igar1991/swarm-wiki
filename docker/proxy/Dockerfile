FROM node:16-alpine3.16

COPY ./docker-utils/proxy .
COPY ./docker-utils/utils ./utils
RUN npm ci

ENTRYPOINT ["node", "--max-old-space-size=16384", "index.js"]