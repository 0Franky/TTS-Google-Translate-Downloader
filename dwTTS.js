const fs = require('fs');
const path = require('path');

let isWin = process.platform === "win32";
let isDarwin = process.platform === "darwin";

// set virtual env path for ffmpeg based on current dir
if (isWin) {
  // set virtual env path for win
  fs.writeFileSync('.env', "ffmpeg=" + path.join(__dirname, 'ffmpeg.exe'));
} else if (isDarwin) {
  // set virtual env path for mac
  fs.writeFileSync('.env', "ffmpeg=" + path.join(__dirname, ''));
} else {
  // set virtual env path for linux
  fs.writeFileSync('.env', "ffmpeg=" + path.join(__dirname, ''));
}

// load virtual env path
require('dotenv').config()

const request = require('request');
const audioconcat = require('audioconcat');

// declare config const
const lang = "fr-FR";
const baseUrl = "https://translate.google.com/translate_tts?ie=UTF-8&tl=" + lang + "&client=tw-ob&q=";

start();

async function start() {
  // read text to download tts
  let text = fs.readFileSync('text.txt').toString();

  let phrases = [];

  // google's api allow to make tts 200 chars text only
  // so make many phrases removing it from original text until text is empty
  do {
    let tmp = text.substring(0, 200);

    // try to make a complete phrase to the last dot
    let lastDotPos = tmp.lastIndexOf('.');

    // if phrase is too long, cut it to last space
    if (lastDotPos == -1 && text.length - tmp.length != 0) {
      lastDotPos = tmp.lastIndexOf(' ');
    }
    // else (like phrase length min then 200 or one long word) cut to max 200 chs
    if (lastDotPos == -1) lastDotPos = tmp.length;

    let currentPhrase = tmp.substring(0, lastDotPos + 1);
    text = text.substring(currentPhrase.length);

    phrases.push(currentPhrase.trim());
  } while (text.length != 0);

  // console.log(phrases);

  let promises = [];
  let audio = [];


  // download all tts async
  for (let i = 0; i < phrases.length; i++) {
    let currentUrlDw = baseUrl + encodeURIComponent(phrases[i]);

    audio.push(i + ".mp3");

    promises.push(downloadFile(currentUrlDw, i + ".mp3"));

  }

  // wait until all downloads complete
  await Promise.all(promises);


  // concat all tts in one mp3 then remove tts single file
  audioconcat(audio)
    .concat('total.mp3')
    .on('start', function (command) {
      console.log('ffmpeg process started:', command);
    })
    .on('error', function (err, stdout, stderr) {
      console.error('Error:', err)
      console.error('ffmpeg stderr:', stderr);
      delAudio(audio);
    })
    .on('end', function (output) {
      console.error('Audio created in:', output);
      delAudio(audio);
    });
}

async function downloadFile(currentUrlDw, file) {
  const saveFile = await request(currentUrlDw);
  const download = fs.createWriteStream(path.join(__dirname, file));
  await new Promise((resolve, reject) => {
    saveFile.pipe(download);
    download.on("close", resolve);
    download.on("error", console.error);
  });
}

function delAudio(audio) {
  for (let i = 0; i < audio.length; i++) {
    fs.unlinkSync(audio[i]);
  }

  console.log("end");
}