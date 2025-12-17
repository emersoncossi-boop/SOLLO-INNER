import React, { useState, useEffect } from 'react';
import { Feather, Mic2, MessageSquare, Compass, Home, Sun, Moon } from 'lucide-react';
import { AppView } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: AppView;
  onChangeView: (view: AppView) => void;
}

const InnerSpaceLogo = () => (
  <svg 
    viewBox="0 0 24 24" 
    className="w-8 h-8 text-starlight shrink-0 opacity-90 hover:opacity-100 transition-opacity" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5"
    aria-label="Logo InnerSpace"
  >
    {/* Stylized 'I' representing Inner Space */}
    <path d="M12 4V10" strokeLinecap="square" />
    <path d="M12 14V20" strokeLinecap="square" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    
    {/* Caps */}
    <path d="M9 4H15" strokeLinecap="round" opacity="0.6" />
    <path d="M9 20H15" strokeLinecap="round" opacity="0.6" />
  </svg>
);

const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView }) => {
  const [isDark, setIsDark] = useState(true);

  // Initialize theme from local storage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDark(shouldBeDark);
    
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };
  
  const navItems = [
    { id: AppView.HOME, icon: Home, label: 'Início' },
    { id: AppView.MUSE, icon: Feather, label: 'Musa' },
    { id: AppView.SOUNDTRACK, icon: Mic2, label: 'Som' }, // Using Mic2 as abstract sound icon
    { id: AppView.MIRROR, icon: MessageSquare, label: 'Espelho' },
    { id: AppView.RITUALS, icon: Compass, label: 'Rituais' },
  ];

  return (
    <div className="w-screen h-screen flex flex-col bg-void text-starlight overflow-hidden font-sans transition-colors duration-500">
      
      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        {children}
      </main>

      {/* Navigation Bar */}
      <nav className="h-20 bg-surface/80 backdrop-blur-lg border-t border-mist flex items-center justify-between px-4 md:px-8 z-50 transition-colors duration-500">
        
        {/* Logo */}
        <div className="mr-2 md:mr-4 shrink-0 flex items-center justify-center">
            <InnerSpaceLogo />
        </div>

        {/* Navigation Items */}
        <div className="flex-1 flex items-center justify-around max-w-2xl mx-auto">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onChangeView(item.id)}
                  className={`flex flex-col items-center gap-1 transition-all duration-300 group ${
                    isActive ? 'text-starlight -translate-y-1' : 'text-ash hover:text-starlight'
                  }`}
                >
                  <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-mist/50' : 'group-hover:bg-mist/30'}`}>
                    <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                  </div>
                  <span className={`text-[10px] uppercase tracking-widest font-medium ${isActive ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
        </div>

        {/* Theme Toggle */}
        <div className="ml-2 md:ml-4 shrink-0 border-l border-mist pl-4 md:pl-6">
           <button
             onClick={toggleTheme}
             className="w-10 h-10 rounded-full bg-mist/30 hover:bg-mist/60 flex items-center justify-center text-starlight transition-all duration-300 hover:scale-110 active:scale-95"
             aria-label="Alternar Tema"
           >
             <div className="relative w-5 h-5">
               <Sun 
                 className={`absolute inset-0 w-5 h-5 transition-all duration-500 rotate-0 scale-100 ${isDark ? 'opacity-0 -rotate-90 scale-0' : 'opacity-100'}`} 
               />
               <Moon 
                 className={`absolute inset-0 w-5 h-5 transition-all duration-500 rotate-0 scale-100 ${!isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100'}`} 
               />
             </div>
           </button>
        </div>
      </nav>
    </div>
  );
};

export default Layout;