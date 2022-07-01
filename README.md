Get node address

`curl http://localhost:1635/addresses`


`{"overlay":null,"underlay":[],"ethereum":"0xfce5636c917d2c87bf36c7585d5675a6277a657d","publicKey":"028fb62a69d7191fb4e60d0762ab7285f7ae57b16cf6085bcc408576e9ab03b699","pssPublicKey":"02c67a5751a3b43ea46e737e5abdaeaa9026f06cde837814054da2101124e596e8"}`

!!! handle buying stamps before start!! bee-waiter should check it, provide urls to buy that stamps. Can I buy it manually (curl) or only with swarm-cli?

!!! handle continue file downloading? issues for files that 2 times updated for the month. check it. may be I need to add a key to filename with date

`Wait 15-30 minutes to sync`

or 3344
Processing item 3343/23264812 - the latest before complete. why?

First url will not work, "?" should be encoded

http://localhost:3000/wiki/en/%22The_Spaghetti_Incident?%22 => http://localhost:3000/wiki/en/%22The_Spaghetti_Incident%3F%22

http://localhost:3000/wiki/en/%LOCALAPPDATA%

USE this instruction to prevent ports open https://askubuntu.com/questions/652556/uncomplicated-firewall-ufw-is-not-blocking-anything-when-using-docker

When this happens article uploaded or not? Parse all logs? Reupload that pages?

```
extractor_1   | Error: Command failed: zimdump show --url "I/Flag_of_Poland_(1919–1928).svg.png.webp" /app/data/wikipedia_en_all_maxi_2022-05.zim
extractor_1   | Entry not found
extractor_1   | 
extractor_1   |     at ChildProcess.exithandler (node:child_process:398:12)
extractor_1   |     at ChildProcess.emit (node:events:527:28)
extractor_1   |     at maybeClose (node:internal/child_process:1092:16)
extractor_1   |     at Socket.<anonymous> (node:internal/child_process:451:11)
extractor_1   |     at Socket.emit (node:events:527:28)
extractor_1   |     at Pipe.<anonymous> (node:net:709:12) {
extractor_1   |   code: 255,
extractor_1   |   killed: false,
extractor_1   |   signal: null,
extractor_1   |   cmd: 'zimdump show --url "I/Flag_of_Poland_(1919–1928).svg.png.webp" /app/data/wikipedia_en_all_maxi_2022-05.zim',
extractor_1   |   stdout: '',
extractor_1   |   stderr: 'Entry not found\n'
extractor_1   | }
```

Indexer: its pretty slow


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

## Using stamps

!!! Show examples for specific amount of data

## Data management

Redis database management tool

`http://localhost:8001/redis-stack/browser`

## Research

-Storing images is not ok in feeds

-Images could be stored under /bytes and in manifest, but in case a lot of images it will be slow

-The best ways is to put all images to the end of the doc, with ability to render it on the end after downloading or insert them to the page

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