import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Gift, Lock, Star, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';

// Mock Rewards
const REWARD_POOL = [
  { id: '1', name: 'Cheat Meal', icon: '🍔', probability: 40 },
  { id: '2', name: 'Movie Night', icon: '🎬', probability: 30 },
  { id: '3', name: 'Buy a Book/Game', icon: '🎮', probability: 20 },
  { id: '4', name: 'Day Off', icon: '🏖️', probability: 10 },
];

export default function RewardsView() {
  // In real app, calculate this from Firestore 'daily_reviews'
  const currentStreak = 4;
  const targetStreak = 5;
  const isEligible = currentStreak >= targetStreak;
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonReward, setWonReward] = useState<{name: string, icon: string} | null>(null);

  const handleDraw = () => {
    if (!isEligible || isSpinning) return;
    
    setIsSpinning(true);
    
    // Simulate Gacha delay
    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      if (counter > 15) {
        clearInterval(interval);
        finalizeDraw();
      }
    }, 100);
  };

  const finalizeDraw = () => {
    // Weighted random selection logic
    const totalWeight = REWARD_POOL.reduce((sum, item) => sum + item.probability, 0);
    let random = Math.random() * totalWeight;
    let selected = REWARD_POOL[0];
    
    for (const item of REWARD_POOL) {
      if (random < item.probability) {
        selected = item;
        break;
      }
      random -= item.probability;
    }

    setWonReward(selected);
    setIsSpinning(false);
    
    // Confetti effect
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 text-center py-10">
      
      {/* Header & Streak Status */}
      <div className="space-y-4">
         <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
           <Star className="text-yellow-400 fill-yellow-400 w-8 h-8"/> 
           Reward Center 
           <Star className="text-yellow-400 fill-yellow-400 w-8 h-8"/>
         </h1>
         <p className="text-gray-600">Keep your score high for {targetStreak} days to unlock a reward!</p>
         
         <div className="flex items-center justify-center space-x-2 mt-6">
            {[...Array(targetStreak)].map((_, i) => (
              <div 
                key={i} 
                className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all ${
                  i < currentStreak 
                    ? 'bg-brand-500 border-brand-200 text-white' 
                    : 'bg-gray-100 border-gray-200 text-gray-300'
                }`}
              >
                {i < currentStreak ? <Star className="w-6 h-6 fill-white" /> : <Lock className="w-5 h-5" />}
              </div>
            ))}
         </div>
         <p className="text-sm font-medium text-brand-600 mt-2">
            {isEligible ? "🎉 You're eligible for a draw!" : `${targetStreak - currentStreak} more good days to go!`}
         </p>
      </div>

      {/* Gacha Machine / Draw Area */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-1 shadow-2xl max-w-md mx-auto transform transition-transform hover:scale-105">
        <div className="bg-white/10 backdrop-blur-sm rounded-[20px] p-8 h-80 flex flex-col items-center justify-center border border-white/20">
            
            {wonReward ? (
              <div className="animate-bounce">
                <div className="text-8xl mb-4">{wonReward.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-2">{wonReward.name}</h3>
                <p className="text-white/80 text-sm">Enjoy your reward!</p>
                <Button 
                   onClick={() => setWonReward(null)} 
                   className="mt-6 bg-white text-purple-600 hover:bg-gray-100"
                >
                  Close
                </Button>
              </div>
            ) : (
              <>
                <Gift className={`w-32 h-32 text-white mb-6 ${isSpinning ? 'animate-ping' : ''}`} />
                <Button 
                  onClick={handleDraw} 
                  disabled={!isEligible || isSpinning}
                  className={`w-full text-lg font-bold py-4 shadow-lg ${
                    isEligible 
                      ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-300' 
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  {isSpinning ? 'Opening...' : isEligible ? 'DRAW REWARD' : 'LOCKED'}
                </Button>
              </>
            )}
            
        </div>
      </div>

      {/* Reward Pool List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl mx-auto text-left">
         <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900 flex items-center"><Sparkles className="w-4 h-4 mr-2 text-purple-500"/> Your Reward Pool</h3>
            <button className="text-sm text-brand-600 hover:underline">Edit Pool</button>
         </div>
         <div className="grid grid-cols-2 gap-4">
            {REWARD_POOL.map(item => (
              <div key={item.id} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                 <span className="text-2xl mr-3">{item.icon}</span>
                 <div>
                    <div className="font-medium text-gray-800">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.probability}% chance</div>
                 </div>
              </div>
            ))}
         </div>
      </div>

    </div>
  );
}
