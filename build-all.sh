docker build -t swarm-wiki-downloader -f docker/downloader/Dockerfile .
docker build -t swarm-wiki-trigger -f docker/trigger/Dockerfile .
docker build -t swarm-wiki-extractor -f docker/extractor/Dockerfile .
docker build -t swarm-wiki-uploader -f docker/uploader/Dockerfile .