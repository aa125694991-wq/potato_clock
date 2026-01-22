import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, AlertCircle, Coffee, List, PenTool, Calendar, Plus, Edit2, Clock, CheckCircle, Minus, Plus as PlusIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Task, PomodoroSession } from '../types';
import { auth, db, onAuthStateChanged } from '../services/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

// Constants for Timer
const DEFAULT_WORK_MINUTES = 25;
const SHORT_BREAK_MINUTES = 5;

// Constants for Timeline
const START_HOUR = 6; // 6 AM
const END_HOUR = 24; // Midnight
const PIXELS_PER_HOUR = 60; // 1px = 1min
const TIMELINE_HEIGHT = (END_HOUR - START_HOUR) * PIXELS_PER_HOUR;

// Helper: Sanitize for Firestore
const cleanForFirestore = (data: any) => {
  const clean: any = { ...data };
  Object.keys(clean).forEach(key => {
    if (clean[key] === undefined) {
      clean[key] = null;
    }
  });
  return clean;
};

// --- Sub-Component: Session Modal (Add/Edit) ---
interface SessionModalProps {
  initialData?: Partial<PomodoroSession>;
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: PomodoroSession) => void;
  onDelete?: (id: string) => void;
}

const SessionModal: React.FC<SessionModalProps> = ({ initialData, isOpen, onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState('');
  const [startTimeStr, setStartTimeStr] = useState('');
  const [duration, setDuration] = useState(25);
  const [type, setType] = useState<'WORK' | 'BREAK'>('WORK');

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.taskTitle || '');
      setDuration(initialData?.durationMinutes || 25);
      setType(initialData?.type || 'WORK');
      
      const date = initialData?.startTime ? new Date(initialData.startTime) : new Date();
      const hh = date.getHours().toString().padStart(2, '0');
      const mm = date.getMinutes().toString().padStart(2, '0');
      setStartTimeStr(`${hh}:${mm}`);
    }
  }, [isOpen, initialData]);

  const handleSave = () => {
    const [hh, mm] = startTimeStr.split(':').map(Number);
    const startObj = new Date();
    startObj.setHours(hh, mm, 0, 0);
    
    const endObj = new Date(startObj.getTime() + duration * 60000);

    const newSession: PomodoroSession = {
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      taskTitle: title || (type === 'BREAK' ? 'Break' : 'Focus Session'),
      startTime: startObj.getTime(),
      endTime: endObj.getTime(),
      durationMinutes: duration,
      type,
      status: initialData?.status || 'MANUAL'
    };
    onSave(newSession);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">{initialData?.id ? 'Edit Log' : 'Add Missing Log'}</h3>
          <button onClick={onClose}><Square className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
            <div className="flex bg-gray-100 p-1 rounded-lg">
               <button onClick={() => setType('WORK')} className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${type === 'WORK' ? 'bg-white shadow text-brand-600' : 'text-gray-500'}`}>Work</button>
               <button onClick={() => setType('BREAK')} className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${type === 'BREAK' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}>Break</button>
            </div>
          </div>
          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Task / Activity</label>
             <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="What did you do?" />
          </div>
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Time</label>
              <input type="time" value={startTimeStr} onChange={e => setStartTimeStr(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 outline-none" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duration (m)</label>
              <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value))} className="w-full border border-gray-300 rounded-lg p-2 outline-none" />
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-between bg-gray-50">
          {initialData?.id && onDelete ? (
            <Button variant="danger" size="sm" onClick={() => { onDelete(initialData.id!); onClose(); }}>Delete</Button>
          ) : <div></div>}
          <div className="space-x-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
};


export default function FocusView() {
  // Timer State
  const [mode, setMode] = useState<'WORK' | 'BREAK'>('WORK');
  
  // Custom Timer State
  const [workDuration, setWorkDuration] = useState(DEFAULT_WORK_MINUTES);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_WORK_MINUTES * 60);
  const [isActive, setIsActive] = useState(false);
  
  // Data State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [user, setUser] = useState(auth?.currentUser);
  
  // UI State
  const [selectionMode, setSelectionMode] = useState<'PLAN' | 'MANUAL'>('PLAN');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [manualTaskTitle, setManualTaskTitle] = useState('');
  
  // Modals
  const [showInterruptModal, setShowInterruptModal] = useState(false);
  const [interruptionReason, setInterruptionReason] = useState('');
  const [editingSession, setEditingSession] = useState<PomodoroSession | null>(null);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // --- Data Sync ---
  useEffect(() => {
    const loadLocalData = () => {
      const savedTasks = localStorage.getItem('local_tasks');
      if (savedTasks) setTasks(JSON.parse(savedTasks));
      
      const savedSessions = localStorage.getItem('local_sessions');
      if (savedSessions) setSessions(JSON.parse(savedSessions));
    };

    if (!auth) {
      loadLocalData();
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser: any) => {
      setUser(currentUser);
      if (currentUser) {
        // Sync Tasks
        const qTasks = query(collection(db, 'users', currentUser.uid, 'tasks'));
        const unsubTasks = onSnapshot(qTasks, (snapshot) => {
           setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
        });

        // Sync Sessions
        const qSessions = query(collection(db, 'users', currentUser.uid, 'sessions'));
        const unsubSessions = onSnapshot(qSessions, (snapshot) => {
           setSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PomodoroSession)));
        });

        return () => { unsubTasks(); unsubSessions(); };
      } else {
        loadLocalData();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Auto-scroll timeline to current time on load
  useEffect(() => {
    if (timelineRef.current) {
      const currentHour = new Date().getHours();
      const scrollPos = Math.max(0, (currentHour - START_HOUR) * PIXELS_PER_HOUR - 100);
      timelineRef.current.scrollTop = scrollPos;
    }
  }, []); // Run once on mount

  // Update timeLeft when duration changes (only if not active)
  useEffect(() => {
    if (!isActive) {
      if (mode === 'WORK') {
        setTimeLeft(workDuration * 60);
      } else {
        setTimeLeft(SHORT_BREAK_MINUTES * 60);
      }
    }
  }, [workDuration, mode, isActive]);

  // Sync selected task duration
  useEffect(() => {
     if (selectionMode === 'PLAN' && selectedTaskId && !isActive) {
        const t = tasks.find(task => task.id === selectedTaskId);
        if (t) {
           setWorkDuration(t.duration);
        }
     }
  }, [selectedTaskId, selectionMode, tasks, isActive]);

  const saveSessionToDB = async (session: PomodoroSession) => {
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'sessions', session.id), cleanForFirestore(session));
      } catch (e) { console.error("Error saving session", e); }
    } else {
      const updated = [...sessions.filter(s => s.id !== session.id), session];
      setSessions(updated);
      localStorage.setItem('local_sessions', JSON.stringify(updated));
    }
  };

  const deleteSessionFromDB = async (sessionId: string) => {
    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'sessions', sessionId));
      } catch (e) { console.error("Error deleting", e); }
    } else {
      const updated = sessions.filter(s => s.id !== sessionId);
      setSessions(updated);
      localStorage.setItem('local_sessions', JSON.stringify(updated));
    }
  };

  const currentDayIndex = new Date().getDay();
  const todaysTasks = tasks.filter(t => t.dayIndex === currentDayIndex);

  const todaysSessions = sessions
    .filter(s => new Date(s.startTime).toDateString() === new Date().toDateString());

  // --- Timer Logic ---

  useEffect(() => {
    if (isActive) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === 1) {
            new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(() => {});
          }
          return prev - 1;
        });
      }, 1000);
    } 
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isActive]);

  const toggleTimer = () => {
    if (mode === 'WORK' && !isActive) {
      if (selectionMode === 'PLAN' && !selectedTaskId) {
        alert("Please select a task from your plan!");
        return;
      }
      if (selectionMode === 'MANUAL' && !manualTaskTitle.trim()) {
        alert("Please enter a task name!");
        return;
      }
    }
    setIsActive(!isActive);
  };

  const adjustDuration = (delta: number) => {
    if (!isActive && mode === 'WORK') {
       setWorkDuration(prev => Math.max(1, Math.min(180, prev + delta)));
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
    
    const endTime = Date.now();
    let initialSeconds = mode === 'WORK' ? workDuration * 60 : SHORT_BREAK_MINUTES * 60;
    
    const elapsedSeconds = initialSeconds - timeLeft;
    let durationMin = Math.ceil(elapsedSeconds / 60); 
    if (durationMin < 1) durationMin = 1;
    
    const startTime = endTime - (durationMin * 60000);
    
    let taskName = mode === 'BREAK' ? 'Break' : manualTaskTitle;
    if (mode === 'WORK' && selectionMode === 'PLAN') {
       const t = tasks.find(task => task.id === selectedTaskId);
       if (t) taskName = t.title;
    }

    const newSession: PomodoroSession = {
      id: Math.random().toString(36).substr(2, 9),
      taskId: selectionMode === 'PLAN' ? selectedTaskId : undefined,
      taskTitle: taskName,
      startTime,
      endTime,
      durationMinutes: durationMin,
      type: mode,
      status: 'COMPLETED'
    };

    saveSessionToDB(newSession);
    
    if (mode === 'WORK') {
      new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(() => {});
      setMode('BREAK');
      setTimeLeft(SHORT_BREAK_MINUTES * 60);
    } else {
      setMode('WORK');
      setTimeLeft(workDuration * 60); 
    }
  };

  const handleInterruptClick = () => {
    setIsActive(false);
    setShowInterruptModal(true);
  };

  const confirmInterrupt = () => {
    setShowInterruptModal(false);
    setInterruptionReason('');
    if (mode === 'WORK') setTimeLeft(workDuration * 60);
    else setTimeLeft(SHORT_BREAK_MINUTES * 60);
  };

  const formatTime = (seconds: number) => {
    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    return `${isNegative ? '+' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Timeline Rendering Helpers ---
  const getSessionStyle = (session: PomodoroSession) => {
    const start = new Date(session.startTime);
    const minutesSinceStartOfDay = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
    const top = Math.max(0, minutesSinceStartOfDay * (PIXELS_PER_HOUR / 60));
    const height = Math.max(20, session.durationMinutes * (PIXELS_PER_HOUR / 60)); // Min height for visibility
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      left: '48px', // Offset for time labels
      right: '8px',
      position: 'absolute' as 'absolute'
    };
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 pb-20 lg:pb-0 lg:h-full lg:overflow-hidden">
      
      {/* LEFT: Timer & Current Task */}
      <div className="flex-1 max-w-2xl mx-auto w-full space-y-6 flex flex-col lg:overflow-y-auto pb-4">
        
        {/* Task Selection */}
        {!isActive && mode === 'WORK' ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Ready to Focus?</h2>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setSelectionMode('PLAN')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center ${selectionMode === 'PLAN' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}>
                  <List className="w-3 h-3 mr-1.5"/> Plan
                </button>
                <button onClick={() => setSelectionMode('MANUAL')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center ${selectionMode === 'MANUAL' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500'}`}>
                  <PenTool className="w-3 h-3 mr-1.5"/> Custom
                </button>
              </div>
            </div>

            {selectionMode === 'PLAN' ? (
              <div className="space-y-2">
                {todaysTasks.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                     <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2"/>
                     <p className="text-gray-500 text-sm">No tasks scheduled for today.</p>
                     <p className="text-xs text-brand-500 mt-1 cursor-pointer hover:underline" onClick={() => setSelectionMode('MANUAL')}>Use custom input</p>
                  </div>
                ) : (
                  <div className="grid gap-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                    {todaysTasks.map(t => (
                      <div key={t.id} onClick={() => setSelectedTaskId(t.id)} className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center ${selectedTaskId === t.id ? 'bg-brand-50 border-brand-200 ring-1 ring-brand-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                        <span className={`font-medium text-sm ${selectedTaskId === t.id ? 'text-brand-900' : 'text-gray-700'}`}>{t.title}</span>
                        <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded border border-gray-100">{t.duration}m</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
               <input type="text" placeholder="What are you working on?" value={manualTaskTitle} onChange={(e) => setManualTaskTitle(e.target.value)} className="w-full border border-gray-300 rounded-xl p-4 text-lg focus:ring-2 focus:ring-brand-500 outline-none" />
            )}
          </div>
        ) : (
           <div className="bg-white/50 border border-white/50 p-4 rounded-2xl text-center backdrop-blur-sm">
              <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Current Activity</span>
              <h3 className="text-xl font-bold text-gray-800 truncate px-4">
                {mode === 'WORK' ? (selectionMode === 'PLAN' ? tasks.find(t => t.id === selectedTaskId)?.title : manualTaskTitle) || 'Focusing...' : 'Taking a Break'}
              </h3>
           </div>
        )}

        {/* Big Timer */}
        <div className={`relative flex flex-col items-center justify-center p-8 md:p-12 rounded-3xl transition-colors duration-500 shadow-xl flex-grow max-h-[500px] ${mode === 'WORK' ? 'bg-gradient-to-br from-brand-50 to-white text-brand-900 border border-brand-100' : 'bg-gradient-to-br from-green-50 to-white text-green-900 border border-green-100'}`}>
          <div className="mb-6">
            {mode === 'WORK' ? (
              <div className="flex items-center space-x-2 bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-sm font-medium">
                <Clock className="w-4 h-4" /><span>Focus Time</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                <Coffee className="w-4 h-4"/><span>Break Time</span>
              </div>
            )}
          </div>
          
          <div className="relative mb-8 text-center w-full">
            {/* Show Editable Input ONLY if: Work Mode AND Not Active */}
            {!isActive && mode === 'WORK' ? (
               <div className="flex flex-col items-center justify-center w-full">
                  <div className="flex items-center justify-center gap-2 sm:gap-6 md:gap-12 relative z-10 w-full px-1 sm:px-2">
                      
                      {/* Minus Button */}
                      <button 
                         onClick={() => adjustDuration(-5)} 
                         className="flex-shrink-0 w-12 h-12 md:w-20 md:h-20 rounded-full border-2 border-brand-100/50 hover:bg-brand-50 hover:border-brand-200 flex items-center justify-center transition-all text-brand-300 hover:text-brand-600 active:scale-95 bg-white/50"
                      >
                         <Minus className="w-6 h-6 md:w-10 md:h-10" strokeWidth={2.5} />
                      </button>

                      {/* Number Display */}
                      <div className="relative flex items-baseline justify-center text-6xl sm:text-7xl md:text-9xl font-bold font-mono tracking-tighter text-brand-900 tabular-nums leading-none">
                           <input 
                             type="number" 
                             value={workDuration} 
                             onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val < 999) setWorkDuration(Math.max(1, val));
                             }}
                             className="w-[2ch] bg-transparent text-right border-none outline-none focus:ring-0 p-0 m-0 [&::-webkit-inner-spin-button]:appearance-none caret-brand-500"
                           />
                           <span className="opacity-80">:00</span>
                      </div>

                      {/* Plus Button */}
                      <button 
                         onClick={() => adjustDuration(5)} 
                         className="flex-shrink-0 w-12 h-12 md:w-20 md:h-20 rounded-full border-2 border-brand-100/50 hover:bg-brand-50 hover:border-brand-200 flex items-center justify-center transition-all text-brand-300 hover:text-brand-600 active:scale-95 bg-white/50"
                      >
                         <PlusIcon className="w-6 h-6 md:w-10 md:h-10" strokeWidth={2.5} />
                      </button>
                  </div>
               </div>
            ) : (
               <div className="flex flex-col items-center">
                 <div className={`text-6xl sm:text-7xl md:text-9xl font-bold font-mono tracking-tighter tabular-nums ${timeLeft < 0 ? 'text-red-500' : ''}`}>
                   {formatTime(timeLeft)}
                 </div>
                 {timeLeft < 0 && (
                   <div className="animate-pulse text-red-500 font-bold mt-2 uppercase tracking-widest text-sm">
                     Overtime
                   </div>
                 )}
               </div>
            )}
          </div>

          <div className="flex space-x-4 w-full max-w-lg justify-center items-center">
            {/* Main Action Button */}
            <Button onClick={toggleTimer} size="lg" className={`w-32 shadow-lg active:scale-95 ${mode === 'BREAK' ? 'bg-green-600 hover:bg-green-700' : ''}`}>
              {isActive ? <Pause className="w-6 h-6 mr-2" /> : <Play className="w-6 h-6 mr-2" />}
              {isActive ? 'Pause' : 'Start'}
            </Button>

            {/* Done Button */}
            {isActive && (
               <Button onClick={handleComplete} variant="secondary" size="lg" className={`shadow-md hover:bg-opacity-80 ${mode === 'WORK' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-brand-50 text-brand-700 border-brand-200'}`}>
                  <CheckCircle className="w-5 h-5 mr-2" /> Done
               </Button>
            )}

            {/* Stop/Interrupt Button */}
            {isActive && mode === 'WORK' && (
              <Button onClick={handleInterruptClick} variant="secondary" size="lg" className="shadow-md text-red-600 border-red-100 hover:bg-red-50">
                <Square className="w-5 h-5 mr-2" /> Stop
              </Button>
            )}
          </div>
          
          {!isActive && mode === 'WORK' && <p className="text-xs text-brand-400 mt-6 opacity-60">Click number to type duration</p>}
        </div>
      </div>

      {/* RIGHT: Timetable / Daily Log */}
      <div className="w-full lg:w-80 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-96 lg:h-full overflow-hidden flex-shrink-0">
         <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center z-10">
            <h3 className="font-bold text-gray-800 flex items-center">
               <Calendar className="w-4 h-4 mr-2 text-brand-600" /> Today's Log
            </h3>
            <Button size="sm" variant="ghost" onClick={() => { setEditingSession({}); setIsSessionModalOpen(true); }} className="text-xs h-8">
               <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
         </div>

         {/* Timeline Container */}
         <div ref={timelineRef} className="flex-1 overflow-y-auto relative bg-white scrollbar-thin">
            <div className="relative" style={{ height: `${TIMELINE_HEIGHT}px` }}>
               
               {/* Grid Lines & Labels */}
               {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => {
                  const hour = i + START_HOUR;
                  return (
                     <div key={i} className="absolute w-full border-t border-gray-100 text-xs text-gray-400" style={{ top: `${i * PIXELS_PER_HOUR}px` }}>
                        <span className="absolute -top-2.5 left-2 bg-white px-1">{hour}:00</span>
                     </div>
                  );
               })}

               {/* Current Time Line */}
               {(() => {
                  const now = new Date();
                  const nowMinutes = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
                  if (nowMinutes >= 0 && nowMinutes <= TIMELINE_HEIGHT / (PIXELS_PER_HOUR / 60)) {
                     return (
                        <div 
                           className="absolute w-full border-t-2 border-red-400 z-20 pointer-events-none" 
                           style={{ top: `${nowMinutes * (PIXELS_PER_HOUR / 60)}px` }}
                        >
                           <div className="absolute -top-1.5 left-0 w-3 h-3 bg-red-400 rounded-full" />
                        </div>
                     );
                  }
                  return null;
               })()}

               {/* Sessions Blocks */}
               {todaysSessions.map(session => (
                  <div
                     key={session.id}
                     onClick={() => { setEditingSession(session); setIsSessionModalOpen(true); }}
                     style={getSessionStyle(session)}
                     className={`rounded-md border shadow-sm cursor-pointer hover:brightness-95 hover:z-30 transition-all flex flex-col justify-center px-2 overflow-hidden
                        ${session.type === 'WORK' 
                           ? 'bg-brand-50 border-brand-200 text-brand-900' 
                           : 'bg-green-50 border-green-200 text-green-900'
                        }`}
                  >
                     <div className="font-semibold text-xs truncate leading-tight">{session.taskTitle}</div>
                     <div className="text-[10px] opacity-80 truncate">
                        {session.durationMinutes}m {session.status === 'MANUAL' && '(M)'}
                     </div>
                  </div>
               ))}
               
               {todaysSessions.length === 0 && (
                  <div className="absolute top-1/3 left-0 right-0 text-center text-gray-300 text-sm px-4">
                     Timeline empty.<br/>Start timer or add log.
                  </div>
               )}

            </div>
         </div>
      </div>

      {/* Interruption Modal */}
      {showInterruptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center"><AlertCircle className="w-5 h-5 mr-2"/> Interrupted?</h3>
            <textarea
              className="w-full border p-3 rounded-lg mb-4 outline-none focus:ring-2 ring-red-200"
              placeholder="Reason..."
              value={interruptionReason}
              onChange={(e) => setInterruptionReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
               <Button variant="ghost" onClick={() => setShowInterruptModal(false)}>Cancel</Button>
               <Button variant="danger" onClick={confirmInterrupt}>Log & Reset</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      <SessionModal 
         isOpen={isSessionModalOpen} 
         onClose={() => { setIsSessionModalOpen(false); setEditingSession(null); }}
         initialData={editingSession || {}}
         onSave={saveSessionToDB}
         onDelete={deleteSessionFromDB}
      />

    </div>
  );
}