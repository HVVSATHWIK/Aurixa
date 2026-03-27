import React, { useEffect, useState } from 'react';

const NODES = [
  { id: 'ingest', label: 'Data Ingest', status: 'active', x: '0%', y: '50%' },
  { id: 'process', label: 'AI Process', status: 'processing', x: '45%', y: '20%' },
  { id: 'process-2', label: 'Vector DB', status: 'active', x: '45%', y: '80%' },
  { id: 'output', label: 'Result Nexus', status: 'offline', x: '90%', y: '50%' }
];

export default function PipelineVisualization() {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const i = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="glass-card relative w-full h-[400px] overflow-hidden p-8">
      {/* Background Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(to right, #00D4FF 1px, transparent 1px), linear-gradient(to bottom, #00D4FF 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />
      
      {/* Energy Steams / Connectors */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60">
        <path d="M 50 200 C 200 200, 250 80, 400 80" fill="none" className="stroke-primary" strokeWidth="1" />
        <path d="M 50 200 C 200 200, 250 320, 400 320" fill="none" className="stroke-primary" strokeWidth="1" />
        <path d="M 400 80 C 550 80, 600 200, 750 200" fill="none" className="stroke-secondary" strokeWidth="1" strokeDasharray="4 4" />
        <path d="M 400 320 C 550 320, 600 200, 750 200" fill="none" className="stroke-secondary" strokeWidth="1" strokeDasharray="4 4" />
      </svg>

      {/* Nodes */}
      {NODES.map((node) => (
        <div
          key={node.id}
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 transition-opacity duration-1000 ${pulse ? 'opacity-100' : 'opacity-80'}`}
          style={{ top: node.y, left: node.x }}
        >
          <div className="relative">
            {/* Ambient Aura */}
            <div className={`absolute inset-0 rounded-full blur-[20px] scale-150 opacity-40 ${node.status === 'active' ? 'bg-primary' : node.status === 'processing' ? 'bg-secondary-container' : 'bg-surface-variant'}`} />
            
            {/* Core */}
            <div className={`relative w-16 h-16 rounded-full border border-surface-variant/30 flex items-center justify-center backdrop-blur-md z-10 ${node.status === 'offline' ? 'bg-surface-dim' : 'bg-surface-container-high'}`}>
              <div className={`w-4 h-4 rounded-full ${node.status === 'active' ? 'bg-primary shadow-[0_0_15px_#a8e8ff]' : node.status === 'processing' ? 'bg-secondary animate-pulse' : 'bg-surface-variant'}`} />
            </div>
          </div>
          
          <div className="px-4 py-2 bg-surface-container-lowest/80 rounded border border-surface-variant/50 backdrop-blur-xl">
            <span className="text-white font-sans text-xs uppercase font-bold tracking-[1px] whitespace-nowrap">
              {node.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
