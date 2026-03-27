import React from 'react';
import { AlignLeft, Terminal, AlertTriangle, ShieldCheck } from 'lucide-react';

const LOGS = [
  { id: 101, time: '14:02:44.200', type: 'info', msg: 'Neural pathways synchronized.', icon: AlignLeft },
  { id: 102, time: '14:03:12.805', type: 'process', msg: 'Vector clustering engaged sequence B9.', icon: Terminal },
  { id: 103, time: '14:04:55.001', type: 'secure', msg: 'Protocol omega validated at proxy 0x88f.', icon: ShieldCheck },
  { id: 104, time: '14:06:10.992', type: 'warn', msg: 'Latency spike detected in node-4 latency (152ms).', icon: AlertTriangle },
  { id: 105, time: '14:07:00.000', type: 'info', msg: 'Auto-scaling shards complete.', icon: AlignLeft },
];

export default function AuditTrail() {
  return (
    <div className="flex flex-col h-full bg-surface-container-lowest rounded-obsidian border border-surface-variant/20 overflow-hidden relative shadow-cyan-aura">
      {/* Top Header Glow */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-secondary to-transparent opacity-50" />
      
      <div className="p-6 flex-1 overflow-y-auto w-full">
        <ul className="space-y-6">
          {LOGS.map((log) => {
            let colorString = "text-on-surface-variant";
            if (log.type === 'process') colorString = "text-secondary";
            if (log.type === 'warn') colorString = "text-error";
            if (log.type === 'secure') colorString = "text-primary-fixed";

            return (
              <li key={log.id} className="group flex gap-4 pr-2">
                <div className="flex-shrink-0 mt-1">
                  <log.icon className={`w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity ${colorString}`} />
                </div>
                
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-[10px] uppercase font-display tracking-[1.5px] text-surface-variant">
                      Sys<span className="text-surface-variant/50">_</span>Log<span className="text-surface-variant/50">_</span>{log.id}
                    </span>
                    <span className="text-xs font-mono text-primary/40 group-hover:text-primary transition-colors">
                      {log.time}
                    </span>
                  </div>
                  
                  <p className={`text-sm font-sans tracking-wide leading-relaxed ${colorString === 'text-on-surface-variant' ? 'text-white' : colorString}`}>
                    {log.msg}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
      
      {/* Footer Fader */}
      <div className="h-16 w-full bg-gradient-to-t from-surface-container-lowest to-transparent absolute bottom-0 pointer-events-none" />
    </div>
  );
}
