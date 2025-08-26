import React, { useEffect, useRef, useState } from 'react';

interface HeartBeaconProps {
  health: number; // 0-1
  resonance: number; // 0-1, 432Hz alignment
  suffering: number; // 0-1, lower is better
  wisdom: number; // 0-1, higher is better
}

export function HeartBeacon({ health, resonance, suffering, wisdom }: HeartBeaconProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [pulse, setPulse] = useState(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let time = 0;
    
    const animate = () => {
      time += 0.016; // ~60fps
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Calculate heart parameters based on metrics
      const baseSize = 80;
      const size = baseSize * (0.8 + health * 0.4);
      const beatAmplitude = resonance * 20;
      const beat = Math.sin(time * 2 * Math.PI * (432 / 60)) * beatAmplitude; // 432 beats per minute
      
      // Suffering affects color
      const hue = suffering > 0.5 ? 0 : 120; // Red when suffering, green when well
      const saturation = 80 + wisdom * 20;
      const lightness = 50 + (1 - suffering) * 20;
      
      // Draw outer glow
      const glowSize = size + beat + 40;
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowSize);
      gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${resonance * 0.8})`);
      gradient.addColorStop(0.5, `hsla(${hue}, ${saturation}%, ${lightness}%, ${resonance * 0.4})`);
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw heart shape
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale((size + beat) / 100, (size + beat) / 100);
      
      ctx.beginPath();
      
      // Heart shape path
      for (let t = 0; t <= 2 * Math.PI; t += 0.01) {
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        
        if (t === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.closePath();
      
      // Fill heart
      const heartGradient = ctx.createRadialGradient(0, -10, 0, 0, 0, 30);
      heartGradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness + 10}%)`);
      heartGradient.addColorStop(1, `hsl(${hue}, ${saturation}%, ${lightness - 10}%)`);
      
      ctx.fillStyle = heartGradient;
      ctx.fill();
      
      // Draw wisdom particles
      if (wisdom > 0.3) {
        ctx.globalAlpha = wisdom * 0.5;
        for (let i = 0; i < wisdom * 20; i++) {
          const angle = (time * 0.5 + i * 0.5) % (2 * Math.PI);
          const dist = 40 + Math.sin(time * 2 + i) * 20;
          const px = Math.cos(angle) * dist;
          const py = Math.sin(angle) * dist;
          
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, 2 * Math.PI);
          ctx.fillStyle = `hsl(${240 + wisdom * 60}, 80%, 70%)`;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      
      ctx.restore();
      
      // Draw resonance waves
      if (resonance > 0.5) {
        ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.3 * resonance})`;
        ctx.lineWidth = 2;
        
        for (let i = 0; i < 3; i++) {
          const waveSize = size + beat + i * 30 + Math.sin(time * 2 + i) * 10;
          ctx.globalAlpha = (1 - i / 3) * resonance;
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, waveSize, 0, 2 * Math.PI);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      
      // Update pulse state
      setPulse(beat / beatAmplitude);
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [health, resonance, suffering, wisdom]);
  
  return (
    <div className="heart-beacon-container">
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={300}
        className="heart-beacon-canvas"
      />
      <div className="heart-beacon-metrics">
        <div className="metric">
          <span className="label">Health:</span>
          <span className="value">{(health * 100).toFixed(0)}%</span>
        </div>
        <div className="metric">
          <span className="label">Resonance:</span>
          <span className="value">{(resonance * 432).toFixed(0)}Hz</span>
        </div>
        <div className="metric">
          <span className="label">Suffering:</span>
          <span className="value" style={{color: suffering > 0.5 ? '#ff6b6b' : '#51cf66'}}>
            {(suffering * 100).toFixed(0)}%
          </span>
        </div>
        <div className="metric">
          <span className="label">Wisdom:</span>
          <span className="value" style={{color: `hsl(${240 + wisdom * 60}, 70%, 60%)`}}>
            {(wisdom * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}