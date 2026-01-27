import { Link } from "wouter";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

const AlarmClockIcon = () => (
  <svg viewBox="0 0 100 100" className="w-20 h-20">
    <circle cx="50" cy="55" r="32" fill="#e3f2fd" stroke="#1976d2" strokeWidth="3"/>
    <circle cx="50" cy="55" r="26" fill="white" stroke="#1976d2" strokeWidth="2"/>
    <line x1="50" y1="55" x2="50" y2="38" stroke="#1976d2" strokeWidth="3" strokeLinecap="round"/>
    <line x1="50" y1="55" x2="62" y2="55" stroke="#1976d2" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="50" cy="55" r="3" fill="#1976d2"/>
    <ellipse cx="25" cy="30" rx="10" ry="8" fill="#ffb74d" stroke="#f57c00" strokeWidth="2"/>
    <ellipse cx="75" cy="30" rx="10" ry="8" fill="#ffb74d" stroke="#f57c00" strokeWidth="2"/>
    <rect x="45" y="18" width="10" height="8" rx="2" fill="#1976d2"/>
    <text x="82" y="28" fontSize="12" fill="#1976d2" fontWeight="bold">z</text>
    <text x="88" y="22" fontSize="10" fill="#1976d2" fontWeight="bold">z</text>
  </svg>
);

export default function Home() {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const h = hours % 12 || 12;
    return `${h.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getAmPm = (date: Date) => date.getHours() >= 12 ? 'PM' : 'AM';

  const getDayName = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  const cards = [
    { href: "/routine", title: "Set Your Routine" },
    { href: "/medicines", title: "Set Your Medicine" },
    { href: "/meetings", title: "Set Your Meeting" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="text-center pt-8 pb-4 px-4">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl royal-gradient flex items-center justify-center shadow-lg">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[#002E6E] tracking-wide uppercase">
            Your Personal Assistant
          </h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center px-4">
        <div className="text-center mb-8 mt-4">
          <div className="relative">
            <span 
              className="text-7xl md:text-8xl font-bold text-[#002E6E] tracking-tight"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              data-testid="text-current-time"
            >
              {formatTime(time)}
            </span>
            <span className="absolute -top-2 -right-12 md:-right-16 text-lg md:text-xl font-semibold text-[#002E6E]/70" data-testid="text-ampm">
              {getAmPm(time)}
            </span>
          </div>
          <p className="text-lg md:text-xl text-[#002E6E]/60 mt-2 font-medium" data-testid="text-day-name">
            {getDayName(time)}
          </p>
        </div>

        <div className="w-full max-w-sm space-y-6 pb-8">
          {cards.map((card) => (
            <Link key={card.href} href={card.href} data-testid={`link-${card.href.slice(1)}`}>
              <div 
                className="bg-white rounded-2xl py-6 px-4 shadow-md border border-slate-100 hover:shadow-lg transition-all duration-300 cursor-pointer group text-center"
                data-testid={`card-${card.href.slice(1)}`}
              >
                <div className="flex justify-center mb-3 group-hover:scale-105 transition-transform">
                  <AlarmClockIcon />
                </div>
                <h2 className="text-lg font-bold text-[#002E6E] italic">
                  {card.title}
                </h2>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
