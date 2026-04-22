import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import iconv from 'iconv-lite'
import chardet from 'chardet'
import './App.css'

const OUTPUT_ENCODINGS = [
  { group: 'Unicode', options: [
    { value: 'UTF-8',    label: 'UTF-8' },
    { value: 'UTF-16LE', label: 'UTF-16LE' },
    { value: 'UTF-16BE', label: 'UTF-16BE' },
    { value: 'UTF-32LE', label: 'UTF-32LE' },
    { value: 'UTF-32BE', label: 'UTF-32BE' },
  ]},
  { group: 'Windows', options: [
    { value: 'windows-1250', label: 'windows-1250 — Central European (Croatian, Czech, Polish, Slovak)' },
    { value: 'windows-1251', label: 'windows-1251 — Cyrillic (Russian, Bulgarian, Ukrainian)' },
    { value: 'windows-1252', label: 'windows-1252 — Western European (English, French, German, Spanish)' },
    { value: 'windows-1253', label: 'windows-1253 — Greek' },
    { value: 'windows-1254', label: 'windows-1254 — Turkish' },
    { value: 'windows-1256', label: 'windows-1256 — Arabic' },
  ]},
  { group: 'ISO-8859', options: [
    { value: 'ISO-8859-1', label: 'ISO-8859-1 — Western European (legacy)' },
    { value: 'ISO-8859-2', label: 'ISO-8859-2 — Central European (legacy)' },
  ]},
  { group: 'Cyrillic', options: [
    { value: 'KOI8-R', label: 'KOI8-R — Russian' },
    { value: 'KOI8-U', label: 'KOI8-U — Ukrainian' },
  ]},
  { group: 'East Asian', options: [
    { value: 'GBK',       label: 'GBK — Simplified Chinese' },
    { value: 'GB2312',    label: 'GB2312 — Simplified Chinese (legacy)' },
    { value: 'Big5',      label: 'Big5 — Traditional Chinese' },
    { value: 'Shift_JIS', label: 'Shift_JIS — Japanese' },
    { value: 'EUC-JP',    label: 'EUC-JP — Japanese (Unix)' },
    { value: 'EUC-KR',    label: 'EUC-KR — Korean' },
  ]},
]

const FILE_SYSTEM_ACCESS_SUPPORTED = 'showSaveFilePicker' in window

const encodingSuffix = (enc) => enc.toLowerCase().replace(/[^a-z0-9]/g, '')

const buildOutputName = (fileName, enc) =>
  fileName.replace(/\.srt$/i, `_${encodingSuffix(enc)}.srt`)

export default function App() {
  const [file, setFile] = useState(null)
  const [fileBuffer, setFileBuffer] = useState(null)
  const [detectedEncoding, setDetectedEncoding] = useState(null)
  const [outputEncoding, setOutputEncoding] = useState('UTF-8')
  const [outputName, setOutputName] = useState('')
  const [status, setStatus] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  )
  const inputRef = useRef()

  const preview = useMemo(() => {
    if (!fileBuffer || !detectedEncoding) return null
    try {
      const decoded = iconv.decode(fileBuffer, detectedEncoding)
      const reencoded = iconv.encode(decoded, outputEncoding)
      const text = iconv.decode(reencoded, outputEncoding)
      return text.split('\n').slice(0, 20).join('\n')
    } catch {
      return null
    }
  }, [fileBuffer, detectedEncoding, outputEncoding])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const loadFile = useCallback((f) => {
    if (!f || !f.name.toLowerCase().endsWith('.srt')) {
      setStatus({ type: 'error', message: 'Please select a .srt file.' })
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const buffer = Buffer.from(e.target.result)
      const detected = chardet.detect(buffer) || 'windows-1250'
      setFile(f)
      setFileBuffer(buffer)
      setDetectedEncoding(detected)
      setOutputName(buildOutputName(f.name, outputEncoding))
      setStatus(null)
    }
    reader.readAsArrayBuffer(f)
  }, [])

  const onFileInput = (e) => loadFile(e.target.files[0])

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    loadFile(e.dataTransfer.files[0])
  }

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const convert = async () => {
    if (!fileBuffer) return
    try {
      const decoded = iconv.decode(fileBuffer, detectedEncoding)
      const encoded = iconv.encode(decoded, outputEncoding)
      const blob = new Blob([encoded], { type: 'application/octet-stream' })

      if (FILE_SYSTEM_ACCESS_SUPPORTED) {
        const handle = await window.showSaveFilePicker({
          suggestedName: outputName,
          types: [{ description: 'SRT subtitle', accept: { 'text/plain': ['.srt'] } }],
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = outputName
        a.click()
        URL.revokeObjectURL(url)
      }
      setStatus({ type: 'success', message: `Saved as "${outputName}"` })
    } catch (err) {
      if (err.name !== 'AbortError') {
        setStatus({ type: 'error', message: `Error: ${err.message}` })
      }
    }
  }

  return (
    <div className="app">
      <button
        className="theme-toggle"
        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? '☀' : '☽'}
      </button>

      <header>
        <h1>SRT Converter</h1>
        <p>Convert subtitle files to any encoding</p>
      </header>

      <main>
        <div
          className={`dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
          onClick={() => inputRef.current.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".srt"
            onChange={onFileInput}
            style={{ display: 'none' }}
          />
          {file ? (
            <>
              <div className="file-icon">&#128196;</div>
              <div className="file-name">{file.name}</div>
              <div className="file-hint">Click to change file</div>
            </>
          ) : (
            <>
              <div className="drop-icon">&#8679;</div>
              <div className="drop-label">Drop your .srt file here</div>
              <div className="drop-hint">or click to browse</div>
            </>
          )}
        </div>

        {file && (
          <div className="details">
            <div className="field">
              <label>Detected encoding</label>
              <select
                value={detectedEncoding || ''}
                onChange={(e) => setDetectedEncoding(e.target.value)}
              >
                {OUTPUT_ENCODINGS.map(({ group, options }) => (
                  <optgroup key={group} label={group}>
                    {options.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Output encoding</label>
              <select
                value={outputEncoding}
                onChange={(e) => {
                  setOutputEncoding(e.target.value)
                  if (file) setOutputName(buildOutputName(file.name, e.target.value))
                }}
              >
                {OUTPUT_ENCODINGS.map(({ group, options }) => (
                  <optgroup key={group} label={group}>
                    {options.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {preview && (
              <div className="field">
                <label>Output preview</label>
                <pre className="preview">{preview}</pre>
              </div>
            )}

            <div className="field">
              <label>Output filename</label>
              <input
                type="text"
                value={outputName}
                onChange={(e) => setOutputName(e.target.value)}
              />
            </div>

            <button className="convert-btn" onClick={convert}>
              Convert &amp; Save
            </button>

            {!FILE_SYSTEM_ACCESS_SUPPORTED && (
              <p className="hint">File will be downloaded automatically.</p>
            )}
          </div>
        )}

        {status && (
          <div className={`status ${status.type}`}>{status.message}</div>
        )}
      </main>
    </div>
  )
}
