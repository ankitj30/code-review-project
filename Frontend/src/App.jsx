import { useState, useCallback, useEffect, useRef } from 'react'
import Editor from 'react-simple-code-editor'
import { highlight, languages } from 'prismjs/components/prism-core'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-typescript'
import Markdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import axios from 'axios'
import './App.css'

/* ── Language options ───────────────────────── */
const LANG_MAP = {
  javascript: languages.javascript,
  typescript: languages.javascript,
  python:     languages.python,
  java:       languages.java,
  css:        languages.css,
  html:       languages.markup,
}

const LANG_OPTIONS = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python',     label: 'Python'     },
  { value: 'java',       label: 'Java'       },
  { value: 'css',        label: 'CSS'        },
  { value: 'html',       label: 'HTML'       },
]

const FILE_EXT = {
  javascript: 'js', typescript: 'ts', python: 'py',
  java: 'java', css: 'css', html: 'html',
}

const DEFAULT_CODE = `function sum(a, b) {
  return a + b
}

// Click "Review Code" to analyse this snippet
console.log(sum(1, 2))`

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '')

/* ── Tiny helpers ───────────────────────────── */
function copyToClipboard(text) {
  return navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  })
}

function useCopyButton() {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)
  const trigger = useCallback((text) => {
    copyToClipboard(text).then(() => {
      setCopied(true)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    })
  }, [])
  return [copied, trigger]
}

/* ── Review status enum ─────────────────────── */
const STATUS = {
  IDLE:    'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR:   'error',
}

