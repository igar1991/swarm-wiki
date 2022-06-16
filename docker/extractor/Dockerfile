FROM node:16-alpine3.16

# add the repository that contains libzim and zim-tools
RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories

# Installing dependencies
RUN apk update && apk add libzim zim-tools

COPY ./docker-utils/extractor .
RUN npm ci

ENTRYPOINT ["node", "index.js"]