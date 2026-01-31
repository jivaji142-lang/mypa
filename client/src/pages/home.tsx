import { Link } from "wouter";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useTranslations } from "@/hooks/use-translations";

const RoutineIcon = () => (
  <svg viewBox="0 0 120 120" className="w-20 h-20">
    <defs>
      <linearGradient id="paytmBlue" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#00BAF2"/>
        <stop offset="50%" stopColor="#0088cc"/>
        <stop offset="100%" stopColor="#002E6E"/>
      </linearGradient>
      <linearGradient id="paytmCyan" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00BAF2"/>
        <stop offset="100%" stopColor="#00d4ff"/>
      </linearGradient>
      <linearGradient id="clockFace" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff"/>
        <stop offset="100%" stopColor="#e8f4fc"/>
      </linearGradient>
      <filter id="paytmShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#002E6E" floodOpacity="0.35"/>
      </filter>
      <radialGradient id="paytmShine" cx="35%" cy="25%" r="40%">
        <stop offset="0%" stopColor="white" stopOpacity="0.8"/>
        <stop offset="100%" stopColor="white" stopOpacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="60" cy="112" rx="28" ry="6" fill="#002E6E" opacity="0.25"/>
    <g filter="url(#paytmShadow)">
      <ellipse cx="28" cy="28" rx="14" ry="11" fill="url(#paytmCyan)"/>
      <ellipse cx="92" cy="28" rx="14" ry="11" fill="url(#paytmCyan)"/>
      <ellipse cx="28" cy="25" rx="7" ry="4" fill="#00d4ff" opacity="0.6"/>
      <ellipse cx="92" cy="25" rx="7" ry="4" fill="#00d4ff" opacity="0.6"/>
      <rect x="54" y="14" width="12" height="16" rx="4" fill="#002E6E"/>
      <circle cx="60" cy="64" r="42" fill="url(#paytmBlue)"/>
      <circle cx="60" cy="64" r="36" fill="url(#clockFace)"/>
      <circle cx="60" cy="64" r="42" fill="url(#paytmShine)"/>
    </g>
    <circle cx="60" cy="64" r="32" fill="none" stroke="#00BAF2" strokeWidth="2"/>
    <circle cx="60" cy="46" r="3" fill="#00BAF2"/>
    <circle cx="78" cy="64" r="3" fill="#00BAF2"/>
    <circle cx="60" cy="82" r="3" fill="#00BAF2"/>
    <circle cx="42" cy="64" r="3" fill="#00BAF2"/>
    <line x1="60" y1="64" x2="60" y2="48" stroke="#002E6E" strokeWidth="4" strokeLinecap="round"/>
    <line x1="60" y1="64" x2="74" y2="64" stroke="#002E6E" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="60" cy="64" r="5" fill="#00BAF2"/>
    <circle cx="60" cy="64" r="2" fill="white"/>
    <text x="96" y="16" fontSize="13" fill="#00BAF2" fontWeight="bold" fontStyle="italic">Z</text>
    <text x="104" y="8" fontSize="10" fill="#00d4ff" fontWeight="bold" fontStyle="italic">z</text>
  </svg>
);

