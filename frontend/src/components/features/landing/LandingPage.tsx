'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Snowflake,
  LogIn,
  UserPlus,
  Search,
  Activity,
  TruckIcon,
  Thermometer,
  FileText,
  Users,
  Share2,
  AtSign,
  Camera,
  Briefcase,
  PlayCircle,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  Zap,
  BarChart3,
  Eye,
  MapPin,
  Menu,
  X,
  CheckCircle2,
  Sparkles,
  Warehouse,
  CircleCheck,
} from 'lucide-react';

import { HeroSlider } from './HeroSlider';
import { ColdChainTimeline } from './ColdChainTimeline';
import { StatsCounter } from './StatsCounter';
import { LoginModal } from './LoginModal';
import { RegisterModal } from './RegisterModal';
import styles from './LandingPage.module.css';

/* ─────────────────────────────────────────────
   Scroll reveal hook
───────────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

/* ─────────────────────────────────────────────
   Platform features
───────────────────────────────────────────── */
const FEATURES = [
  {
    icon: TruckIcon,
    title: 'Pickup & Logistics',
    desc: 'Schedule farm pickup with temperature-controlled transport and tracked delivery to your selected facility.',
    color: '#60a5fa',
    accent: '#0f4c81',
    label: 'Farm to facility',
  },
  {
    icon: Thermometer,
    title: 'Live Monitoring',
    desc: 'Monitor temperature, humidity, and chamber conditions with real-time alerts whenever something changes.',
    color: '#4ade80',
    accent: '#14532d',
    label: 'IoT powered',
  },
  {
    icon: FileText,
    title: 'Digital Receipts',
    desc: 'Get secure warehouse receipts, lot records, and storage documents in one permanent digital ledger.',
    color: '#c084fc',
    accent: '#581c87',
    label: 'Verified records',
  },
  {
    icon: Users,
    title: 'Buyer Marketplace',
    desc: 'Reach verified buyers directly, compare offers, and sell at the right time without unnecessary intermediaries.',
    color: '#fbbf24',
    accent: '#78350f',
    label: 'Better price discovery',
  },
];

/* ─────────────────────────────────────────────
   Benefits
───────────────────────────────────────────── */
const BENEFITS = [
  {
    icon: ShieldCheck,
    title: 'Protected at every step',
    desc: 'Verified facilities, traceable lots, digital records, and transparent workflows.',
  },
  {
    icon: Zap,
    title: 'Book in minutes',
    desc: 'Check availability, compare facilities, and reserve capacity without paperwork.',
  },
  {
    icon: Eye,
    title: 'Always in control',
    desc: 'Track storage conditions, inventory status, and movement from a single dashboard.',
  },
  {
    icon: BarChart3,
    title: 'Sell with confidence',
    desc: 'Use market intelligence and buyer demand signals to choose better selling windows.',
  },
];

/* ─────────────────────────────────────────────
   Trust indicators
───────────────────────────────────────────── */
const TRUST_ITEMS = [
  'Verified warehouse network',
  'Digital lot-level records',
  'Live cold-chain visibility',
];

