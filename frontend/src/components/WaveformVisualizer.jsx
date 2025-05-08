import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * A component that visualizes audio input as a dynamic waveform
 * @param {Object} props
 * @param {boolean} props.isActive - Whether the visualizer should be active
 * @param {AudioNode} props.audioSource - The audio source node to visualize
 */
const WaveformVisualizer = ({ isActive, audioSource }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);

  useEffect(() => {
    if (!isActive || !audioSource) return;

    const audioContext = audioSource.context;
    analyserRef.current = audioContext.createAnalyser();
    analyserRef.current.fftSize = 256;
    const bufferLength = analyserRef.current.frequencyBinCount;
    dataArrayRef.current = new Uint8Array(bufferLength);

    audioSource.connect(analyserRef.current);

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');

    const draw = () => {
      if (!isActive) return;

      animationRef.current = requestAnimationFrame(draw);
      
      analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
      
      canvasCtx.fillStyle = 'rgb(240, 249, 255)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgb(59, 130, 246)';
      canvasCtx.beginPath();
      
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArrayRef.current[i] / 128.0;
        const y = v * canvas.height / 2;
        
        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };
    
    draw();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (analyserRef.current && audioSource) {
        audioSource.disconnect(analyserRef.current);
      }
    };
  }, [isActive, audioSource]);

  return (
    <motion.div 
      className="w-full h-24 bg-blue-50 rounded-lg overflow-hidden"
      initial={{ opacity: 0, height: 0 }}
      animate={{ 
        opacity: isActive ? 1 : 0,
        height: isActive ? 96 : 0
      }}
      transition={{ duration: 0.3 }}
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
        width={500}
        height={96}
      />
    </motion.div>
  );
};

export default WaveformVisualizer;