/* ─────────────────────────────────────────────
   App
───────────────────────────────────────────── */
export default function App() {
  const [code,     setCode]     = useState(DEFAULT_CODE)
  const [lang,     setLang]     = useState('javascript')
  const [review,   setReview]   = useState('')
  const [status,   setStatus]   = useState(STATUS.IDLE)
  const [errorMsg, setErrorMsg] = useState('')
  const isDirty = code !== DEFAULT_CODE

  const [editorCopied, triggerEditorCopy] = useCopyButton()
  const [reviewCopied, triggerReviewCopy] = useCopyButton()

  /* Count lines for display */
  const lineCount = code.split('\n').length

  /* Keyboard shortcut: Ctrl+Enter / Cmd+Enter */
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (status !== STATUS.LOADING && code.trim()) {
          handleReview()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, code])

  /* ── Syntax highlighter ─────────────────── */
  const highlightCode = useCallback((src) => {
    const grammar = LANG_MAP[lang] ?? languages.javascript
    try { return highlight(src, grammar, lang) }
    catch { return src }
  }, [lang])

  /* ── Submit review ─────────────────────── */
  const handleReview = useCallback(async () => {
    if (!code.trim()) {
      setStatus(STATUS.ERROR)
      setErrorMsg('Please enter some code before requesting a review.')
      return
    }
    if (status === STATUS.LOADING) return

    setStatus(STATUS.LOADING)
    setReview('')
    setErrorMsg('')

    try {
      const response = await axios.post(
        `${API_URL}/ai/get-review`,
        { code },
        // Gemini can take well over a minute on Render's free instance, so
        // keep the client request alive long enough to receive the result.
        { timeout: 180_000 }
      )
      setReview(response.data)
      setStatus(STATUS.SUCCESS)
    } catch (err) {
      let msg = 'Could not connect to the review service. Make sure the backend is running and try again.'
      if (err.code === 'ECONNABORTED') {
        msg = 'The review timed out after 3 minutes. Please try again.'
      } else if (err.response?.data?.error) {
        msg = err.response.data.error
      } else if (typeof err.response?.data === 'string') {
        msg = err.response.data
      }
      setErrorMsg(msg)
      setStatus(STATUS.ERROR)
    }
  }, [code, status])

  /* ── Clear editor ─────────────────────── */
  const handleClear = useCallback(() => {
    setCode('')
    setReview('')
    setStatus(STATUS.IDLE)
    setErrorMsg('')
  }, [])

  return (
    <div className="app-shell">
      {/* ── Top Nav ── */}
      <nav className="top-nav" role="banner">
        <div className="nav-brand">
          <div className="nav-brand-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m8 10.5 1.8 1.8 3.6-3.6M15.5 15.5 21 21" />
            </svg>
          </div>
          <span>AI Code Review</span>
          <span className="nav-badge">Beta</span>
        </div>
        <div className="nav-actions">
          <span className="nav-shortcut">
            <span className="kbd">Ctrl</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>+</span>
            <span className="kbd">↵</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginLeft: '4px' }}>to review</span>
          </span>
        </div>
      </nav>

      {/* ── Workspace ── */}
      <div className="workspace" role="main">

        {/* ── LEFT: Code Editor ── */}
        <section className="panel editor-panel" aria-label="Code editor">
          {/* Panel header */}
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-dot" aria-hidden="true" />
              Code Editor
            </div>
            <div className="panel-actions">
              <button
                id="btn-copy-code"
                className={`editor-action-btn ${editorCopied ? 'copied' : ''}`}
                onClick={() => triggerEditorCopy(code)}
                aria-label="Copy code to clipboard"
              >
                {editorCopied ? '✓ Copied' : '⎘ Copy'}
              </button>
              <button
                id="btn-clear-code"
                className="editor-action-btn"
                onClick={handleClear}
                aria-label="Clear editor"
              >
                ✕ Clear
              </button>
            </div>
          </div>

          {/* Editor toolbar */}
          <div className="editor-toolbar">
            <div className="editor-file-info">
              <span className="file-icon" aria-hidden="true">📄</span>
              <span className="file-name">
                main.{FILE_EXT[lang] ?? 'js'}
              </span>
              <span
                className={`file-dot${isDirty ? ' dirty' : ''}`}
                title={isDirty ? 'Unsaved changes' : ''}
                aria-hidden="true"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="lang-select" className="sr-only">Language</label>
              <select
                id="lang-select"
                className="lang-selector"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                aria-label="Select programming language"
              >
                {LANG_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Editor with line numbers */}
          <div className="editor-body">
            {/* Line numbers */}
            <div className="line-numbers" aria-hidden="true">
              {code.split('\n').map((_, i) => (
                <span key={i} className="line-num">{i + 1}</span>
              ))}
            </div>

            {/* Code editor */}
            <div className="editor-textarea-wrapper">
              <Editor
                className="code-editor-inner"
                value={code}
                onValueChange={setCode}
                highlight={highlightCode}
                padding={12}
                textareaId="code-textarea"
                textareaClassName="code-textarea"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  lineHeight: 1.6,
                  background: 'transparent',
                  color: '#abb2bf',
                  minHeight: '100%',
                  tabSize: 2,
                }}
                aria-label="Code input"
                placeholder="Paste or type your code here…"
              />
            </div>
          </div>

          {/* Editor footer */}
          <div className="editor-footer">
            <div className="editor-meta">
              <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
              <span>{lang.charAt(0).toUpperCase() + lang.slice(1)}</span>
              <span>UTF-8</span>
            </div>
            <button
              id="btn-review-code"
              className="review-btn"
              onClick={handleReview}
              disabled={status === STATUS.LOADING || !code.trim()}
              aria-busy={status === STATUS.LOADING}
            >
              {status === STATUS.LOADING
                ? (<><span className="spinner" aria-hidden="true" /> Reviewing…</>)
                : (<><span className="review-btn-icon" aria-hidden="true">▶</span> Review Code</>)
              }
            </button>
          </div>
        </section>

        {/* Divider */}
        <div className="panel-divider" role="separator" aria-hidden="true" />

        {/* ── RIGHT: Review Results ── */}
        <section className="panel results-panel" aria-label="Review results" aria-live="polite">
          {/* Panel header */}
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-dot" aria-hidden="true" />
              Review Results
            </div>
            {status === STATUS.SUCCESS && (
              <div className="panel-actions">
                <button
                  id="btn-copy-review"
                  className={`copy-btn ${reviewCopied ? 'copied' : ''}`}
                  onClick={() => triggerReviewCopy(review)}
                  aria-label="Copy review to clipboard"
                >
                  {reviewCopied ? '✓ Copied' : '⎘ Copy'}
                </button>
              </div>
            )}
          </div>

          <div className="results-body">
            {/* ── IDLE: empty state ── */}
            {status === STATUS.IDLE && (
              <div className="empty-state" role="region" aria-label="Getting started">
                <h1 className="empty-state-title">AI Code Review</h1>
                <p className="empty-state-desc">
                  Analyze your code to identify potential bugs, security issues,
                  and opportunities to improve code quality.
                </p>
                <div className="empty-state-hints" role="list" aria-label="What the review covers">
                  {[
                    'Bugs & logical errors',
                    'Security vulnerabilities',
                    'Performance improvements',
                    'Code style & best practices',
                    'Suggested fixes with examples',
                  ].map((hint) => (
                    <div key={hint} className="hint-item" role="listitem">
                      <span className="hint-dot" aria-hidden="true" />
                      {hint}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── LOADING ── */}
            {status === STATUS.LOADING && (
              <div className="loading-state" role="status" aria-label="Review in progress">
                <div className="loading-spinner-large" aria-hidden="true" />
                <p className="loading-title">Analyzing your code…</p>
                <p className="loading-sub">
                  The AI is reviewing your code for bugs, security issues,
                  and quality improvements. This usually takes a few seconds.
                </p>
              </div>
            )}

            {/* ── ERROR ── */}
            {status === STATUS.ERROR && (
              <div className="error-state" role="alert">
                <div className="error-state-title">⚠ Review failed</div>
                <div className="error-state-msg">{errorMsg}</div>
              </div>
            )}

            {/* ── SUCCESS ── */}
            {status === STATUS.SUCCESS && review && (
              <div className="review-card">
                <div className="review-card-header">
                  <div className="review-card-title">
                    <span className="review-card-icon" aria-hidden="true">📋</span>
                    Analysis Results
                  </div>
                  <span className="success-badge">
                    ✓ Complete
                  </span>
                </div>
                <div className="review-card-body">
                  <div className="review-markdown">
                    <Markdown rehypePlugins={[rehypeHighlight]}>{review}</Markdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
