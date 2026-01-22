import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  useDraggable, 
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Plus, GripHorizontal, Clock, X, Trash2, Calendar as CalendarIcon, Tag, Repeat, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Task, TaskStatus, DAYS_OF_WEEK, TaskCategory } from '../types';
import { auth, db, onAuthStateChanged } from '../services/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

// --- Configuration ---
const START_HOUR = 6; // 6 AM
const END_HOUR = 24; // 12 AM (Midnight)
const HOURS_COUNT = END_HOUR - START_HOUR;
const PIXELS_PER_HOUR = 60; 
const SNAP_MINUTES = 15; // Snap to 15 min slots

// --- Categories Config ---
const CATEGORIES: { id: TaskCategory; label: string; bg: string; border: string; text: string }[] = [
  { id: 'work', label: 'Work', bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-900' },
  { id: 'meeting', label: 'Meeting', bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-900' },
  { id: 'exercise', label: 'Exercise', bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-900' },
  { id: 'personal', label: 'Personal', bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-900' },
  { id: 'rest', label: 'Rest', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-900' },
];

const getCategoryStyles = (cat: TaskCategory) => {
  return CATEGORIES.find(c => c.id === cat) || CATEGORIES[0];
};

// --- Helpers ---
const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 && h < 24 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const getMinutesFromOffsetY = (offsetY: number) => {
  const hours = offsetY / PIXELS_PER_HOUR;
  const totalMinutes = hours * 60 + (START_HOUR * 60);
  // Snap logic
  const snapped = Math.round(totalMinutes / SNAP_MINUTES) * SNAP_MINUTES;
  return snapped;
};

// --- Components ---

interface EditTaskModalProps {
  task: Task;
  onClose: () => void;
  onSave: (updatedTask: Task) => void;
  onDelete: (taskId: string) => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState(task.title);
  const [duration, setDuration] = useState(task.duration);
  const [category, setCategory] = useState<TaskCategory>(task.category);

  const handleSave = () => {
    onSave({
      ...task,
      title,
      category,
      duration: parseInt(String(duration)),
      estimatedPomodoros: parseInt(String(duration)) / 30
    });
    onClose();
  };

  const startTimeStr = task.startMinutes !== undefined ? formatTime(task.startMinutes) : 'Unscheduled';
  
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">Edit Task</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">Category (Color)</label>
             <div className="flex flex-wrap gap-2">
               {CATEGORIES.map(cat => (
                 <button
                   key={cat.id}
                   onClick={() => setCategory(cat.id)}
                   className={`px-3 py-1 rounded-full text-xs font-medium border ${cat.bg} ${cat.text} ${cat.border} ${category === cat.id ? 'ring-2 ring-offset-1 ring-gray-400' : 'opacity-70'}`}
                 >
                   {cat.label}
                 </button>
               ))}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
               <input 
                type="number" 
                min="15"
                step="15"
                value={duration} 
                onChange={e => setDuration(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
               <div className="text-sm text-gray-600 py-2 bg-gray-50 rounded px-2 border border-gray-200 truncate">
                  {startTimeStr}
               </div>
            </div>
          </div>
          
          {task.dayIndex !== undefined && (
             <div className="flex items-center text-xs text-brand-600 bg-brand-50 p-2 rounded">
                <CalendarIcon className="w-3 h-3 mr-1"/>
                Scheduled for {DAYS_OF_WEEK[task.dayIndex]}
             </div>
          )}

        </div>

        <div className="p-4 border-t border-gray-100 flex justify-between bg-gray-50">
          <Button variant="danger" size="sm" onClick={() => { onDelete(task.id); onClose(); }}>
            <Trash2 className="w-4 h-4 mr-1"/> Delete
          </Button>
          <div className="space-x-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DraggableTaskProps {
  task: Task;
  isOverlay?: boolean;
  onClick?: (task: Task) => void;
}

const DraggableTask: React.FC<DraggableTaskProps> = ({ task, isOverlay = false, onClick }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: false
  });

  const style = getCategoryStyles(task.category);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => !isDragging && onClick?.(task)}
      className={`${style.bg} ${style.border} border rounded-lg p-3 shadow-sm flex flex-col justify-between cursor-grab active:cursor-grabbing hover:brightness-95 group relative transition-transform
        ${isDragging ? 'opacity-50' : 'opacity-100'} 
        ${isOverlay ? 'shadow-xl scale-105 rotate-2 z-50 w-48' : 'w-48 flex-shrink-0 hover:-translate-y-1'}`}
    >
      <div className={`font-medium ${style.text} truncate text-sm`}>{task.title}</div>
      <div className={`text-xs ${style.text} opacity-80 flex items-center mt-1`}>
        <Clock className="w-3 h-3 mr-1"/> {task.duration}m
      </div>
    </div>
  );
};

interface ScheduledTaskProps {
  task: Task;
  onResizeEnd: (id: string, newDuration: number) => void;
  onClick?: (task: Task) => void;
}

const ScheduledTask: React.FC<ScheduledTaskProps> = ({ 
  task, 
  onResizeEnd,
  onClick
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `scheduled-${task.id}`,
    data: { task, type: 'scheduled' },
  });

  // Position calculations
  const top = ((task.startMinutes! - (START_HOUR * 60)) / 60) * PIXELS_PER_HOUR;
  const height = (task.duration / 60) * PIXELS_PER_HOUR;
  const style = getCategoryStyles(task.category);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isResizing, setIsResizing] = useState(false);
  
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent drag
    e.preventDefault();
    setIsResizing(true);
    
    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Logic handled in mouseup/end for simplicity in React state updates
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      const deltaY = upEvent.clientY - startY;
      const newHeight = Math.max(30, startHeight + deltaY);
      const newDuration = Math.round((newHeight / PIXELS_PER_HOUR) * 60 / 15) * 15;
      
      setIsResizing(false);
      onResizeEnd(task.id, newDuration);
      
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (top < 0) return null; // Task starts before view
  
  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        top: `${top}px`,
        height: `${height}px`,
        left: '2px',
        right: '2px',
        zIndex: isDragging ? 50 : 10,
        opacity: isDragging ? 0.6 : 1,
      }}
      onClick={(e) => {
        // Simple heuristic to prevent click triggering after a drag release
        if (!isDragging) {
           onClick?.(task);
        }
      }}
      className={`${style.bg} ${style.border} border rounded text-xs p-1 overflow-hidden group hover:z-20 shadow-sm transition-all hover:brightness-95 cursor-pointer`}
    >
      {/* Drag Handle (Entire Body) */}
      <div {...listeners} {...attributes} className="w-full h-full">
         <div className={`font-semibold ${style.text} truncate leading-tight`}>{task.title}</div>
         {height > 30 && <div className={`${style.text} opacity-80 text-[10px] mt-0.5`}>{formatTime(task.startMinutes!)} - {formatTime(task.startMinutes! + task.duration)}</div>}
      </div>

      {/* Resize Handle (Bottom) */}
      <div 
        onMouseDown={handleResizeStart}
        className="absolute bottom-0 left-0 right-0 h-3 cursor-s-resize flex items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity pb-0.5 z-30"
      >
        <div className={`w-8 h-1 ${style.text} bg-current opacity-30 rounded-full`}></div>
      </div>
    </div>
  );
};

