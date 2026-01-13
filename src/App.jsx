import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, X, Minimize, Play, Pause, Maximize, FileVideo, Cpu, Wifi, Battery, Clock as ClockIcon } from 'lucide-react';

// --- Assets & Data ---
const SAMPLE_VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4";

const INITIAL_LOGS = [
  { id: 'log_042', title: 'LOG_042: ARRIVAL', date: '2142-05-12', size: '142 MB', src: SAMPLE_VIDEO },
  { id: 'log_043', title: 'LOG_043: ANOMALY', date: '2142-05-13', size: '98 MB', src: SAMPLE_VIDEO },
  { id: 'log_044', title: 'LOG_044: CONTACT', date: '2142-05-14', size: '210 MB', src: SAMPLE_VIDEO },
  { id: 'log_045', title: 'LOG_045: BREACH', date: '2142-05-15', size: '45 MB', src: SAMPLE_VIDEO },
  { id: 'err_001', title: 'ERR_DUMP_CORE', date: '2142-05-15', size: '12 KB', src: null, error: true },
];

const TERMINAL_LINES = [
  "SYSTEM_BOOT_SEQUENCE_INIT...",
  "CHECKING_BIO_SENSORS... [OK]",
  "OXYGEN_LEVELS... 98.4%",
  "HULL_INTEGRITY... 100%",
  "CONNECTING_TO_MAIN_FRAME... SUCCESS",
  "DECRYPTING_DAILY_LOGS...",
  "WARNING: MINOR PRESSURE FLUCTUATION IN SECTOR 7",
  "ESTABLISHING_SECURE_CONNECTION...",
  "USER_AUTH: COMMANDER_SHEPARD",
  "LOADING_DESKTOP_ENVIRONMENT_V4.2",
  "SCANNING_EXTERNAL_DRIVES...",
  "NO_THREATS_DETECTED.",
  "STANDBY_FOR_USER_INPUT...",
  "LISTENING_ON_PORT_8080...",
  "MEMORY_USAGE: 14TB / 512PB",
  "RENDERING_INTERFACE...",
  "LOADING_ASSETS...",
  "SYSTEM_READY."
];

// --- Utility Components ---

const Scanlines = () => (
  <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden h-full w-full">
    {/* Scanline moving bar */}
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(0,255,100,0.05)] to-transparent animate-scanline h-[20%] w-full pointer-events-none"></div>
    {/* Static scanlines */}
    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_4px,6px_100%] pointer-events-none"></div>
    {/* Screen Flicker */}
    <div className="absolute inset-0 bg-[rgba(0,255,0,0.02)] animate-flicker pointer-events-none"></div>
    {/* Vignette */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)] pointer-events-none"></div>
  </div>
);

const Clock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="font-mono text-cyan-500 text-sm flex items-center space-x-2 border border-cyan-900/50 bg-black/40 px-3 py-1 rounded">
      <ClockIcon size={14} className="animate-pulse" />
      <span>{time.toISOString().split('T')[0]}</span>
      <span className="text-cyan-300">{time.toLocaleTimeString([], { hour12: false })}</span>
    </div>
  );
};

// --- Terminal Background Component ---

const TerminalBackground = () => {
  const [lines, setLines] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lineIndex = 0;
    let charIndex = 0;
    let currentLine = "";
    
    // Initial boot sequence typing
    const typeWriter = setInterval(() => {
      if (lineIndex >= TERMINAL_LINES.length) {
        clearInterval(typeWriter);
        // Start random chatter after boot
        const randomChatter = setInterval(() => {
          const commands = ["PING 192.168.0.1", "UPDATE_PACKET_LOSS", "RECALIBRATING_ENGINES", "SYNC_COMPLETE", "IDLE..."];
          const newLine = `sys_daemon@root: ${commands[Math.floor(Math.random() * commands.length)]} [${Date.now()}]`;
          setLines(prev => [...prev.slice(-20), newLine]);
        }, 3000);
        return;
      }

      const targetLine = TERMINAL_LINES[lineIndex];
      
      if (charIndex < targetLine.length) {
        currentLine += targetLine[charIndex];
        setLines(prev => {
          const newLines = [...prev];
          if (newLines.length > lineIndex) {
            newLines[lineIndex] = currentLine;
          } else {
            newLines.push(currentLine);
          }
          return newLines;
        });
        charIndex++;
      } else {
        lineIndex++;
        charIndex = 0;
        currentLine = "";
      }
    }, 20);

    return () => clearInterval(typeWriter);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="fixed inset-0 z-0 bg-black text-green-900/40 font-mono text-sm p-8 overflow-hidden select-none pointer-events-none flex flex-col justify-end">
      <div ref={scrollRef} className="h-full overflow-hidden flex flex-col justify-end">
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap">{line}</div>
        ))}
        <div className="animate-pulse">_</div>
      </div>
    </div>
  );
};

// --- Window Component ---

