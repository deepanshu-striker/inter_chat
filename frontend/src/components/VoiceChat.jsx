// frontend/src/components/VoiceChat.jsx
import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Dev -> call localhost:8000, Prod -> same origin
const apiBase = import.meta.env.DEV 
  ? 'http://localhost:8000'    // dev
  : 'http://localhost:8000'    // prod, too

// Silence detection parameters
const SILENCE_THRESHOLD = 0.01   // adjust RMS threshold
const SILENCE_DURATION = 4.0     // seconds of silence to auto-stop

export default function VoiceChat() {
  const [listening, setListening] = useState(false)
  const [status, setStatus] = useState('idle')       // 'idle' | 'recording' | 'transcribing' | 'chatting'
  const [transcript, setTranscript] = useState('')
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')

  const mediaRecorder = useRef(null)
  const audioChunks = useRef([])
  const audioContext = useRef(null)
  const processor = useRef(null)
  const source = useRef(null)
  const silenceStart = useRef(null)

  // start listening: get mic & setup audio processing
  const startListening = async () => {
    setError(''); setTranscript(''); setReply('')
    console.log('[VoiceChat] startListening')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioContext.current = new AudioContext()
      source.current = audioContext.current.createMediaStreamSource(stream)
      processor.current = audioContext.current.createScriptProcessor(4096, 1, 1)

      // silence detection + auto record logic
      let recording = false
      silenceStart.current = null

      processor.current.onaudioprocess = e => {
        const data = e.inputBuffer.getChannelData(0)
        // compute RMS
        let sum = 0
        for (let i = 0; i < data.length; i++) sum += data[i] ** 2
        const rms = Math.sqrt(sum / data.length)

        if (!recording && rms > SILENCE_THRESHOLD) {
          console.log('[VoiceChat] Voice detected, start MediaRecorder')
          recording = true
          silenceStart.current = null
          audioChunks.current = []
          mediaRecorder.current = new MediaRecorder(stream)
          mediaRecorder.current.ondataavailable = ev => {
            if (ev.data.size > 0) audioChunks.current.push(ev.data)
          }
          mediaRecorder.current.onstop = processAudio
          mediaRecorder.current.start()
          setStatus('recording')
        }

        if (recording && rms < SILENCE_THRESHOLD) {
          if (!silenceStart.current) silenceStart.current = Date.now()
          else if ((Date.now() - silenceStart.current) / 1000 >= SILENCE_DURATION) {
            console.log('[VoiceChat] Silence detected, stopping MediaRecorder')
            mediaRecorder.current.stop()
            recording = false
            setStatus('transcribing')
          }
        } else if (recording && rms >= SILENCE_THRESHOLD) {
          // reset silence timer when voice returns
          silenceStart.current = null
        }
      }

      source.current.connect(processor.current)
      processor.current.connect(audioContext.current.destination)

      setListening(true)
    } catch (err) {
      console.error('[VoiceChat] getUserMedia error', err)
      setError('Microphone access denied. Please enable it.')
    }
  }

  // stop everything
  const stopListening = () => {
    console.log('[VoiceChat] stopListening')
    setListening(false)
    setStatus('idle')
    if (processor.current) {
      processor.current.disconnect()
      source.current.disconnect()
      audioContext.current.close()
      processor.current = null
      source.current = null
      audioContext.current = null
    }
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop()
    }
  }

  // process the recorded audio
  const processAudio = async () => {
    setStatus('transcribing')
    const blob = new Blob(audioChunks.current, { type: 'audio/wav' })
    const form = new FormData(); form.append('file', blob, 'voice.wav')

    try {
      console.log('[VoiceChat] POST', `${apiBase}/transcribe`)
      const tRes = await fetch(`${apiBase}/transcribe`, { method: 'POST', body: form })
      if (!tRes.ok) throw new Error(`Transcription failed: ${tRes.status}`)
      const { transcript: txt } = await tRes.json()
      console.log('[VoiceChat] transcript:', txt)
      setTranscript(txt)

      setStatus('chatting')
      console.log('[VoiceChat] POST', `${apiBase}/chat`)
      const cRes = await fetch(`${apiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: txt }),
      })
      if (!cRes.ok) throw new Error(`Chat failed: ${cRes.status}`)
      const { reply: bot } = await cRes.json()
      console.log('[VoiceChat] reply:', bot)
      setReply(bot)

      setStatus('idle')
      // continue listening automatically
    } catch (err) {
      console.error('[VoiceChat] processAudio error:', err)
      setError(err.message)
      setStatus('idle')
    }
  }

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (listening) stopListening()
    }
  }, [listening])

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {error && (
          <motion.div
            className="p-2 bg-red-100 text-red-700 rounded"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => (listening ? stopListening() : startListening())}
        className={
          `w-full py-2 text-white rounded-lg transition-transform transform ` +
          (listening
            ? 'bg-red-600 hover:bg-red-700 active:scale-95'
            : 'bg-blue-600 hover:bg-blue-700 active:scale-95')
        }
        whileTap={{ scale: 0.95 }}
      >
        {listening ? 'Stop Listening' : 'Start Listening'}
      </motion.button>

      <div>
        <h2 className="font-medium">You:</h2>
        <p className="p-2 bg-gray-100 rounded min-h-[2rem]">
          {status === 'transcribing' ? 'Transcribing…' : transcript || '—'}
        </p>
      </div>

      <div>
        <h2 className="font-medium">Bot:</h2>
        <p className="p-2 bg-blue-50 rounded min-h-[2rem]">
          {status === 'chatting' ? 'Thinking…' : reply || '—'}
        </p>
      </div>
    </div>
  )
}
