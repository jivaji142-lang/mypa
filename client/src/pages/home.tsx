import { Link } from "wouter";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

const RoutineIcon = () => (
  <svg viewBox="0 0 120 120" className="w-24 h-24">
    <defs>
      <linearGradient id="clock3dR" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#64b5f6"/>
        <stop offset="30%" stopColor="#42a5f5"/>
        <stop offset="70%" stopColor="#1e88e5"/>
        <stop offset="100%" stopColor="#1565c0"/>
      </linearGradient>
      <linearGradient id="bell3dR" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffeb3b"/>
        <stop offset="50%" stopColor="#ffc107"/>
        <stop offset="100%" stopColor="#ff8f00"/>
      </linearGradient>
      <linearGradient id="faceR" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff"/>
        <stop offset="100%" stopColor="#e3f2fd"/>
      </linearGradient>
      <filter id="shadow3d" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3"/>
      </filter>
      <radialGradient id="shineR" cx="30%" cy="30%" r="50%">
        <stop offset="0%" stopColor="white" stopOpacity="0.6"/>
        <stop offset="100%" stopColor="white" stopOpacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="60" cy="112" rx="25" ry="6" fill="#1565c0" opacity="0.25"/>
    <g filter="url(#shadow3d)">
      <ellipse cx="30" cy="30" rx="14" ry="12" fill="url(#bell3dR)"/>
      <ellipse cx="90" cy="30" rx="14" ry="12" fill="url(#bell3dR)"/>
      <rect x="55" y="16" width="10" height="14" rx="3" fill="#1565c0"/>
      <circle cx="60" cy="62" r="40" fill="url(#clock3dR)"/>
      <circle cx="60" cy="62" r="32" fill="url(#faceR)"/>
      <circle cx="60" cy="62" r="40" fill="url(#shineR)"/>
    </g>
    <circle cx="60" cy="48" r="2" fill="#1565c0"/>
    <circle cx="74" cy="62" r="2" fill="#1565c0"/>
    <circle cx="60" cy="76" r="2" fill="#1565c0"/>
    <circle cx="46" cy="62" r="2" fill="#1565c0"/>
    <line x1="60" y1="62" x2="60" y2="48" stroke="#0d47a1" strokeWidth="3" strokeLinecap="round"/>
    <line x1="60" y1="62" x2="72" y2="62" stroke="#1565c0" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="60" cy="62" r="4" fill="#0d47a1"/>
    <circle cx="60" cy="62" r="2" fill="#ffc107"/>
    <text x="92" y="18" fontSize="14" fill="#1976d2" fontWeight="bold">Z</text>
    <text x="102" y="10" fontSize="11" fill="#42a5f5" fontWeight="bold">z</text>
    <text x="108" y="4" fontSize="8" fill="#90caf9" fontWeight="bold">z</text>
  </svg>
);

const MedicineIcon = () => (
  <svg viewBox="0 0 120 120" className="w-24 h-24">
    <defs>
      <linearGradient id="capsule3d" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ff8a80"/>
        <stop offset="50%" stopColor="#ff5252"/>
        <stop offset="100%" stopColor="#d32f2f"/>
      </linearGradient>
      <linearGradient id="capsule3dW" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff"/>
        <stop offset="50%" stopColor="#fafafa"/>
        <stop offset="100%" stopColor="#e0e0e0"/>
      </linearGradient>
      <linearGradient id="bottle3d" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#81d4fa"/>
        <stop offset="30%" stopColor="#4fc3f7"/>
        <stop offset="70%" stopColor="#29b6f6"/>
        <stop offset="100%" stopColor="#0288d1"/>
      </linearGradient>
      <linearGradient id="heart3d" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ff8a80"/>
        <stop offset="50%" stopColor="#f44336"/>
        <stop offset="100%" stopColor="#c62828"/>
      </linearGradient>
      <filter id="shadow3dM" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3"/>
      </filter>
      <radialGradient id="shineM" cx="30%" cy="30%" r="50%">
        <stop offset="0%" stopColor="white" stopOpacity="0.5"/>
        <stop offset="100%" stopColor="white" stopOpacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="60" cy="112" rx="30" ry="6" fill="#0288d1" opacity="0.2"/>
    <g filter="url(#shadow3dM)">
      <rect x="40" y="35" width="40" height="60" rx="8" fill="url(#bottle3d)"/>
      <rect x="45" y="25" width="30" height="14" rx="4" fill="#01579b"/>
      <rect x="48" y="50" width="24" height="20" rx="3" fill="white" opacity="0.9"/>
      <path d="M55 55 L60 62 L70 52" fill="none" stroke="#4caf50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
    <g filter="url(#shadow3dM)" transform="translate(5, 70) rotate(-30)">
      <rect x="0" y="0" width="28" height="12" rx="6" fill="url(#capsule3d)"/>
      <rect x="14" y="0" width="14" height="12" rx="6" fill="url(#capsule3dW)"/>
      <ellipse cx="14" cy="6" rx="3" ry="5" fill="url(#shineM)"/>
    </g>
    <g filter="url(#shadow3dM)" transform="translate(80, 55) rotate(15)">
      <rect x="0" y="0" width="24" height="10" rx="5" fill="url(#capsule3dW)"/>
      <rect x="0" y="0" width="12" height="10" rx="5" fill="#ffc107"/>
    </g>
    <g filter="url(#shadow3dM)">
      <path d="M100 30 C100 24 94 18 88 18 C82 18 78 24 78 28 C78 36 88 44 88 44 C88 44 100 36 100 30 Z" fill="url(#heart3d)"/>
    </g>
    <circle cx="14" cy="28" r="8" fill="#66bb6a"/>
    <text x="10" y="32" fontSize="12" fill="white" fontWeight="bold">+</text>
  </svg>
);

