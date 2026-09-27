# Toast & Speech Writer (QVAC)

Choose the occasion (wedding, birthday, graduation, retirement...), say who it's for, share a few **real memories**, and an **on-device AI** writes a toast or short speech in your chosen tone and length. See the estimated speaking time as you edit, then **practice with the built-in teleprompter**: full-screen text that scrolls at your speaking speed, with a timer.

It runs **on your own computer** using [QVAC](https://github.com/tetherto/qvac), Tether's open-source AI SDK.
No API key, no cloud service, and what you type never leaves your machine.

![screenshot](screenshot.png)

## SDK version

`@qvac/sdk` **0.19.0** (declared in `package.json`)

Functions used: `loadModel` and `completion` (streaming), with the `LLAMA_3_2_1B_INST_Q4_0` model.

## Install

You need [Node.js](https://nodejs.org) 22 or newer and some free disk space for the model.

```bash
git clone https://github.com/misaki-codex/qvac-speech-writer.git
cd qvac-speech-writer
npm install
```

## Run

```bash
npm start
```

Then open **http://localhost:3077** (the address, not the HTML file). The first start downloads the model.
While it loads, a simple speech built from your memories is used instead, and the teleprompter works right away.

## How it works

- `server.js` streams the speech from `completion`, with rules to use only your memories (no invented stories) and write short sentences that are easy to say.
- Speaking time is estimated at about 130 words per minute. The teleprompter scrolls at a speed you choose (80 to 200 words per minute). Space starts or pauses it, and Esc closes it.
- Your draft is saved in your browser.
- The server listens on `127.0.0.1`, so only your own computer can reach it.

## Troubleshooting

If you see `RPC_INIT_TIMEOUT`, the QVAC worker was slow to start. `server.js` already waits 3 minutes.
Set `QVAC_RPC_INIT_TIMEOUT_MS` (milliseconds) before `npm start` to wait longer, and make sure no other
QVAC app is running at the same time. If you see `ERR_MODULE_NOT_FOUND`, delete the `node_modules` folder
and run `npm install` again (this usually means an install was interrupted, for example by a full disk).

## License

MIT