const MedicineIcon = () => (
  <svg viewBox="0 0 120 120" className="w-20 h-20">
    <defs>
      <linearGradient id="paytmBottle" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#00BAF2"/>
        <stop offset="50%" stopColor="#0088cc"/>
        <stop offset="100%" stopColor="#002E6E"/>
      </linearGradient>
      <linearGradient id="paytmCap" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#00d4ff"/>
        <stop offset="100%" stopColor="#00BAF2"/>
      </linearGradient>
      <linearGradient id="pillGreen" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#4caf50"/>
        <stop offset="100%" stopColor="#2e7d32"/>
      </linearGradient>
      <linearGradient id="pillOrange" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ff9800"/>
        <stop offset="100%" stopColor="#e65100"/>
      </linearGradient>
      <filter id="paytmShadowM" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#002E6E" floodOpacity="0.35"/>
      </filter>
      <radialGradient id="paytmShineM" cx="30%" cy="25%" r="40%">
        <stop offset="0%" stopColor="white" stopOpacity="0.5"/>
        <stop offset="100%" stopColor="white" stopOpacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="60" cy="112" rx="32" ry="6" fill="#002E6E" opacity="0.25"/>
    <g filter="url(#paytmShadowM)">
      <rect x="35" y="32" width="50" height="68" rx="10" fill="url(#paytmBottle)"/>
      <rect x="35" y="32" width="50" height="68" rx="10" fill="url(#paytmShineM)"/>
      <rect x="42" y="20" width="36" height="18" rx="6" fill="url(#paytmCap)"/>
      <ellipse cx="60" cy="24" rx="12" ry="3" fill="#00d4ff" opacity="0.6"/>
      <rect x="45" y="50" width="30" height="30" rx="5" fill="white" opacity="0.95"/>
      <path d="M52 60 L58 68 L72 54" fill="none" stroke="#00BAF2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
    <g filter="url(#paytmShadowM)" transform="translate(8, 75) rotate(-20)">
      <ellipse cx="14" cy="7" rx="14" ry="7" fill="url(#pillGreen)"/>
      <ellipse cx="20" cy="7" rx="8" ry="7" fill="white"/>
      <ellipse cx="10" cy="5" rx="4" ry="2" fill="white" opacity="0.4"/>
    </g>
    <g filter="url(#paytmShadowM)" transform="translate(85, 60) rotate(25)">
      <ellipse cx="10" cy="6" rx="12" ry="6" fill="url(#pillOrange)"/>
      <ellipse cx="16" cy="6" rx="6" ry="6" fill="white"/>
    </g>
  </svg>
);

