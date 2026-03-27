import React from 'react';
import { Cpu, Server, Zap } from 'lucide-react';

const STATS = [
  { id: 1, label: 'Core Temp', value: '42.8', unit: '°C', status: 'optimal', icon: Cpu },
  { id: 2, label: 'Compute Load', value: '87', unit: '%', status: 'high', icon: Zap },
  { id: 3, label: 'Active Nodes', value: '1,024', unit: 'ON', status: 'optimal', icon: Server },
];

export default function LiveState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {STATS.map((stat, i) => (
        <div 
          key={stat.id} 
          className="glass-card p-8 flex flex-col justify-between"
          style={{ transform: `translateZ(${i * 10}px)` }} // Fake 3D depth hint for the aesthetic
        >
          <div className="flex justify-between items-start mb-8">
            <div className={`p-3 rounded-full ${stat.status === 'optimal' ? 'bg-primary/10' : 'bg-secondary-container/20'}`}>
               <stat.icon className={`w-6 h-6 ${stat.status === 'optimal' ? 'text-primary' : 'text-secondary-container'}`} />
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full animate-pulse opacity-80 ${stat.status === 'optimal' ? 'bg-primary' : 'bg-secondary-container'}`} />
              <span className="text-xs uppercase tracking-wider text-surface-variant font-bold">
                {stat.status}
              </span>
            </div>
          </div>
          
          <div>
            <div className="text-on-surface-variant font-sans font-medium mb-1 uppercase tracking-widest text-sm">
              {stat.label}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-display font-bold text-white tracking-tighter">
                {stat.value}
              </span>
              <span className="text-lg text-primary-fixed-dim font-bold">
                {stat.unit}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
