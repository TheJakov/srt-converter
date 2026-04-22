# SRT Converter

Convert SRT subtitle files between encodings — drag, detect, convert, save.

**Live app: https://srt-converter-tau.vercel.app**

## Features

- Drag & drop or browse for an `.srt` file
- Auto-detects the source encoding
- Choose output encoding from a grouped list: Unicode (UTF-8/16/32), Windows code pages (1250–1258), ISO-8859 (1, 2), Cyrillic (KOI8), and East Asian (GBK, Big5, Shift_JIS, EUC-JP/KR)
- Native save dialog — choose exactly where the file is saved
- Light/dark mode toggle (persists across sessions)

## Development

```bash
npm install
npm run dev
```

## Tech

- React + Vite
- [iconv-lite](https://github.com/ashtuchkin/iconv-lite) for encoding conversion
- [chardet](https://github.com/runk/node-chardet) for encoding detection