const MeetingIcon = () => (
  <svg viewBox="0 0 120 120" className="w-20 h-20">
    <defs>
      <linearGradient id="paytmCalendar" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#00BAF2"/>
        <stop offset="50%" stopColor="#0088cc"/>
        <stop offset="100%" stopColor="#002E6E"/>
      </linearGradient>
      <linearGradient id="paytmCalTop" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#00d4ff"/>
        <stop offset="100%" stopColor="#00BAF2"/>
      </linearGradient>
      <linearGradient id="paytmPerson1" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#00BAF2"/>
        <stop offset="100%" stopColor="#002E6E"/>
      </linearGradient>
      <linearGradient id="paytmPerson2" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ff7043"/>
        <stop offset="100%" stopColor="#e64a19"/>
      </linearGradient>
      <linearGradient id="faceSkin" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffcc80"/>
        <stop offset="100%" stopColor="#ffb74d"/>
      </linearGradient>
      <filter id="paytmShadowMt" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#002E6E" floodOpacity="0.35"/>
      </filter>
      <radialGradient id="paytmShineMt" cx="30%" cy="20%" r="40%">
        <stop offset="0%" stopColor="white" stopOpacity="0.4"/>
        <stop offset="100%" stopColor="white" stopOpacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="60" cy="112" rx="35" ry="6" fill="#002E6E" opacity="0.25"/>
    <g filter="url(#paytmShadowMt)">
      <rect x="25" y="22" width="70" height="78" rx="8" fill="url(#paytmCalendar)"/>
      <rect x="25" y="22" width="70" height="78" rx="8" fill="url(#paytmShineMt)"/>
      <rect x="25" y="22" width="70" height="22" rx="8" fill="url(#paytmCalTop)"/>
      <ellipse cx="60" cy="28" rx="22" ry="4" fill="#00d4ff" opacity="0.5"/>
      <rect x="38" y="14" width="8" height="18" rx="4" fill="#002E6E"/>
      <rect x="74" y="14" width="8" height="18" rx="4" fill="#002E6E"/>
      <rect x="33" y="50" width="54" height="42" rx="4" fill="white" opacity="0.95"/>
    </g>
    <g filter="url(#paytmShadowMt)">
      <circle cx="48" cy="66" r="10" fill="url(#faceSkin)"/>
      <ellipse cx="48" cy="84" rx="10" ry="12" fill="url(#paytmPerson1)"/>
    </g>
    <g filter="url(#paytmShadowMt)">
      <circle cx="72" cy="66" r="10" fill="url(#faceSkin)"/>
      <ellipse cx="72" cy="84" rx="10" ry="12" fill="url(#paytmPerson2)"/>
    </g>
    <circle cx="45" cy="64" r="2" fill="#002E6E"/>
    <circle cx="51" cy="64" r="2" fill="#002E6E"/>
    <path d="M44 70 Q48 74 52 70" fill="none" stroke="#002E6E" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="69" cy="64" r="2" fill="#002E6E"/>
    <circle cx="75" cy="64" r="2" fill="#002E6E"/>
    <path d="M68 70 Q72 74 76 70" fill="none" stroke="#002E6E" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="60" cy="56" r="6" fill="#00BAF2"/>
    <path d="M58 56 L60 58 L63 54" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function Home() {
  const [time, setTime] = useState(new Date());
  const t = useTranslations();
  
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

  const getDayNight = (date: Date) => {
    const hours = date.getHours();
    return (hours >= 6 && hours < 18) ? t.day : t.night;
  };

  const getDayName = (date: Date) => {
    const days = [t.sunday, t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday];
    return days[date.getDay()];
  };

  const cards = [
    { href: "/routine", title: t.myRoutine, icon: RoutineIcon },
    { href: "/medicines", title: t.myMedicines, icon: MedicineIcon },
    { href: "/meetings", title: t.myMeetings, icon: MeetingIcon }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="text-center pt-6 pb-3 px-4">
        {/* MyPA Logo - Paytm Inspired */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <span 
            className="text-5xl md:text-6xl font-black tracking-tight"
            style={{ 
              background: 'linear-gradient(135deg, #002E6E 0%, #00BAF2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: 'Cambria, Georgia, serif',
              letterSpacing: '-1px'
            }}
            data-testid="text-logo"
          >
            My<span style={{ 
              background: 'linear-gradient(135deg, #00BAF2 0%, #002E6E 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>PA</span>
          </span>
        </div>
        <p className="text-sm md:text-base text-[#002E6E] font-semibold tracking-wide uppercase mb-2">
          Your Personal Assistant
        </p>
      </header>

      <div className="flex-1 flex flex-col items-center px-4">
        <div className="text-center mb-4 mt-2">
          <div className="flex items-baseline justify-center gap-3">
            <span 
              className="text-7xl md:text-8xl font-bold text-[#002E6E] tracking-tight"
              style={{ fontFamily: 'Cambria, Georgia, serif' }}
              data-testid="text-current-time"
            >
              {formatTime(time)}
            </span>
            <span 
              className="text-xl md:text-2xl font-semibold text-[#00BAF2]"
              style={{ fontFamily: 'Cambria, Georgia, serif' }}
              data-testid="text-daynight"
            >
              {getDayNight(time)}
            </span>
          </div>
          <p 
            className="text-lg text-[#002E6E]/60 mt-1"
            style={{ fontFamily: 'Cambria, Georgia, serif' }}
            data-testid="text-day-name"
          >
            {getDayName(time)}
          </p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-4 pb-6">
          {cards.map((card) => {
            const IconComponent = card.icon;
            return (
              <Link key={card.href} href={card.href} data-testid={`link-${card.href.slice(1)}`}>
                <div 
                  className="bg-white rounded-2xl py-4 px-5 shadow-md border border-slate-100 hover:shadow-lg transition-all duration-300 cursor-pointer group text-center"
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
