Extract all

```
docker run -v $(pwd):/app -w /app -it zimdump zimdump dump --dir=z wikipedia_ru_top_maxi_2022-05.zim
```

## Run all

1) Copy `example.env` to `.env`, define environment params

2) Run 

`docker-compose up`

## How to build every docker package

Build any docker package from the root of the project (because it requires some files from the project)

`docker build -t swarm-wiki-trigger -f docker/trigger/Dockerfile . `

`docker run --env-file .env swarm-wiki-trigger`

## Testing

First you need to prepare a docker image with utilities for working with ZIM files.

Go to `test` directory

`cd test`

Build Dockerfile with ZIM utilities.

`docker build - < Dockerfile`

`docker build -t zimdump .`

Return to the root folder

`cd ..`

And run tests

`...`