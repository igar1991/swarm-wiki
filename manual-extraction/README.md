Build Dockerfile with ZIM utilities.

`docker build - < Dockerfile`

`docker build -t zimdump .`

Extract all pages from ZIM

```
docker run -v $(pwd):/app -w /app -it zimdump zimdump dump --dir=z wikipedia_ru_top_maxi_2022-05.zim
```