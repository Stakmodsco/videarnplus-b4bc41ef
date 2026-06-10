import { useEffect, useMemo, useRef } from "react";
import { ArrowUpRight, BadgeCheck, Banknote } from "lucide-react";
import { currencyForCountry, formatMoney } from "@/lib/currency";

type Item = {
  kind: "withdrawal" | "upgrade";
  name: string;
  country: string;
  place: string;
  amount: number;
};

// Worldwide live feed — every name appears once. Heavy on withdrawals
// because members like seeing payouts land. Currencies are derived from
// each country so the marquee mixes USD, EUR, GBP, INR, NGN, PHP, BRL,
// KES, MXN, IDR and more.
const ITEMS: Item[] = [
  // Withdrawals — Africa
  { kind: "withdrawal", name: "Ngozi Eze",        country: "NG", place: "Yenagoa",       amount: 142 },
  { kind: "withdrawal", name: "Femi Bakare",      country: "NG", place: "Ilorin",        amount: 268 },
  { kind: "withdrawal", name: "Hauwa Sani",       country: "NG", place: "Sokoto",        amount: 96  },
  { kind: "withdrawal", name: "Obinna Iheanacho", country: "NG", place: "Owerri",        amount: 335 },
  { kind: "withdrawal", name: "Yetunde Ade",      country: "NG", place: "Akure",         amount: 188 },
  { kind: "withdrawal", name: "Kojo Mensah",      country: "GH", place: "Takoradi",      amount: 104 },
  { kind: "withdrawal", name: "Abena Owusu",      country: "GH", place: "Cape Coast",    amount: 158 },
  { kind: "withdrawal", name: "Kweku Sarpong",    country: "GH", place: "Sunyani",       amount: 72  },
  { kind: "withdrawal", name: "Bongani Khumalo",  country: "ZA", place: "Pretoria",      amount: 207 },
  { kind: "withdrawal", name: "Lerato Mokoena",   country: "ZA", place: "Bloemfontein",  amount: 134 },
  { kind: "withdrawal", name: "Thabo Dlamini",    country: "ZA", place: "Polokwane",     amount: 248 },
  { kind: "withdrawal", name: "Hany El-Masry",    country: "EG", place: "Giza",          amount: 117 },
  { kind: "withdrawal", name: "Doha Farouk",      country: "EG", place: "Aswan",         amount: 83  },
  { kind: "withdrawal", name: "Brian Otieno",     country: "KE", place: "Kisumu",        amount: 76  },
  { kind: "withdrawal", name: "Faith Kamau",      country: "KE", place: "Eldoret",       amount: 182 },
  { kind: "withdrawal", name: "Mwajuma Hamisi",   country: "TZ", place: "Mwanza",        amount: 99  },
  { kind: "withdrawal", name: "Frank Ssemakula",  country: "UG", place: "Jinja",         amount: 121 },
  { kind: "withdrawal", name: "Patience Anyango", country: "UG", place: "Gulu",          amount: 64  },
  { kind: "withdrawal", name: "Imane Bouzid",     country: "MA", place: "Marrakesh",     amount: 213 },
  { kind: "withdrawal", name: "Mphatso Banda",    country: "MW", place: "Lilongwe",      amount: 88  },
  { kind: "withdrawal", name: "Tshepo Ramaphosa", country: "BW", place: "Francistown",   amount: 156 },
  { kind: "withdrawal", name: "Aminata Diallo",   country: "SN", place: "Saint-Louis",   amount: 119 },
  { kind: "withdrawal", name: "Kouadio Yao",      country: "CI", place: "Yamoussoukro",  amount: 102 },
  { kind: "withdrawal", name: "Aline Uwase",      country: "RW", place: "Butare",        amount: 71  },
  { kind: "withdrawal", name: "Eyob Tesfaye",     country: "ET", place: "Bahir Dar",     amount: 124 },
  { kind: "withdrawal", name: "Joseph Kambou",    country: "ZM", place: "Ndola",         amount: 93  },

  // Withdrawals — Asia & Middle East
  { kind: "withdrawal", name: "Mark Reyes",       country: "PH", place: "Davao",         amount: 84  },
  { kind: "withdrawal", name: "Justine Cruz",     country: "PH", place: "Iloilo",        amount: 139 },
  { kind: "withdrawal", name: "Anjali Verma",     country: "IN", place: "Pune",          amount: 91  },
  { kind: "withdrawal", name: "Rohan Iyer",       country: "IN", place: "Hyderabad",     amount: 226 },
  { kind: "withdrawal", name: "Sneha Pillai",     country: "IN", place: "Kochi",         amount: 173 },
  { kind: "withdrawal", name: "Aditya Joshi",     country: "IN", place: "Jaipur",        amount: 108 },
  { kind: "withdrawal", name: "Bilal Qureshi",    country: "PK", place: "Peshawar",      amount: 117 },
  { kind: "withdrawal", name: "Sana Iqbal",       country: "PK", place: "Multan",        amount: 67  },
  { kind: "withdrawal", name: "Kenji Watanabe",   country: "JP", place: "Sapporo",       amount: 192 },
  { kind: "withdrawal", name: "Aoi Nakamura",     country: "JP", place: "Fukuoka",       amount: 114 },
  { kind: "withdrawal", name: "Putri Lestari",    country: "ID", place: "Bandung",       amount: 104 },
  { kind: "withdrawal", name: "Eko Wijaya",       country: "ID", place: "Medan",         amount: 148 },
  { kind: "withdrawal", name: "Phuong Tran",      country: "VN", place: "Da Nang",       amount: 95  },
  { kind: "withdrawal", name: "Dat Nguyen",       country: "VN", place: "Can Tho",       amount: 162 },
  { kind: "withdrawal", name: "Fahim Al-Mansoori",country: "AE", place: "Sharjah",       amount: 348 },
  { kind: "withdrawal", name: "Mariam Al-Hashimi",country: "AE", place: "Ajman",         amount: 271 },
  { kind: "withdrawal", name: "Aiman Tan",        country: "MY", place: "Johor Bahru",   amount: 128 },
  { kind: "withdrawal", name: "Nor Aisyah",       country: "MY", place: "Ipoh",          amount: 81  },
  { kind: "withdrawal", name: "Niran Suksawat",   country: "TH", place: "Chiang Mai",    amount: 153 },
  { kind: "withdrawal", name: "Ji-woo Park",      country: "KR", place: "Busan",         amount: 204 },
  { kind: "withdrawal", name: "Hyun-su Lee",      country: "KR", place: "Daegu",         amount: 142 },
  { kind: "withdrawal", name: "Reem Al-Otaibi",   country: "SA", place: "Jeddah",        amount: 233 },
  { kind: "withdrawal", name: "Yusuf Demir",      country: "TR", place: "Izmir",         amount: 167 },
  { kind: "withdrawal", name: "Elif Yilmaz",      country: "TR", place: "Antalya",       amount: 119 },

  // Withdrawals — Europe
  { kind: "withdrawal", name: "Harriet Bennett",  country: "GB", place: "Bristol",       amount: 244 },
  { kind: "withdrawal", name: "Theo Whitmore",    country: "GB", place: "Leeds",         amount: 178 },
  { kind: "withdrawal", name: "Margaux Lefèvre",  country: "FR", place: "Bordeaux",      amount: 186 },
  { kind: "withdrawal", name: "Étienne Roussel",  country: "FR", place: "Nantes",        amount: 101 },
  { kind: "withdrawal", name: "Jonas Becker",     country: "DE", place: "Cologne",       amount: 219 },
  { kind: "withdrawal", name: "Lea Hoffmann",     country: "DE", place: "Stuttgart",     amount: 153 },
  { kind: "withdrawal", name: "Inés Navarro",     country: "ES", place: "Seville",       amount: 189 },
  { kind: "withdrawal", name: "Álvaro Mendoza",   country: "ES", place: "Valencia",      amount: 122 },
  { kind: "withdrawal", name: "Lorenzo Bianchi",  country: "IT", place: "Naples",        amount: 141 },
  { kind: "withdrawal", name: "Chiara Russo",     country: "IT", place: "Turin",         amount: 108 },
  { kind: "withdrawal", name: "Astrid Larsen",    country: "SE", place: "Gothenburg",    amount: 258 },
  { kind: "withdrawal", name: "Cillian Murphy",   country: "IE", place: "Cork",          amount: 196 },
  { kind: "withdrawal", name: "Kacper Nowak",     country: "PL", place: "Kraków",        amount: 131 },
  { kind: "withdrawal", name: "Petra Horvat",     country: "HR", place: "Split",         amount: 87  },
  { kind: "withdrawal", name: "Mihail Ionescu",   country: "RO", place: "Cluj-Napoca",   amount: 112 },
  { kind: "withdrawal", name: "Linnea Korhonen",  country: "FI", place: "Helsinki",      amount: 221 },
  { kind: "withdrawal", name: "Bram De Jong",     country: "NL", place: "Rotterdam",     amount: 198 },
  { kind: "withdrawal", name: "Floor Visser",     country: "NL", place: "Utrecht",       amount: 134 },

  // Withdrawals — Americas & Oceania
  { kind: "withdrawal", name: "Rafael Souza",     country: "BR", place: "Salvador",      amount: 187 },
  { kind: "withdrawal", name: "Beatriz Lima",     country: "BR", place: "Fortaleza",     amount: 263 },
  { kind: "withdrawal", name: "Luis Hernández",   country: "MX", place: "Monterrey",     amount: 152 },
  { kind: "withdrawal", name: "Valeria Cruz",     country: "MX", place: "Puebla",        amount: 117 },
  { kind: "withdrawal", name: "Joaquín Sosa",     country: "AR", place: "Córdoba",       amount: 144 },
  { kind: "withdrawal", name: "Catalina Pino",    country: "CL", place: "Valparaíso",    amount: 102 },
  { kind: "withdrawal", name: "Andrea Cárdenas",  country: "CO", place: "Medellín",      amount: 178 },
  { kind: "withdrawal", name: "Sebastián Vargas", country: "CO", place: "Cali",          amount: 125 },
  { kind: "withdrawal", name: "Renata Paredes",   country: "PE", place: "Arequipa",      amount: 96  },
  { kind: "withdrawal", name: "Brooklyn Hayes",   country: "US", place: "Brooklyn",      amount: 432 },
  { kind: "withdrawal", name: "Khadijah Wright",  country: "US", place: "Houston",       amount: 301 },
  { kind: "withdrawal", name: "Tre Jackson",      country: "US", place: "Phoenix",       amount: 217 },
  { kind: "withdrawal", name: "Hannah Caldwell",  country: "US", place: "Seattle",       amount: 268 },
  { kind: "withdrawal", name: "Quinn Tremblay",   country: "CA", place: "Montréal",      amount: 211 },
  { kind: "withdrawal", name: "Madeline Côté",    country: "CA", place: "Calgary",       amount: 156 },
  { kind: "withdrawal", name: "Indigo Spencer",   country: "AU", place: "Brisbane",      amount: 232 },
  { kind: "withdrawal", name: "Archie Donovan",   country: "AU", place: "Perth",         amount: 179 },
  { kind: "withdrawal", name: "Manaia Tane",      country: "NZ", place: "Wellington",    amount: 148 },

  // Upgrades — sprinkled in
  { kind: "upgrade",    name: "Imran Shaikh",     country: "PK", place: "Faisalabad",    amount: 25  },
  { kind: "upgrade",    name: "Adesuwa Igbinedion",country: "NG", place: "Benin City",   amount: 50  },
  { kind: "upgrade",    name: "Caleb Mwangi",     country: "KE", place: "Nakuru",        amount: 100 },
  { kind: "upgrade",    name: "Marlene Wagner",   country: "DE", place: "Frankfurt",     amount: 50  },
  { kind: "upgrade",    name: "Vinícius Castro",  country: "BR", place: "Curitiba",      amount: 25  },
  { kind: "upgrade",    name: "Tahlia Henderson", country: "NZ", place: "Christchurch",  amount: 100 },
  { kind: "upgrade",    name: "Yousef Al-Najjar", country: "JO", place: "Amman",         amount: 50  },
  { kind: "upgrade",    name: "Greta Bellini",    country: "IT", place: "Verona",        amount: 25  },
  { kind: "upgrade",    name: "Sora Maeda",       country: "JP", place: "Yokohama",      amount: 100 },
  { kind: "upgrade",    name: "Aleksy Wójcik",    country: "PL", place: "Wrocław",       amount: 50  },
];

