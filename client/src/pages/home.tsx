import { Link } from "wouter";
import { useEffect, useState } from "react";
import { Clock, Pill, Users } from "lucide-react";

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
    {
      href: "/routine",
      title: "Set Your Routine",
      icon: Clock,
      description: "Daily alarms & reminders",
      gradient: "from-blue-500/10 to-cyan-500/10",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      href: "/medicines",
      title: "Set Your Medicine",
      icon: Pill,
      description: "Medicine reminders",
      gradient: "from-green-500/10 to-emerald-500/10",
      iconBg: "bg-green-100",
      iconColor: "text-green-600"
    },
    {
      href: "/meetings",
      title: "Set Your Meeting",
      icon: Users,
      description: "Meeting schedules",
      gradient: "from-purple-500/10 to-pink-500/10",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600"
    }
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

        <div className="w-full max-w-md space-y-4 pb-8">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.href} href={card.href} data-testid={`link-${card.href.slice(1)}`}>
                <div 
                  className={`bg-white rounded-2xl p-6 shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 cursor-pointer group bg-gradient-to-r ${card.gradient}`}
                  data-testid={`card-${card.href.slice(1)}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl ${card.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-8 h-8 ${card.iconColor}`} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#002E6E] italic">
                        {card.title}
                      </h2>
                      <p className="text-sm text-slate-500">{card.description}</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