const DraggableWindow = ({ id, title, onClose, children, isActive, onFocus }) => {
  const [position, setPosition] = useState({ x: 20, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Random initial position offset for realism
  useEffect(() => {
    const randomOffset = Math.floor(Math.random() * 50);
    setPosition(p => ({ x: p.x + randomOffset, y: p.y + randomOffset }));
  }, []);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    onFocus();
    setIsDragging(true);
    
    let clientX, clientY;
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }

    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top
      });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (isDragging) {
      let clientX, clientY;
      if ('touches' in e) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      } else {
          clientX = (e as MouseEvent).clientX;
          clientY = (e as MouseEvent).clientY;
      }

      setPosition({
        x: clientX - dragOffset.x,
        y: clientY - dragOffset.y
      });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  return (
    <div
      ref={windowRef}
      className={`fixed flex flex-col bg-black/90 border border-cyan-500 shadow-[0_0_15px_rgba(0,255,255,0.3)] w-full max-w-lg md:max-w-2xl rounded-sm overflow-hidden backdrop-blur-sm transition-opacity duration-200 ${isActive ? 'z-40 opacity-100 ring-1 ring-cyan-400' : 'z-30 opacity-80'}`}
      style={{
        left: position.x,
        top: position.y,
        minHeight: '300px'
      }}
      onMouseDown={onFocus}
      onTouchStart={onFocus}
    >
      {/* Window Header */}
      <div 
        className="h-8 bg-cyan-950/80 border-b border-cyan-500 flex items-center justify-between px-2 cursor-move select-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <div className="flex items-center space-x-2 text-cyan-300 font-mono text-xs tracking-widest uppercase">
          <Terminal size={14} />
          <span>{title}</span>
        </div>
        <div className="flex items-center space-x-1">
          <button className="p-1 hover:bg-cyan-800 text-cyan-400 rounded-sm transition-colors"><Minimize size={12} /></button>
          <button className="p-1 hover:bg-cyan-800 text-cyan-400 rounded-sm transition-colors"><Maximize size={12} /></button>
          <button onClick={onClose} className="p-1 hover:bg-red-900 hover:text-red-200 text-cyan-400 rounded-sm transition-colors"><X size={12} /></button>
        </div>
      </div>

      {/* Window Content */}
      <div className="flex-1 p-1 relative text-cyan-100 font-mono text-sm overflow-auto">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
        {children}
      </div>

      {/* Window Footer */}
      <div className="h-6 bg-black border-t border-cyan-900/50 flex items-center justify-between px-3 text-[10px] text-cyan-600 font-mono">
        <span>STATUS: MOUNTED</span>
        <span>MEM: 0x4F2A</span>
      </div>
    </div>
  );
};

// --- Video Player Component ---

const VideoPlayer = ({ src, autoPlay = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
      if (videoRef.current) {
          if (autoPlay) videoRef.current.play().catch(e => console.log("Autoplay blocked", e));
      }
  }, [autoPlay]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(progress);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-black border border-cyan-900/30 p-1">
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden border border-cyan-900/50 mb-1 group">
         <video 
           ref={videoRef}
           src={src}
           className="w-full h-full object-contain"
           onTimeUpdate={handleTimeUpdate}
           onEnded={() => setIsPlaying(false)}
           loop
         />
         {!isPlaying && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                 <Play className="text-cyan-500 opacity-50 w-16 h-16" />
             </div>
         )}
      </div>

      {/* Custom Controls */}
      <div className="h-10 bg-cyan-950/30 border border-cyan-900/50 flex items-center px-2 space-x-3">
        <button onClick={togglePlay} className="text-cyan-400 hover:text-cyan-100 transition-colors">
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        
        <div className="flex-1 h-2 bg-black border border-cyan-800 relative cursor-pointer">
           <div 
             className="absolute top-0 left-0 h-full bg-cyan-500 opacity-70" 
             style={{ width: `${progress}%` }}
           ></div>
           {/* Scanline on progress bar */}
           <div className="absolute top-0 right-0 h-full w-[2px] bg-white opacity-80" style={{ left: `${progress}%` }}></div>
        </div>

        <div className="text-[10px] text-cyan-500 font-mono">
            LOG_PLAYBACK_MODE
        </div>
      </div>
    </div>
  );
};

// --- Desktop Icon Component ---

const DesktopIcon = ({ label, date, onClick, error = false }) => (
  <div 
    onClick={onClick}
    className="group flex flex-col items-center w-24 p-2 cursor-pointer hover:bg-cyan-900/20 rounded-sm transition-colors duration-200"
  >
    <div className={`relative w-14 h-14 flex items-center justify-center border-2 ${error ? 'border-red-500 text-red-500' : 'border-cyan-600 text-cyan-400'} bg-black/50 mb-2 group-hover:shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-shadow`}>
      <FileVideo size={32} />
      {/* Icon Corner Decals */}
      <div className={`absolute top-0 left-0 w-1 h-1 ${error ? 'bg-red-500' : 'bg-cyan-500'}`}></div>
      <div className={`absolute bottom-0 right-0 w-1 h-1 ${error ? 'bg-red-500' : 'bg-cyan-500'}`}></div>
    </div>
    <span className={`text-xs font-mono text-center px-1 ${error ? 'text-red-400' : 'text-cyan-100'} bg-black/60`}>
      {label}
    </span>
    <span className="text-[9px] font-mono text-cyan-700 mt-1">{date}</span>
  </div>
);

