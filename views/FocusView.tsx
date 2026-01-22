import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, AlertCircle, CheckCircle2, Coffee, List, PenTool, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Task, TaskStatus, DAYS_OF_WEEK } from '../types';
import { auth, db, onAuthStateChanged } from '../services/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';

// Constants
const WORK_MINUTES = 25;
const SHORT_BREAK_MINUTES = 5;

export default function FocusView() {
  // Timer State
  const [timeLeft, setTimeLeft] = useState(WORK_MINUTES * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'WORK' | 'BREAK'>('WORK');
  
  // Task Selection State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState(auth?.currentUser);
  const [selectionMode, setSelectionMode] = useState<'PLAN' | 'MANUAL'>('PLAN');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [manualTaskTitle, setManualTaskTitle] = useState('');
  
  // Interruption State
  const [showInterruptModal, setShowInterruptModal] = useState(false);
  const [interruptionReason, setInterruptionReason] = useState('');
  
  // Timer Ref
  const timerRef = useRef<number | null>(null);

  // --- Data Loading Logic (Matches PlanningView) ---
  useEffect(() => {
    // Helper to load local tasks
    const loadLocalTasks = () => {
      const saved = localStorage.getItem('local_tasks');
      if (saved) {
         try {
           setTasks(JSON.parse(saved));
         } catch(e) { console.error("Error parsing local tasks", e); }
      }
    };

    if (!auth) {
      loadLocalTasks();
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser: any) => {
      setUser(currentUser);
      if (currentUser) {
        // Sync with Firestore
        const q = query(collection(db, 'users', currentUser.uid, 'tasks'));
        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
           const newTasks = snapshot.docs.map(d => ({id: d.id, ...d.data()})) as Task[];
           setTasks(newTasks);
        }, (error) => {
           console.warn("Firestore sync failed, using local storage:", error);
           loadLocalTasks();
        });
        return () => unsubscribeSnapshot();
      } else {
        loadLocalTasks();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Filter tasks for Today
  const currentDayIndex = new Date().getDay();
  const todaysTasks = tasks.filter(t => t.dayIndex === currentDayIndex);

  // Determine current active task name
  const activeTaskTitle = selectionMode === 'PLAN' 
    ? tasks.find(t => t.id === selectedTaskId)?.title 
    : manualTaskTitle;

  // --- Timer Logic ---

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleComplete();
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    if (mode === 'WORK' && !isActive) {
      // Validation before starting
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

  const handleComplete = () => {
    setIsActive(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
    
    if (mode === 'WORK') {
      // Play sound or notification here
      setMode('BREAK');
      setTimeLeft(SHORT_BREAK_MINUTES * 60);
    } else {
      setMode('WORK');
      setTimeLeft(WORK_MINUTES * 60);
    }
  };

  const handleInterruptClick = () => {
    setIsActive(false);
    setShowInterruptModal(true);
  };

  const confirmInterrupt = () => {
    console.log("Interrupted:", interruptionReason);
    // Here you would typically save the interruption to the DB
    setShowInterruptModal(false);
    setInterruptionReason('');
    setTimeLeft(WORK_MINUTES * 60); // Reset
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const setCustomDuration = (mins: number) => {
    setTimeLeft(mins * 60);
    setIsActive(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4 md:py-8">
      
      {/* --- Task Selection Section (Only visible when not active to prevent distraction) --- */}
      {!isActive && mode === 'WORK' ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">What are you working on?</h2>
            
            {/* Toggle Mode */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setSelectionMode('PLAN')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center ${selectionMode === 'PLAN' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <List className="w-3 h-3 mr-1.5"/> My Plan
              </button>
              <button 
                onClick={() => setSelectionMode('MANUAL')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center ${selectionMode === 'MANUAL' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
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
                   <p className="text-xs text-brand-500 mt-1 cursor-pointer" onClick={() => setSelectionMode('MANUAL')}>Use custom input instead</p>
                </div>
              ) : (
                <div className="grid gap-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                  {todaysTasks.map(t => (
                    <div 
                      key={t.id}
                      onClick={() => setSelectedTaskId(t.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${
                        selectedTaskId === t.id 
                          ? 'bg-brand-50 border-brand-200 ring-1 ring-brand-200' 
                          : 'bg-white border-gray-100 hover:border-brand-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`font-medium text-sm ${selectedTaskId === t.id ? 'text-brand-900' : 'text-gray-700'}`}>
                        {t.title}
                      </span>
                      <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded border border-gray-100">
                        {t.duration}m
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
               <input
                 type="text"
                 placeholder="Enter task name..."
                 value={manualTaskTitle}
                 onChange={(e) => setManualTaskTitle(e.target.value)}
                 className="w-full border border-gray-300 rounded-xl p-4 pl-4 text-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
               />
            </div>
          )}
        </div>
      ) : (
         // Active State Display
         <div className="bg-white/50 border border-white/50 p-4 rounded-2xl text-center mb-2 backdrop-blur-sm">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Current Task</span>
            <h3 className="text-xl font-bold text-gray-800 truncate px-4">
              {mode === 'WORK' ? (activeTaskTitle || 'Focusing...') : 'Taking a Break'}
            </h3>
         </div>
      )}

      {/* --- Timer Display --- */}
      <div className={`relative flex flex-col items-center justify-center p-8 md:p-12 rounded-3xl transition-colors duration-500 shadow-xl ${mode === 'WORK' ? 'bg-gradient-to-br from-brand-50 to-white text-brand-900 border border-brand-100' : 'bg-gradient-to-br from-green-50 to-white text-green-900 border border-green-100'}`}>
        <div className="absolute top-4 right-4 flex space-x-2">
           <button onClick={() => setCustomDuration(25)} className="px-2 py-1 text-xs bg-white/50 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-colors">25m</button>
           <button onClick={() => setCustomDuration(50)} className="px-2 py-1 text-xs bg-white/50 rounded hover:bg-white border border-transparent hover:border-gray-200 transition-colors">50m</button>
        </div>
        
        <div className="mb-6">
          {mode === 'WORK' ? (
            <div className="flex items-center space-x-2 bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-sm font-medium">
              <TimerIcon /><span>Focus Time</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
              <Coffee className="w-4 h-4"/><span>Break Time</span>
            </div>
          )}
        </div>
        
        <div className="text-7xl md:text-9xl font-bold font-mono tracking-tighter mb-8 tabular-nums">
          {formatTime(timeLeft)}
        </div>

        <div className="flex space-x-4 w-full max-w-xs justify-center">
          <Button 
            onClick={toggleTimer} 
            size="lg" 
            className={`w-32 shadow-lg transform transition-transform active:scale-95 ${mode === 'BREAK' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : ''}`}
          >
            {isActive ? <Pause className="w-6 h-6 mr-2" /> : <Play className="w-6 h-6 mr-2" />}
            {isActive ? 'Pause' : 'Start'}
          </Button>

          {mode === 'WORK' && (
            <Button onClick={handleInterruptClick} variant="secondary" size="lg" className="shadow-md">
              <Square className="w-5 h-5 mr-2 text-gray-500" fill="currentColor" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* Interruption Modal */}
      {showInterruptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl transform transition-all scale-100">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
               <AlertCircle className="w-6 h-6" />
               <h3 className="text-lg font-bold">Log Interruption</h3>
            </div>
            <p className="text-gray-600 mb-4">It happens! Record why you stopped so you can review it later.</p>
            
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-brand-500 outline-none min-h-[100px]"
              placeholder="E.g., Phone call, Colleague request, Tired..."
              value={interruptionReason}
              onChange={(e) => setInterruptionReason(e.target.value)}
              autoFocus
            />

            <div className="flex justify-end space-x-3">
              <Button variant="ghost" onClick={() => setShowInterruptModal(false)}>Cancel</Button>
              <Button variant="danger" onClick={confirmInterrupt} disabled={!interruptionReason.trim()}>Log & Reset</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimerIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}