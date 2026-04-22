# SRT Converter

Convert SRT subtitle files between encodings — drag, detect, convert, save.

**Live app: https://srt-converter-tau.vercel.app**

## Features

- Drag & drop or browse for an `.srt` file
- Auto-detects the source encoding
- Choose any output encoding (UTF-8, windows-1250, windows-1251, ISO-8859-x, and more)
- Native save dialog — choose exactly where the file is saved
- Dark mode support

## Development

```bash
npm install
npm run dev
```

## Tech

- React + Vite
- [iconv-lite](https://github.com/ashtuchkin/iconv-lite) for encoding conversion
- [chardet](https://github.com/runk/node-chardet) for encoding detection
