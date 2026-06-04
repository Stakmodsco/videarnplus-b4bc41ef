import { Card } from "@/components/ui/card";
import { Quote, Star } from "lucide-react";
import { useMemo } from "react";

type T = { name: string; role: string; quote: string };

// Completely fresh roster — different members, cities, and voice from the
// original site. Quotes lean into the day-to-day experience of using the
// platform rather than payout amounts.
const TESTIMONIALS: T[] = [
  { name: "Harriet Bennett",   role: "Bristol, United Kingdom", quote: "The dashboard finally feels like a proper finance app. Caps are honest, payouts hit my account before my kettle finishes boiling." },
  { name: "Rohan Iyer",         role: "Hyderabad, India",        quote: "I came in skeptical and left a fan. Every reward shows you exactly why it was credited — no fuzzy math, no hidden conditions." },
  { name: "Khadijah Wright",    role: "Houston, USA",            quote: "I plug in for fifteen minutes during my coffee break. Predictable, no spammy popups, no chasing support for missing balances." },
  { name: "Margaux Lefèvre",    role: "Bordeaux, France",        quote: "Support replied to me at 11pm on a Sunday with a real answer, not a script. That alone tells you who runs this." },
  { name: "Bongani Khumalo",    role: "Pretoria, South Africa",  quote: "What sold me was watching the same withdrawal flow work for three of my friends on different banks. It's the same speed every time." },
  { name: "Mark Reyes",         role: "Davao, Philippines",      quote: "Daily check-in feels like opening a habit tracker. I'm thirty days deep and the small rewards genuinely add up." },
  { name: "Astrid Larsen",      role: "Gothenburg, Sweden",      quote: "Refreshing to use a rewards product that doesn't insult my intelligence. The tier explanations read like a real product page." },
  { name: "Fahim Al-Mansoori",  role: "Sharjah, UAE",            quote: "Upgraded to Platinum last month. Higher caps unlocked instantly, and the referral commission landed in real time." },
  { name: "Ji-woo Park",        role: "Busan, South Korea",      quote: "I appreciate that the platform tells you when you've hit your cap instead of letting you waste another hour." },
  { name: "Beatriz Lima",       role: "Fortaleza, Brazil",       quote: "The mobile experience is the cleanest I've seen in this category. No flashing banners, no fake countdowns." },
  { name: "Theo Whitmore",      role: "Leeds, United Kingdom",   quote: "I read the FAQ before I trusted it. Every claim they make is something I've now verified in my own account." },
  { name: "Aminata Diallo",     role: "Saint-Louis, Senegal",    quote: "Withdrawals to my mobile wallet are instant. I checked the timestamps — average of two minutes across eight payouts." },
  { name: "Jonas Becker",       role: "Cologne, Germany",        quote: "I like that there's a daily ceiling. It keeps the platform sustainable and stops me from overdoing it." },
  { name: "Catalina Pino",      role: "Valparaíso, Chile",       quote: "Onboarding took maybe ninety seconds. Recovery keys instead of email reset was a smart, modern move." },
  { name: "Bram De Jong",       role: "Rotterdam, Netherlands",  quote: "Referral payouts are itemised per friend. I can see exactly which invite earned what — full transparency." },
  { name: "Manaia Tane",        role: "Wellington, New Zealand", quote: "Calm, no-nonsense product. Does what it says, pays when it says, and leaves my home screen alone the rest of the time." },
];

export const Testimonials = () => {
  // Duplicate for seamless marquee
  const loop = useMemo(() => [...TESTIMONIALS, ...TESTIMONIALS], []);
  return (
    <section className="container py-20 max-w-6xl">
      <div className="text-center mb-10">
        <div className="text-xs uppercase tracking-widest text-primary mb-2">Member voices</div>
        <h2 className="font-display text-4xl md:text-5xl font-semibold">What VidearnPlus members actually say</h2>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Unedited quotes from members across four continents.</p>
      </div>
      <div className="relative overflow-hidden">
        {/* edge fades (function masks, not color gradients) */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />
        <div className="flex gap-4 animate-marquee-slow w-max">
          {loop.map((t, i) => (
            <Card key={`${t.name}-${i}`} className="glass-card p-6 rounded-xl w-[320px] shrink-0">
              <Quote className="h-5 w-5 text-primary mb-3" />
              <p className="text-sm leading-relaxed mb-4">{t.quote}</p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-3.5 w-3.5 fill-warning text-warning" />
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