export function LandingPage() {
  const featuresReveal = useReveal();
  const journeyReveal = useReveal();
  const benefitsReveal = useReveal();
  const statsReveal = useReveal();

  const [showTopBtn, setShowTopBtn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const openLogin = () => {
    setShowRegister(false);
    setShowLogin(true);
    setMobileMenuOpen(false);
  };

  const openRegister = () => {
    setShowLogin(false);
    setShowRegister(true);
    setMobileMenuOpen(false);
  };

  const closeModals = () => {
    setShowLogin(false);
    setShowRegister(false);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowTopBtn(window.scrollY > 550);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <main className={styles.page}>
      {/* ───────────── HEADER ───────────── */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a href="/" className={styles.logo} aria-label="ColdStorage home">
            <div className={styles.logoIcon}>
              <Snowflake size={17} strokeWidth={2.4} />
            </div>

            <div className={styles.brandText}>
              <span className={styles.logoText}>ColdStorage</span>
              <span className={styles.logoSubtext}>National Network</span>
            </div>
          </a>

          <nav className={styles.nav} aria-label="Main navigation">
            <a href="#features">Platform</a>
            <a href="#journey">How it works</a>
            <a href="#why">Why ColdStorage</a>

            <div className={styles.navSearch}>
              <Search size={14} />
              <input
                type="text"
                placeholder="Search warehouses"
                aria-label="Search warehouses"
              />
            </div>
          </nav>

          <div className={styles.headerActions}>
            <button onClick={openLogin} className={styles.loginBtn}>
              <LogIn size={15} />
              <span>Sign in</span>
            </button>

            <button onClick={openRegister} className={styles.registerBtn}>
              <span>Get started</span>
              <ArrowRight size={15} />
            </button>
          </div>

          <button
            className={styles.menuButton}
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={21} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <a href="#features" onClick={closeMobileMenu}>
              Platform
            </a>
            <a href="#journey" onClick={closeMobileMenu}>
              How it works
            </a>
            <a href="#why" onClick={closeMobileMenu}>
              Why ColdStorage
            </a>

            <div className={styles.mobileMenuActions}>
              <button onClick={openLogin} className={styles.mobileLoginBtn}>
                <LogIn size={16} />
                Sign in
              </button>

              <button onClick={openRegister} className={styles.mobileRegisterBtn}>
                Create account
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ───────────── HERO ───────────── */}
      <section className={styles.hero}>
        <div className={styles.heroGlowOne} />
        <div className={styles.heroGlowTwo} />
        <div className={styles.heroGrid} />

        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <div className={styles.heroEyebrow}>
              <span className={styles.liveDot} />
              <Activity size={13} />
              <span>India&apos;s connected cold-chain infrastructure</span>
            </div>

            <h1>
              Storage that protects
              <span> every harvest.</span>
            </h1>

            <p className={styles.heroDescription}>
              Discover trusted cold storage, track your produce in real time,
              access digital receipts, and connect with better buyers — from
              one powerful platform.
            </p>

            <div className={styles.heroCtas}>
              <button onClick={openRegister} className={styles.primaryCta}>
                Register your warehouse
                <ArrowRight size={18} />
              </button>

              <a href="#journey" className={styles.secondaryCta}>
                See how it works
                <span className={styles.secondaryArrow}>↘</span>
              </a>
            </div>

            <div className={styles.trustList}>
              {TRUST_ITEMS.map((item) => (
                <div key={item} className={styles.trustItem}>
                  <CircleCheck size={15} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.visualBackdrop} />

            <div className={styles.visualTopLabel}>
              <MapPin size={14} />
              <span>Live network across India</span>
            </div>

            <div className={styles.heroSliderFrame}>
              <HeroSlider />
            </div>

            <div className={styles.capacityCard}>
              <div className={styles.capacityIcon}>
                <Warehouse size={19} />
              </div>

              <div>
                <span className={styles.capacityLabel}>Live storage capacity</span>
                <strong>42 L MT</strong>
              </div>

              <div className={styles.capacityPulse}>
                <span />
                Live
              </div>
            </div>

            <div className={styles.monitorCard}>
              <div className={styles.monitorTop}>
                <div>
                  <span>Facility health</span>
                  <strong>All systems stable</strong>
                </div>

                <div className={styles.monitorBadge}>
                  <Thermometer size={14} />
                  4.2°C
                </div>
              </div>

              <div className={styles.monitorBars}>
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.heroFooter}>
          <div className={styles.heroFooterInner}>
            <div>
              <strong>612+</strong>
              <span>Verified warehouses</span>
            </div>
            <div className={styles.footerMetricLine} />
            <div>
              <strong>9,400+</strong>
              <span>Farmers connected</span>
            </div>
            <div className={styles.footerMetricLine} />
            <div>
              <strong>18 states</strong>
              <span>Growing network</span>
            </div>
            <div className={styles.footerMetricLine} />
            <div>
              <strong>99.9%</strong>
              <span>Platform uptime</span>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── FEATURE SECTION ───────────── */}
      <section
        id="features"
        ref={featuresReveal.ref}
        className={`${styles.features} ${
          featuresReveal.visible ? styles.revealed : ''
        }`}
      >
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeading}>
            <div className={styles.sectionKicker}>
              <Sparkles size={14} />
              <span>One connected platform</span>
            </div>

            <div className={styles.sectionTitleRow}>
              <h2>
                Built for the complete
                <span> cold-chain journey.</span>
              </h2>

              <p>
                Replace fragmented calls, paper slips, and uncertainty with one
                transparent system for storage, logistics, monitoring, and trade.
              </p>
            </div>
          </div>

          <div className={styles.featuresGrid}>
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className={styles.featureCard}
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <div
                    className={styles.featureCardGlow}
                    style={{ background: feature.accent }}
                  />

                  <div className={styles.featureCardTop}>
                    <div
                      className={styles.featureIcon}
                      style={{
                        background: `${feature.color}18`,
                        color: feature.color,
                      }}
                    >
                      <Icon size={23} />
                    </div>

                    <span className={styles.featureNumber}>
                      0{index + 1}
                    </span>
                  </div>

                  <span
                    className={styles.featureLabel}
                    style={{ color: feature.color }}
                  >
                    {feature.label}
                  </span>

                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>

                  <div className={styles.featureExplore}>
                    <span>Explore capability</span>
                    <ArrowRight size={15} />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────── JOURNEY ───────────── */}
      <section
        id="journey"
        ref={journeyReveal.ref}
        className={`${styles.journey} ${
          journeyReveal.visible ? styles.revealed : ''
        }`}
      >
        <div className={styles.journeyGlow} />

        <div className={styles.sectionInner}>
          <div className={styles.journeyHeading}>
            <div>
              <span className={styles.sectionTag}>From farm to market</span>
              <h2>
                A cold chain that stays
                <span> unbroken.</span>
              </h2>
            </div>

            <p>
              Every stage is visible, traceable, and designed to protect quality
              until your produce reaches the right buyer.
            </p>
          </div>

          <div className={styles.timelineFrame}>
            <ColdChainTimeline />
          </div>
        </div>
      </section>

      {/* ───────────── STATS ───────────── */}
      <section
        ref={statsReveal.ref}
        className={`${styles.statsSection} ${
          statsReveal.visible ? styles.revealed : ''
        }`}
      >
        <div className={styles.statsPattern} />

        <div className={styles.sectionInner}>
          <div className={styles.statsHeader}>
            <div>
              <span>Scale that creates trust</span>
              <h2>Infrastructure for India&apos;s food future.</h2>
            </div>

            <p>
              A growing network helping warehouses operate smarter and farmers
              preserve more value after harvest.
            </p>
          </div>

          <div className={styles.statsFrame}>
            <StatsCounter
              stats={[
                { value: 612, suffix: '+', label: 'Warehouses' },
                { value: 42, suffix: ' L MT', label: 'Capacity' },
                { value: 9400, suffix: '+', label: 'Farmers' },
                { value: 18, suffix: '', label: 'States' },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ───────────── WHY US ───────────── */}
      <section
        id="why"
        ref={benefitsReveal.ref}
        className={`${styles.benefits} ${
          benefitsReveal.visible ? styles.revealed : ''
        }`}
      >
        <div className={styles.sectionInner}>
          <div className={styles.benefitsIntro}>
            <div>
              <span className={styles.sectionTag}>Why ColdStorage</span>
              <h2>
                More than storage.
                <span> More certainty.</span>
              </h2>
            </div>

            <p>
              Built around the realities of Indian agriculture: perishability,
              price volatility, fragmented supply chains, and the need for
              reliable market access.
            </p>
          </div>

          <div className={styles.benefitsGrid}>
            {BENEFITS.map((benefit, index) => {
              const Icon = benefit.icon;

              return (
                <article
                  key={benefit.title}
                  className={styles.benefitCard}
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <div className={styles.benefitIcon}>
                    <Icon size={20} />
                  </div>

                  <div className={styles.benefitContent}>
                    <span className={styles.benefitIndex}>
                      0{index + 1}
                    </span>
                    <h3>{benefit.title}</h3>
                    <p>{benefit.desc}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────── CTA ───────────── */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaNoise} />
        <div className={styles.ctaOrbOne} />
        <div className={styles.ctaOrbTwo} />

        <div className={styles.ctaInner}>
          <div className={styles.ctaBadge}>
            <CheckCircle2 size={15} />
            Join India&apos;s connected cold-storage network
          </div>

          <h2>
            Make every tonne
            <span> count.</span>
          </h2>

          <p>
            Modernize your operations, build trust with farmers, and unlock
            better demand with ColdStorage.
          </p>

          <div className={styles.ctaButtons}>
            <button onClick={openRegister} className={styles.ctaPrimaryBtn}>
              Register your warehouse
              <ArrowRight size={18} />
            </button>

            <button onClick={openLogin} className={styles.ctaSecondaryBtn}>
              <LogIn size={17} />
              Sign in to dashboard
            </button>
          </div>
        </div>
      </section>

      {/* ───────────── FOOTER ───────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <a href="/" className={styles.footerLogo}>
                <div className={styles.logoIcon}>
                  <Snowflake size={17} />
                </div>

                <div className={styles.brandText}>
                  <span className={styles.logoText}>ColdStorage</span>
                  <span className={styles.logoSubtext}>National Network</span>
                </div>
              </a>

              <p>
                India&apos;s digital infrastructure for smarter, safer, and more
                transparent cold storage.
              </p>

              <div className={styles.footerTrust}>
                <ShieldCheck size={15} />
                <span>Verified facilities. Transparent operations.</span>
              </div>
            </div>

            <div className={styles.footerLinks}>
              <div>
                <h4>Platform</h4>
                <a href="#features">Capabilities</a>
                <a href="#journey">How it works</a>
                <a href="#why">Why ColdStorage</a>
              </div>

              <div>
                <h4>Support</h4>
                <a href="tel:18002709933">1800 270 9933</a>
                <a href="/privacy">Privacy policy</a>
                <a href="/terms">Terms of use</a>
              </div>

              <div>
                <h4>For business</h4>
                <button onClick={openRegister}>List warehouse</button>
                <button onClick={openLogin}>Partner login</button>
                <a href="mailto:hello@coldstorage.in">hello@coldstorage.in</a>
              </div>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <span>
              © {new Date().getFullYear()} ColdStorage National Network. All
              rights reserved.
            </span>

            <div className={styles.footerSocials}>
              <a href="#" aria-label="Share ColdStorage">
                <Share2 size={16} />
              </a>
              <a href="mailto:hello@coldstorage.in" aria-label="Email ColdStorage">
                <AtSign size={16} />
              </a>
              <a href="#" aria-label="ColdStorage gallery">
                <Camera size={16} />
              </a>
              <a href="#" aria-label="ColdStorage business">
                <Briefcase size={16} />
              </a>
              <a href="#" aria-label="Watch ColdStorage">
                <PlayCircle size={16} />
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* ───────────── SCROLL TO TOP ───────────── */}
      <button
        className={`${styles.scrollTop} ${
          showTopBtn ? styles.scrollTopVisible : ''
        }`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
      >
        <ChevronUp size={19} />
      </button>

      {/* ───────────── AUTH MODALS ───────────── */}
      <LoginModal
        isOpen={showLogin}
        onClose={closeModals}
        onSwitchToRegister={openRegister}
      />

      <RegisterModal
        isOpen={showRegister}
        onClose={closeModals}
        onSwitchToLogin={openLogin}
      />
    </main>
  );
}