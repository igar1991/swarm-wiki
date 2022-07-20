FROM alpine:edge

# add the repository that contains libzim and zim-tools
RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories

# Installing dependencies
RUN apk update && apk add libzim zim-tools