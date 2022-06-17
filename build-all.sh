docker build -t swarm-wiki-downloader -f docker/downloader/Dockerfile .
docker build -t swarm-wiki-trigger -f docker/trigger/Dockerfile .
docker build -t swarm-wiki-extractor -f docker/extractor/Dockerfile .
docker build -t swarm-wiki-uploader -f docker/uploader/Dockerfile .
docker build -t swarm-wiki-enhancer -f docker/enhancer/Dockerfile .
docker build -t swarm-wiki-bee-waiter -f docker/bee-waiter/Dockerfile .
docker build -t swarm-wiki-indexer -f docker/indexer/Dockerfile .