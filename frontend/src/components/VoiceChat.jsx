// frontend/src/components/VoiceChat.jsx
import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import WaveformVisualizer from './WaveformVisualizer'

// Dev -> call localhost:8000, Prod -> same origin
const apiBase = import.meta.env.DEV
  ? 'http://localhost:8000' // local dev
  : `${window.location.protocol}//${window.location.hostname}:8000`; // production

// Silence detection parameters
const SILENCE_THRESHOLD = 0.01   // adjust RMS threshold
const SILENCE_DURATION = 4.0     // seconds of silence to auto-stop

export default function VoiceChat() {
  const { currentUser, refreshUserData } = useAuth(); // Get the current user and refresh function from auth context
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

    // Check if user is authenticated
    if (!currentUser) {
      // If BYPASS_AUTH is enabled in App.jsx, we should still be able to use this component
      // We'll use a mock user ID for API calls in this case
      console.log('[VoiceChat] No authenticated user, using mock data for API calls')
      // Continue with the process using a mock user ID
    }
    
    // Log the complete user object to debug
    console.log('[VoiceChat] Current user object:', currentUser);

    try {
      // If no authenticated user, use a mock user ID for testing/demo purposes
      const mockUserId = 'demo-user-123'; // This should match a user ID in your Firestore database
      
      // Get the user ID - either from the authenticated user or use the mock ID
      const userId = currentUser ? currentUser.uid : mockUserId;
      
      console.log('[VoiceChat] POST', `${apiBase}/transcribe`, 'User ID:', userId)
      // We need to use the Firebase UID (google_id) as that's what the backend uses to identify users
      // The backend expects the same ID that was used during registration
      console.log('[VoiceChat] Current user object for debugging:', currentUser || { uid: mockUserId, note: 'Using mock user ID' });
      
      console.log('[VoiceChat] Using user ID for transcribe:', userId);
      
      // Only send one header to avoid concatenation issues
      const headers = new Headers();
      headers.append('user-id', userId); // This is the primary header name expected by FastAPI
      
      const tRes = await fetch(`${apiBase}/transcribe`, { 
        method: 'POST', 
        headers: headers,
        body: form 
      })
      if (!tRes.ok) throw new Error(`Transcription failed: ${tRes.status}`)
      const { transcript: txt } = await tRes.json()
      console.log('[VoiceChat] transcript:', txt)
      setTranscript(txt)

      setStatus('chatting')
      console.log('[VoiceChat] POST', `${apiBase}/chat`)
      // Use the same user ID as for transcribe
      const cRes = await fetch(`${apiBase}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
          // No need for user-id header here as it's in the body
        },
        body: JSON.stringify({ 
          user_id: userId, // Use the same userId variable we defined above
          message: txt 
        }),
      })
      if (!cRes.ok) throw new Error(`Chat failed: ${cRes.status}`)
      const responseData = await cRes.json()
      console.log('[VoiceChat] response data:', responseData)
      
      // Use the 'response' field from the backend
      const botReply = responseData.response
      console.log('[VoiceChat] bot reply:', botReply)
      
      // Also log the remaining responses for debugging
      console.log('[VoiceChat] responses remaining:', responseData.responses_remaining)
      
      setReply(botReply)

      // Refresh user data after a successful chat response to update counts everywhere
      // Only attempt to refresh if we have an authenticated user
      if (currentUser) {
        refreshUserData()
          .then(() => console.log('[VoiceChat] User data refreshed after chat'))
          .catch(err => console.error('[VoiceChat] Failed to refresh user data after chat:', err));
      } else {
        console.log('[VoiceChat] Skipping user data refresh - no authenticated user');
      }

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
    <div className="max-w-3xl mx-auto space-y-6">
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
          `w-full py-3 text-white rounded-lg transition-transform transform text-lg font-medium ` +
          (listening
            ? 'bg-red-600 hover:bg-red-700 active:scale-95'
            : 'bg-blue-600 hover:bg-blue-700 active:scale-95')
        }
        whileTap={{ scale: 0.95 }}
      >
        {listening ? 'Stop Listening' : 'Start Listening'}
      </motion.button>
      
      {/* Waveform Visualizer */}
      <WaveformVisualizer 
        isActive={status === 'recording'} 
        audioSource={source.current}
      />

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="font-medium text-gray-700">You:</h2>
        </div>
        <div className="p-4 min-h-[4rem]">
          {status === 'transcribing' ? (
            <div className="flex items-center space-x-2">
              <div className="animate-pulse text-gray-500">Transcribing</div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          ) : (
            <p className="text-gray-800 whitespace-pre-wrap">{transcript || '—'}</p>
          )}
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-4 bg-blue-50 border-b">
          <h2 className="font-medium text-blue-700">Bot:</h2>
        </div>
        <div className="p-4 min-h-[4rem]">
          {status === 'chatting' ? (
            <div className="flex items-center space-x-2">
              <div className="animate-pulse text-gray-500">Thinking</div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          ) : (
            <p className="text-gray-800 whitespace-pre-wrap">{reply || '—'}</p>
          )}
        </div>
      </div>
    </div>
  )
}