// --- Main App Component ---

const App = () => {
  const [openWindows, setOpenWindows] = useState<{id: string, log: any}[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);

  const openLog = (log) => {
    if (log.error) {
        // Simulate error sound or visual shake?
        return;
    }
    
    if (openWindows.find(w => w.id === log.id)) {
      setActiveWindowId(log.id);
      return;
    }

    const newWindow = { id: log.id, log };
    setOpenWindows([...openWindows, newWindow]);
    setActiveWindowId(log.id);
  };

  const closeWindow = (id) => {
    setOpenWindows(openWindows.filter(w => w.id !== id));
    if (activeWindowId === id) {
      setActiveWindowId(openWindows.length > 1 ? openWindows[openWindows.length - 2].id : null);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-black overflow-hidden font-sans select-none">
      <Scanlines />
      <TerminalBackground />

      {/* Main Content Area */}
      <div className="relative z-10 h-screen flex flex-col">
        
        {/* Top Header / Status Bar */}
        <header className="h-12 bg-black/80 border-b-2 border-cyan-900 flex items-center justify-between px-6 backdrop-blur-sm">
           <div className="flex items-center space-x-4">
               <div className="text-xl font-black text-cyan-500 tracking-[0.2em] font-mono">
                   USCSS_NOSTROMO
               </div>
               <div className="h-4 w-[1px] bg-cyan-800"></div>
               <div className="text-xs text-cyan-700 font-mono hidden md:block">
                   SYS_VER_4.2.1 // ORBITAL_MODE
               </div>
           </div>
           
           <div className="flex items-center space-x-6 text-cyan-600">
               <div className="flex items-center space-x-2">
                   <Wifi size={16} className="animate-pulse" />
                   <span className="text-xs font-mono hidden sm:block">UPLINK_OK</span>
               </div>
               <div className="flex items-center space-x-2">
                   <Battery size={16} />
                   <span className="text-xs font-mono hidden sm:block">PWR_98%</span>
               </div>
               <Clock />
           </div>
        </header>

        {/* Desktop Surface */}
        <main className="flex-1 p-8 relative">
          
          {/* Icons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-6 items-start content-start max-w-5xl">
            {INITIAL_LOGS.map(log => (
              <DesktopIcon 
                key={log.id} 
                label={log.title} 
                date={log.date}
                error={log.error}
                onClick={() => openLog(log)} 
              />
            ))}
          </div>

          {/* Windows Layer */}
          {openWindows.map(window => (
            <DraggableWindow
              key={window.id}
              id={window.id}
              title={window.log.title}
              isActive={activeWindowId === window.id}
              onFocus={() => setActiveWindowId(window.id)}
              onClose={() => closeWindow(window.id)}
            >
              <div className="p-4 h-full flex flex-col space-y-4">
                 <div className="text-xs text-cyan-600 font-mono border-b border-cyan-900/50 pb-2 mb-2">
                    Metadata: {window.log.size} // Encrypted // {window.log.date}
                 </div>
                 <div className="flex-1 min-h-[200px] bg-black border border-cyan-900/30 p-1">
                     <VideoPlayer src={window.log.src} autoPlay={true} />
                 </div>
                 <div className="text-[10px] text-justify text-cyan-800 font-mono leading-tight">
                    TRANSCRIPT: AUTOMATED LOG ENTRY. VISUAL SENSORS ACTIVE. AUDIO NORMALIZED. 
                    NO ANOMALIES DETECTED IN SECTOR 4...
                 </div>
              </div>
            </DraggableWindow>
          ))}

        </main>

        {/* Bottom Status Bar */}
        <footer className="h-8 bg-cyan-950/20 border-t border-cyan-900 flex items-center px-4 justify-between">
           <div className="flex items-center space-x-2 text-cyan-700 text-[10px] font-mono">
              <Cpu size={12} />
              <span>CORE_TEMP: 342K</span>
           </div>
           <div className="text-cyan-900 text-[10px] font-mono tracking-widest uppercase">
               Authorized Personnel Only
           </div>
        </footer>

      </div>
      
      {/* Global CSS for CRT Animations */}
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(500%); }
        }
        @keyframes flicker {
          0% { opacity: 0.02; }
          5% { opacity: 0.05; }
          10% { opacity: 0.02; }
          15% { opacity: 0.06; }
          20% { opacity: 0.02; }
          50% { opacity: 0.02; }
          55% { opacity: 0.05; }
          60% { opacity: 0.02; }
          100% { opacity: 0.02; }
        }
        .animate-scanline {
          animation: scanline 8s linear infinite;
        }
        .animate-flicker {
          animation: flicker 0.3s infinite;
        }
        /* Custom scrollbar for webkit */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #000; 
        }
        ::-webkit-scrollbar-thumb {
          background: #0e7490; 
          border: 1px solid #000;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #06b6d4; 
        }
      `}</style>
    </div>
  );
};

export default App; 
