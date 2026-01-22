import React, { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Calendar, Timer, Award, BarChart2 } from 'lucide-react';
import { onAuthStateChanged, signInAnonymously, User, auth } from '../services/firebase';

const Layout: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!auth) return;

    // Listen for auth state
    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        // Auto-login anonymously if no user
        signInAnonymously(auth).catch((error: any) => {
          // If anonymous auth is not enabled in Firebase Console, fall back to offline mode quietly
          if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed' || error.code === 'auth/admin-restricted-operation') {
             console.warn("Online features disabled: Anonymous authentication is not enabled in Firebase project.");
          } else {
             console.error("Auto-login failed:", error);
          }
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const navItems = [
    { to: '/', icon: Calendar, label: 'Plan' },
    { to: '/focus', icon: Timer, label: 'Focus' },
    { to: '/review', icon: BarChart2, label: 'Review' },
    { to: '/rewards', icon: Award, label: 'Rewards' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6 flex items-center space-x-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
          <span className="text-xl font-bold text-gray-900">PomoRewards</span>
        </div>
        
        {/* Simplified User Info */}
        <div className="px-6 pb-4">
           <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg border border-gray-100 opacity-70">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs">
                Me
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">My Workspace</p>
              </div>
           </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-brand-50 text-brand-600 font-medium' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center">
         <span className="text-lg font-bold text-gray-900">PomoRewards</span>
         <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs">M</div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto h-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden bg-white border-t border-gray-200 flex justify-around p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center p-2 rounded-lg ${
                isActive ? 'text-brand-600' : 'text-gray-500'
              }`
            }
          >
            <item.icon className="w-6 h-6" />
            <span className="text-xs mt-1">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Layout;