// Heuristic for low-power phones: few CPU cores or constrained memory.
const isLowPowerDevice = () => {
  if (typeof navigator === "undefined") return false;
  const cores = navigator.hardwareConcurrency ?? 8;
  const mem = (navigator as any).deviceMemory as number | undefined;
  return cores <= 4 || (mem !== undefined && mem <= 4);
};

export const ActivityCarousel = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const lowPower = useMemo(isLowPowerDevice, []);

  // Shuffle once per mount so the order varies between visits.
  // On low-power devices, render fewer items to cut layout/paint work.
  const shuffled = useMemo(() => {
    const arr = [...ITEMS];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return lowPower ? arr.slice(0, 30) : arr;
  }, [lowPower]);

  // Duplicate for seamless marquee loop (visual repeat only — names stay unique
  // within the source list).
  const loop = useMemo(() => [...shuffled, ...shuffled], [shuffled]);

  // Pause the animation whenever the marquee is off-screen or the tab is
  // hidden — zero compositor work when nobody can see it.
  useEffect(() => {
    const track = trackRef.current;
    const container = containerRef.current;
    if (!track || !container || reducedMotion) return;

    let visible = true;
    const apply = () => {
      track.style.animationPlayState =
        visible && !document.hidden ? "running" : "paused";
    };
    const io = new IntersectionObserver(
      ([entry]) => { visible = entry.isIntersecting; apply(); },
      { threshold: 0 },
    );
    io.observe(container);
    document.addEventListener("visibilitychange", apply);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", apply);
    };
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="w-full bg-primary/10 border-y border-primary/20 overflow-hidden relative"
      style={{ contain: "content" }}
    >
      <div
        ref={trackRef}
        className={`flex w-max whitespace-nowrap py-2.5 ${
          reducedMotion
            ? ""
            : "animate-marquee [animation-duration:40s] md:[animation-duration:60s] will-change-transform"
        }`}
        style={reducedMotion ? undefined : { transform: "translateZ(0)", backfaceVisibility: "hidden" }}
      >
        {(reducedMotion ? shuffled : loop).map((it, i) => {
          const meta = currencyForCountry(it.country);
          const Icon = it.kind === "withdrawal" ? Banknote : ArrowUpRight;
          return (
            <div key={`${it.name}-${i}`} className="flex items-center gap-2 mx-5 text-sm shrink-0">
              <Icon className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium">{it.name}</span>
              <span className="text-muted-foreground">
                {it.kind === "withdrawal" ? "cashed out" : "joined tier for"}
              </span>
              <span className="font-semibold text-primary tabular-nums">
                {formatMoney(it.amount, meta, { decimals: 0 })}
              </span>
              <span className="text-xs text-muted-foreground">· {it.place}</span>
              <BadgeCheck className="h-3.5 w-3.5 text-primary/70" />
            </div>
          );
        })}
      </div>
    </div>
  );
};
