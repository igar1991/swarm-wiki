FROM node:16-alpine3.16

COPY ./docker-utils/extractor-2 .
COPY ./docker-utils/utils ./utils
RUN npm ci

ENTRYPOINT ["node", "--max-old-space-size=4096", "index.js"]