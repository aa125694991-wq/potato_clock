import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { Button } from '../components/ui/Button';

// Mock Data
const WEEKLY_DATA = [
  { name: 'Sun', pomodoros: 2, score: 6 },
  { name: 'Mon', pomodoros: 8, score: 8 },
  { name: 'Tue', pomodoros: 6, score: 7 },
  { name: 'Wed', pomodoros: 9, score: 9 },
  { name: 'Thu', pomodoros: 4, score: 5 },
  { name: 'Fri', pomodoros: 7, score: 8 },
  { name: 'Sat', pomodoros: 0, score: 0 },
];

export default function ReviewView() {
  const [score, setScore] = useState(5);
  const [reflection, setReflection] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmitDaily = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic to save to 'daily_reviews' collection
    setIsSubmitted(true);
  };

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Review & Reflect</h1>
        <p className="text-gray-500">Track your progress and consistency.</p>
      </header>

      {/* Daily Review Form */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Daily Check-in</h2>
        
        {!isSubmitted ? (
          <form onSubmit={handleSubmitDaily} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How productive did you feel today? (1-10)
              </label>
              <div className="flex items-center space-x-4">
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={score} 
                  onChange={(e) => setScore(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
                <span className="text-2xl font-bold text-brand-600 w-8">{score}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reflection (Wins, blockers, or improvements)
              </label>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-brand-500 focus:border-brand-500 outline-none"
                placeholder="Today I managed to focus well, but got distracted by emails..."
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit">Save Reflection</Button>
            </div>
          </form>
        ) : (
          <div className="text-center py-8 bg-green-50 rounded-lg border border-green-100">
             <h3 className="text-green-800 font-medium text-lg">Daily review saved!</h3>
             <p className="text-green-600">Great job keeping track of your progress.</p>
          </div>
        )}
      </section>

      {/* Weekly Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pomodoro Count Chart */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Weekly Focus Hours</h2>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WEEKLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="pomodoros" fill="#e11d48" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Satisfaction Score Chart */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Satisfaction Trend</h2>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={WEEKLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

      </div>
    </div>
  );
}