const MeetingIcon = () => (
  <svg viewBox="0 0 120 120" className="w-24 h-24">
    <defs>
      <linearGradient id="calendar3d" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#b39ddb"/>
        <stop offset="30%" stopColor="#9575cd"/>
        <stop offset="70%" stopColor="#7e57c2"/>
        <stop offset="100%" stopColor="#5e35b1"/>
      </linearGradient>
      <linearGradient id="calTop3d" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#7e57c2"/>
        <stop offset="100%" stopColor="#4527a0"/>
      </linearGradient>
      <linearGradient id="person3d" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#4fc3f7"/>
        <stop offset="50%" stopColor="#29b6f6"/>
        <stop offset="100%" stopColor="#0288d1"/>
      </linearGradient>
      <linearGradient id="person3d2" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#81c784"/>
        <stop offset="50%" stopColor="#66bb6a"/>
        <stop offset="100%" stopColor="#43a047"/>
      </linearGradient>
      <linearGradient id="face3d" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffcc80"/>
        <stop offset="100%" stopColor="#ffb74d"/>
      </linearGradient>
      <filter id="shadow3dMt" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3"/>
      </filter>
    </defs>
    <ellipse cx="60" cy="112" rx="35" ry="6" fill="#5e35b1" opacity="0.2"/>
    <g filter="url(#shadow3dMt)">
      <rect x="30" y="25" width="60" height="70" rx="6" fill="url(#calendar3d)"/>
      <rect x="30" y="25" width="60" height="18" rx="6" fill="url(#calTop3d)"/>
      <rect x="30" y="37" width="60" height="6" fill="url(#calTop3d)"/>
      <rect x="40" y="18" width="6" height="16" rx="3" fill="#37474f"/>
      <rect x="74" y="18" width="6" height="16" rx="3" fill="#37474f"/>
      <rect x="38" y="50" width="44" height="38" rx="3" fill="white" opacity="0.95"/>
    </g>
    <g filter="url(#shadow3dMt)">
      <circle cx="50" cy="64" r="8" fill="url(#face3d)"/>
      <ellipse cx="50" cy="80" rx="8" ry="10" fill="url(#person3d)"/>
    </g>
    <g filter="url(#shadow3dMt)">
      <circle cx="70" cy="64" r="8" fill="url(#face3d)"/>
      <ellipse cx="70" cy="80" rx="8" ry="10" fill="url(#person3d2)"/>
    </g>
    <circle cx="47" cy="62" r="1.5" fill="#5d4037"/>
    <circle cx="53" cy="62" r="1.5" fill="#5d4037"/>
    <path d="M47 67 Q50 70 53 67" fill="none" stroke="#5d4037" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="67" cy="62" r="1.5" fill="#5d4037"/>
    <circle cx="73" cy="62" r="1.5" fill="#5d4037"/>
    <path d="M67 67 Q70 70 73 67" fill="none" stroke="#5d4037" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="15" cy="50" r="10" fill="#ffc107"/>
    <line x1="15" y1="50" x2="15" y2="43" stroke="#ff6f00" strokeWidth="2" strokeLinecap="round"/>
    <line x1="15" y1="50" x2="20" y2="50" stroke="#ff6f00" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="15" cy="50" r="2" fill="#ff6f00"/>
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
    { href: "/routine", title: "Set Your Routine", icon: RoutineIcon },
    { href: "/medicines", title: "Set Your Medicine", icon: MedicineIcon },
    { href: "/meetings", title: "Set Your Meeting", icon: MeetingIcon }
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
          <div className="relative inline-block">
            <span 
              className="text-7xl md:text-8xl font-bold text-[#002E6E] tracking-tight"
              style={{ fontFamily: 'Cambria, Georgia, serif' }}
              data-testid="text-current-time"
            >
              {formatTime(time)}
            </span>
            <span 
              className="absolute -top-1 -right-14 md:-right-16 text-base md:text-lg font-semibold text-[#002E6E]/70"
              style={{ fontFamily: 'Cambria, Georgia, serif' }}
              data-testid="text-ampm"
            >
              {getDayName(time)}
            </span>
          </div>
        </div>

        <div className="w-full max-w-sm space-y-5 pb-8">
          {cards.map((card) => {
            const IconComponent = card.icon;
            return (
              <Link key={card.href} href={card.href} data-testid={`link-${card.href.slice(1)}`}>
                <div 
                  className="bg-white rounded-2xl py-5 px-4 shadow-md border border-slate-100 hover:shadow-lg transition-all duration-300 cursor-pointer group text-center"
                  data-testid={`card-${card.href.slice(1)}`}
                >
                  <div className="flex justify-center mb-2 group-hover:scale-105 transition-transform">
                    <IconComponent />
                  </div>
                  <h2 className="text-lg font-bold text-[#002E6E] italic">
                    {card.title}
                  </h2>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
