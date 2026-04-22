import { useState, useRef, useCallback } from 'react'
import iconv from 'iconv-lite'
import chardet from 'chardet'
import './App.css'

const OUTPUT_ENCODINGS = [
  'UTF-8',
  'UTF-16LE',
  'UTF-16BE',
  'windows-1250',
  'windows-1251',
  'windows-1252',
  'ISO-8859-1',
  'ISO-8859-2',
]

const FILE_SYSTEM_ACCESS_SUPPORTED = 'showSaveFilePicker' in window

export default function App() {
  const [file, setFile] = useState(null)
  const [fileBuffer, setFileBuffer] = useState(null)
  const [detectedEncoding, setDetectedEncoding] = useState(null)
  const [outputEncoding, setOutputEncoding] = useState('UTF-8')
  const [outputName, setOutputName] = useState('')
  const [status, setStatus] = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

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
      setOutputName(f.name.replace(/\.srt$/i, '_utf8.srt'))
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
              <div className="detected-badge">{detectedEncoding}</div>
            </div>

            <div className="field">
              <label>Output encoding</label>
              <select
                value={outputEncoding}
                onChange={(e) => setOutputEncoding(e.target.value)}
              >
                {OUTPUT_ENCODINGS.map((enc) => (
                  <option key={enc} value={enc}>{enc}</option>
                ))}
              </select>
            </div>

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