interface DayColumnProps {
  dayIndex: number;
  label: string;
  tasks: Task[];
  onResizeTask: (id: string, d: number) => void;
  onTaskClick: (task: Task) => void;
}

const DayColumn: React.FC<DayColumnProps> = ({ 
  dayIndex, 
  label, 
  tasks, 
  onResizeTask,
  onTaskClick
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayIndex}`,
    data: { dayIndex },
  });

  return (
    <div 
      ref={setNodeRef}
      className={`flex-1 min-w-[100px] border-r border-gray-200 relative bg-white transition-colors ${isOver ? 'bg-blue-50' : ''}`}
    >
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 p-2 text-center shadow-sm h-10">
        <span className="font-semibold text-gray-700 text-sm">{label}</span>
      </div>
      
      {/* Grid Lines & Content */}
      <div className="relative" style={{ height: `${HOURS_COUNT * PIXELS_PER_HOUR}px` }}>
        {/* Background Grid Lines */}
        {Array.from({ length: HOURS_COUNT }).map((_, i) => (
          <div 
            key={i} 
            className="border-b border-gray-100 absolute w-full pointer-events-none"
            style={{ top: `${(i + 1) * PIXELS_PER_HOUR}px`, height: '1px' }}
          />
        ))}

        {/* Tasks */}
        {tasks.map(task => (
           <ScheduledTask key={task.id} task={task} onResizeEnd={onResizeTask} onClick={onTaskClick} />
        ))}
      </div>
    </div>
  );
};

interface DroppableInboxProps {
  children: React.ReactNode;
}

// Simple wrapper to allow dropping back to inbox
const DroppableInbox: React.FC<DroppableInboxProps> = ({ children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'inbox-droppable' });
  return (
    <div ref={setNodeRef} className={`transition-colors rounded-lg ${isOver ? 'bg-brand-50 ring-2 ring-brand-200' : ''}`}>
      {children}
    </div>
  );
};

export default function PlanningView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(auth?.currentUser);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('work');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Recurring Options State
  const [showRecurringOptions, setShowRecurringOptions] = useState(false);
  const [repeatCount, setRepeatCount] = useState(1);
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  );

  // --- Persistence Logic ---

  useEffect(() => {
    // Helper to load local tasks
    const loadLocalTasks = () => {
      const saved = localStorage.getItem('local_tasks');
      if (saved) {
         try {
           setTasks(JSON.parse(saved));
         } catch(e) { console.error("Error parsing local tasks", e); }
      }
      setIsLoading(false);
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
           setIsLoading(false);
        }, (error) => {
           // If Firestore permissions fail (e.g. unauthenticated but auth object exists), fallback
           console.warn("Firestore sync failed, using local storage:", error);
           loadLocalTasks();
        });
        return () => unsubscribeSnapshot();
      } else {
        // Fallback to localStorage for guest experience
        loadLocalTasks();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Update localStorage when tasks change (only if guest)
  useEffect(() => {
    if (!user && !isLoading) {
       localStorage.setItem('local_tasks', JSON.stringify(tasks));
    }
  }, [tasks, user, isLoading]);

  // Firestore Write Helpers
  const addTaskToDB = async (task: Task) => {
    if (user) {
      // Optimistic update
      setTasks(prev => [...prev, task]);
      try {
        await setDoc(doc(db, 'users', user.uid, 'tasks', task.id), task);
      } catch (e) {
        console.warn("Failed to save to cloud, ensure you are logged in.", e);
      }
    } else {
      setTasks(prev => [...prev, task]);
    }
  };

  const updateTaskInDB = async (taskId: string, updates: Partial<Task>) => {
    if (user) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
      try {
        await updateDoc(doc(db, 'users', user.uid, 'tasks', taskId), updates);
      } catch (e) { console.warn("Cloud update failed", e); }
    } else {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    }
  };

  const deleteTaskInDB = async (taskId: string) => {
    if (user) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'tasks', taskId));
      } catch (e) { console.warn("Cloud delete failed", e); }
    } else {
      setTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };


  const toggleDaySelection = (index: number) => {
    if (selectedWeekDays.includes(index)) {
      setSelectedWeekDays(selectedWeekDays.filter(d => d !== index));
    } else {
      setSelectedWeekDays([...selectedWeekDays, index]);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const baseTask = {
      title: newTaskTitle,
      status: TaskStatus.TODO,
      category: newTaskCategory,
      duration: 60,
      estimatedPomodoros: 2,
      completedPomodoros: 0,
      startMinutes: undefined
    };

    const newTasksToAdd: Task[] = [];

    // Mode 1: Repeat on specific days (Directly schedule)
    if (showRecurringOptions && selectedWeekDays.length > 0) {
      selectedWeekDays.forEach(dayIndex => {
        newTasksToAdd.push({
          ...baseTask,
          id: Math.random().toString(36).substr(2, 9),
          dayIndex: dayIndex,
          startMinutes: 9 * 60 // Default to 9 AM for auto-scheduled
        });
      });
    } 
    // Mode 2: Repeat count (Add to Inbox)
    else if (showRecurringOptions && repeatCount > 1) {
      for (let i = 0; i < repeatCount; i++) {
        newTasksToAdd.push({
          ...baseTask,
          id: Math.random().toString(36).substr(2, 9),
          dayIndex: undefined
        });
      }
    } 
    // Mode 3: Single add (Inbox)
    else {
      newTasksToAdd.push({
        ...baseTask,
        id: Math.random().toString(36).substr(2, 9),
        dayIndex: undefined
      });
    }

    // Process all adds
    for (const t of newTasksToAdd) {
       await addTaskToDB(t);
    }
    
    // Reset form
    setNewTaskTitle('');
    setRepeatCount(1);
    setSelectedWeekDays([]);
    setShowRecurringOptions(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id || `scheduled-${t.id}` === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    // Identify Drop Target
    const overId = over.id.toString();
    const isDayColumn = overId.startsWith('day-');
    
    const originalTaskId = active.id.toString().replace('scheduled-', '');
    const currentTask = tasks.find(t => t.id === originalTaskId);
    if (!currentTask) return;

    if (isDayColumn) {
      const dayIndex = parseInt(overId.split('-')[1]);
      
      // Calculate Time
      const dropY = active.rect.current.translated?.top || 0;
      const columnTop = over.rect.top;
      const relativeY = dropY - columnTop - 40; // Subtract header height (~40px)
      
      let newStartMinutes = getMinutesFromOffsetY(relativeY);
      
      // Clamp time
      if (newStartMinutes < START_HOUR * 60) newStartMinutes = START_HOUR * 60;
      if (newStartMinutes > END_HOUR * 60 - 30) newStartMinutes = END_HOUR * 60 - 30; // Prevent drop at very bottom
      
      await updateTaskInDB(originalTaskId, {
        dayIndex: dayIndex,
        startMinutes: newStartMinutes
      });

    } else if (overId === 'inbox-droppable') {
       // Only update if it actually changed
       if (currentTask.dayIndex !== undefined) {
          // Note: To "remove" fields in Firestore, strict usage requires deleteField(), but setting to null/undefined usually works in client SDKs or we ignore them in UI
          // For TS safety we cast undefined, but Firestore needs explicit handling if strict. 
          // Here we just update the local object structure which works with setDoc merge usually.
          // To be safe, we reconstruct the object without those fields or set them to null if our types allow.
          // Our types say optional.
          // Firestore actually ignores undefined, so we can't "unset" it easily with updateDoc unless we use deleteField().
          // A simple hack is updating the whole document with setDoc(..., {merge: true}).
          
          const updatedTask = { ...currentTask, dayIndex: undefined, startMinutes: undefined };
          // Local update requires removing the keys for clean UI state
          delete updatedTask.dayIndex;
          delete updatedTask.startMinutes;
          
          if (user) {
             setTasks(prev => prev.map(t => t.id === originalTaskId ? updatedTask : t));
             // For Firestore, to delete a field, we ideally use deleteField(), but replacing the doc works too if we have all data
             await setDoc(doc(db, 'users', user.uid, 'tasks', originalTaskId), updatedTask);
          } else {
             setTasks(prev => prev.map(t => t.id === originalTaskId ? updatedTask : t));
          }
       }
    }
  };

  const handleResizeTask = async (taskId: string, newDuration: number) => {
    await updateTaskInDB(taskId, {
      duration: newDuration,
      estimatedPomodoros: newDuration / 30
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTaskInDB(taskId);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    await updateTaskInDB(updatedTask.id, updatedTask);
  };

  const unscheduledTasks = tasks.filter(t => t.dayIndex === undefined);

  if (isLoading) {
     return <div className="h-full flex items-center justify-center text-gray-400"><Loader2 className="animate-spin w-8 h-8"/></div>;
  }

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="h-full flex flex-col overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm">
          
          {/* TOP: Inbox / Planner */}
          <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 p-4 z-40">
            <div className="flex flex-col space-y-3">
               
               {/* Creation Form */}
               <div className="flex items-start justify-between">
                  <h2 className="font-bold text-gray-800 flex items-center mt-1.5"><GripHorizontal className="w-5 h-5 mr-2"/> Inbox</h2>
                  
                  <div className="flex flex-col items-end gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                    <form onSubmit={handleAddTask} className="flex space-x-2 items-center">
                      <select 
                        value={newTaskCategory}
                        onChange={(e) => setNewTaskCategory(e.target.value as TaskCategory)}
                        className="text-xs border border-gray-300 rounded px-2 py-1.5 bg-gray-50 outline-none focus:ring-1 focus:ring-brand-500"
                      >
                         {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>

                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="New task title..."
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-brand-500 outline-none w-48"
                      />
                      
                      <Button 
                        type="button" 
                        size="sm" 
                        variant={showRecurringOptions ? 'primary' : 'secondary'}
                        onClick={() => setShowRecurringOptions(!showRecurringOptions)}
                        title="Recurring Options"
                        className="px-2"
                      >
                         <Repeat className="w-4 h-4" />
                      </Button>

                      <Button type="submit" size="sm"><Plus className="w-4 h-4"/></Button>
                    </form>

                    {/* Recurring Options Dropdown Area */}
                    {showRecurringOptions && (
                       <div className="w-full text-sm space-y-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center space-x-2">
                             <span className="text-gray-500 text-xs">Copies:</span>
                             <input 
                               type="number" min="1" max="10" 
                               value={repeatCount} 
                               onChange={(e) => setRepeatCount(parseInt(e.target.value))}
                               className="w-12 border border-gray-300 rounded px-1 py-0.5 text-xs"
                               disabled={selectedWeekDays.length > 0}
                             />
                             <span className="text-xs text-gray-400">(Disabled if specific days selected)</span>
                          </div>
                          
                          <div className="flex flex-col space-y-1">
                             <span className="text-gray-500 text-xs">Or schedule on days:</span>
                             <div className="flex space-x-1">
                                {DAYS_OF_WEEK.map((d, i) => (
                                   <button 
                                      key={d}
                                      type="button"
                                      onClick={() => toggleDaySelection(i)}
                                      className={`w-6 h-6 rounded-full text-[10px] flex items-center justify-center border transition-colors ${
                                         selectedWeekDays.includes(i) 
                                         ? 'bg-brand-500 text-white border-brand-600' 
                                         : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                                      }`}
                                   >
                                      {d[0]}
                                   </button>
                                ))}
                             </div>
                          </div>
                       </div>
                    )}
                  </div>
               </div>

              {/* Inbox List */}
              <DroppableInbox>
                <div className="flex space-x-3 overflow-x-auto pb-2 min-h-[80px] items-center scrollbar-thin">
                    {unscheduledTasks.length === 0 && <span className="text-gray-400 text-sm italic pl-2">Add tasks above to start planning.</span>}
                    {unscheduledTasks.map(task => (
                      <DraggableTask key={task.id} task={task} onClick={() => setEditingTask(task)} />
                    ))}
                </div>
              </DroppableInbox>
            </div>
          </div>

          {/* BOTTOM: Weekly Calendar Grid */}
          <div className="flex-1 overflow-auto flex relative w-full">
            
            {/* Time Labels Column */}
            <div className="w-16 flex-shrink-0 bg-white border-r border-gray-200 pt-10 sticky left-0 z-20">
              {Array.from({ length: HOURS_COUNT }).map((_, i) => {
                const hour = i + START_HOUR;
                const ampm = hour >= 12 && hour < 24 ? 'PM' : 'AM';
                const h12 = hour % 12 || 12;
                return (
                  <div key={i} className="h-[60px] text-xs text-gray-400 text-right pr-2 -mt-2.5">
                    {h12} {ampm}
                  </div>
                );
              })}
              {/* Add final midnight label if needed, though strictly grid handles slots */}
            </div>

            {/* Days Columns */}
            <div className="flex flex-1 w-full min-w-[700px]">
              {DAYS_OF_WEEK.map((day, index) => (
                <DayColumn 
                  key={day} 
                  dayIndex={index} 
                  label={day} 
                  tasks={tasks.filter(t => t.dayIndex === index)}
                  onResizeTask={handleResizeTask}
                  onTaskClick={(t) => setEditingTask(t)}
                />
              ))}
            </div>

          </div>
        </div>

        <DragOverlay>
          {activeTask ? <DraggableTask task={activeTask} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Edit Modal */}
      {editingTask && (
        <EditTaskModal 
          task={editingTask} 
          onClose={() => setEditingTask(null)}
          onSave={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}
    </>
  );
}