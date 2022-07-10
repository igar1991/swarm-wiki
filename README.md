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

```
extractor_1   | onIsGetPage i 17621 title -- keyLocal wiki_page_index_wikipedia_en_all_maxi_2022-05.zim_17621
extractor_1   | Error: Command failed: zimdump list --details --url "--" /app/data/wikipedia_en_all_maxi_2022-05.zim
extractor_1   | --url requires an argument
extractor_1   |     at ChildProcess.exithandler (node:child_process:398:12)
extractor_1   |     at ChildProcess.emit (node:events:527:28)
extractor_1   |     at maybeClose (node:internal/child_process:1092:16)
extractor_1   |     at Process.ChildProcess._handle.onexit (node:internal/child_process:302:5) {
extractor_1   |   code: 255,
extractor_1   |   killed: false,
extractor_1   |   signal: null,
extractor_1   |   cmd: 'zimdump list --details --url "--" /app/data/wikipedia_en_all_maxi_2022-05.zim',
```

`Error: Command failed: zimdump list --details --url "+/'\" /app/data/wikipedia_en_all_maxi_2022-05.zim`

show all errors

`docker-compose logs -f | | grep "error" | grep -v "feed get: no update found"`

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

# DB info

Keys under `wiki_page_en_TITLEKEY` are keys that stores info for page title as key. Here stored info about full pages and redirects.

Here stored information only about **uploaded** pages. They could be full pages or redirects. It is detectable by stored metadata.

```json
{
  "topic": "bc25fa531672e8d8d3e69082d6ad8fc1abfd2457dd9116baa65fa9d762c68dc8",
  "feedReference": "cde1cfa6814bb890e15585f9bbb785aa59dfcad0b1d178e6fd8327d271b4fa24",
  "uploadedData": {
    "reference": "ad31a1249bfd6502c81277ed260ae40c073219af84caf760aca059f8a17f9e1e"
  },
  "meta": {
    "key": "US",
    "path": "A/US",
    "type": "redirect",
    "title": "US",
    "index": "3415",
    "internal_type": "redirect",
    "redirect_index": "3481",
    "filename": "wikipedia_en_100_maxi_2022-06.zim"
  },
  "updated_at": 1657370955
}
```

Keys `wiki_page_index_wikipedia_en_FILENAME_INDEX` stored info tied to title index (titles retrieved by zimdump tool). 

This info required for fast checking if some title index was processed or not without using zimdump.

This info stored in the same time as title above. It means that pages already uploaded. 

```json
{
  "meta": {
    "key": "United_States_president",
    "path": "A/United_States_president",
    "type": "redirect",
    "title": "United States president",
    "index": "3520",
    "internal_type": "redirect",
    "redirect_index": "2725",
    "filename": "wikipedia_en_100_maxi_2022-06.zim"
  },
  "updated_at": 1657370954
}
```

Keys `cache_wikipedia_en_FILENAME_ZIMINDEX` for real ZIM indexes. It is necessary for converting redirects to real pages without using zimdump.

Here stored info only about pages, not redirects. But there is no guarantees that pages uploaded to the network. They could appear here before uploading.

```json
{
  "key": "Amphibian",
  "path": "A/Amphibian",
  "type": "page",
  "title": "Amphibian",
  "index": "235",
  "internal_type": "item",
  "mime_type": "text/html",
  "item_size": "320968"
}
```

Redis issue. Some articles have the same name, but with different cases. Only one will be stored. Example

`wiki_page_en_WHO_Essential_Medicines` + `wiki_page_en_WHO_Essential_medicines`

It could be an issue when cache checking

# VPS Run

`sudo apt-get update && sudo apt-get upgrade`

`curl -fsSL https://get.docker.com -o get-docker.sh`

`sudo sh get-docker.sh`

`sudo apt-get install openssh-client`

`scp root@YOUR_HOST:/root/wikipedia_en_all_maxi_2022-05.zim /root/`

`git clone git@github.com:igar1991/swarm-wiki.git`

`cd swarm-wiki`

`./build-all.sh`

`scp root@YOUR_HOST:/root/swarm-wiki/.env /root/swarm-wiki/`

`sudo ufw allow from YOUR_NEXT_HOST`

`docker compose -f docker-compose-cluster.yml up`