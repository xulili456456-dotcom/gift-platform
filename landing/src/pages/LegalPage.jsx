import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Shield, FileText, Scale } from 'lucide-react'
import SEO from '../components/SEO'

function useReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.05 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

export default function LegalPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') || 'terms')

  return (
    <>
      <SEO title={tab === 'terms' ? t('footer.terms') : t('footer.privacy')} />
      <div className="page-enter">
        {/* Header */}
        <section className="bg-primary relative overflow-hidden pt-24 pb-16 text-center">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="orb absolute top-1/3 left-[20%] w-[300px] h-[300px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #D4A574, transparent 70%)' }} />
          </div>
          <div className="hero-particles">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="hero-particle" style={{ left: `${10 + Math.random() * 80}%`, animationDelay: `${Math.random() * 5}s`, width: 1 + Math.random() * 2, height: 1 + Math.random() * 2 }} />
            ))}
          </div>
          <div className="container-main relative z-10">
            <div className="animate-fade-in inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-accent-light text-sm font-semibold mb-6 border border-white/10">
              <Scale size={14} />
              Legal
            </div>
            <h1 className="animate-fade-in-up text-3xl md:text-4xl font-extrabold text-white mb-4">
              {tab === 'terms' ? t('footer.terms') : t('footer.privacy')}
            </h1>
            <p className="text-white/50 text-sm">Last updated: July 2025</p>

            {/* Tab switcher */}
            <div className="inline-flex bg-white/10 rounded-full p-1 mt-8">
              <button onClick={() => setTab('terms')}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                  tab === 'terms' ? 'bg-accent text-white shadow-lg' : 'text-white/60 hover:text-white'
                }`}>
                <FileText size={14} className="inline mr-1.5" />
                {t('footer.terms')}
              </button>
              <button onClick={() => setTab('privacy')}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                  tab === 'privacy' ? 'bg-accent text-white shadow-lg' : 'text-white/60 hover:text-white'
                }`}>
                <Shield size={14} className="inline mr-1.5" />
                {t('footer.privacy')}
              </button>
            </div>
          </div>
        </section>

        <section className="section bg-bg">
          <div className="container-main max-w-3xl">
            <div className="card border-0 shadow-lg p-8 md:p-12 reveal-enhanced visible">
              {tab === 'terms' ? <TermsContent /> : <PrivacyContent />}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

function TermsContent() {
  return (
    <div className="prose prose-sm max-w-none text-text leading-relaxed space-y-6">
      <section>
        <h2 className="text-xl font-bold mb-3">1. Acceptance of Terms</h2>
        <p className="text-text-secondary">By accessing or using Gift Haven ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">2. Eligibility</h2>
        <p className="text-text-secondary">You must be at least 18 years old to use Gift Haven. By registering, you represent that you meet this age requirement and can form legally binding contracts.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">3. Account Registration</h2>
        <p className="text-text-secondary">You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate and complete information during registration. Each user is limited to one account; multi-account abuse will result in immediate termination.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">4. E-Commerce Tasks & Earnings</h2>
        <p className="text-text-secondary">Gift Haven connects users with product promotion tasks from partnered e-commerce platforms (Amazon, Shopee, Lazada, etc.). Earnings are based on completed sales through your unique referral links. Commission rates are displayed per task and may vary by product category.</p>
        <p className="text-text-secondary mt-2">All earnings are subject to validation. Fraudulent activities (fake orders, self-referral, bot traffic) will result in forfeiture of earnings and account suspension.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">5. Withdrawals</h2>
        <p className="text-text-secondary">Minimum withdrawal amount is $10 USD. Withdrawals are processed within 1-3 business days. A 1% processing fee applies to standard accounts; VIP accounts enjoy fee-free withdrawals. We reserve the right to delay withdrawals for security verification.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">6. Referral Program</h2>
        <p className="text-text-secondary">Our 3-tier referral program rewards you for inviting new users. Referral commissions are calculated as a percentage of your referrals' earnings. Any attempt to manipulate the referral system is prohibited.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">7. Intellectual Property</h2>
        <p className="text-text-secondary">Product listings, images, and descriptions from partner platforms remain the property of their respective owners. Gift Haven's branding, software, and platform design are our exclusive property.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">8. Limitation of Liability</h2>
        <p className="text-text-secondary">Gift Haven acts as an intermediary between users and e-commerce platforms. We are not liable for: product quality issues, shipping delays, platform downtime, or inaccuracies in product data from third-party APIs. Earnings are not guaranteed and depend on your promotional efforts.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">9. Termination</h2>
        <p className="text-text-secondary">We reserve the right to suspend or terminate accounts that violate these terms. Upon termination, any pending earnings will be forfeited if the violation involves fraud or abuse.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">10. Changes to Terms</h2>
        <p className="text-text-secondary">We may update these terms at any time. Continued use of the Platform after changes constitutes acceptance. We will notify users of material changes via email or in-app notification.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">11. Contact</h2>
        <p className="text-text-secondary">For questions about these terms, contact us at <a href="mailto:https://t.me/Shopping_Operations" className="text-accent">https://t.me/Shopping_Operations</a>.</p>
      </section>
    </div>
  )
}

function PrivacyContent() {
  return (
    <div className="prose prose-sm max-w-none text-text leading-relaxed space-y-6">
      <section>
        <h2 className="text-xl font-bold mb-3">1. Information We Collect</h2>
        <p className="text-text-secondary">We collect information you provide during registration: name, email address, phone number, and payment details for withdrawals. We also collect usage data including task completion history, referral activity, and transaction records.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">2. How We Use Your Data</h2>
        <p className="text-text-secondary">Your data is used to: provide and improve our services, process earnings and withdrawals, detect and prevent fraud, communicate important updates, and comply with legal obligations. We do not sell your personal data to third parties.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">3. Data Sharing</h2>
        <p className="text-text-secondary">We share limited data with partnered e-commerce platforms (Amazon, Shopee, Lazada, etc.) solely for the purpose of tracking and validating orders through your referral links. We do not share your personal information with these platforms beyond what is technically necessary.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">4. Data Security</h2>
        <p className="text-text-secondary">We employ bank-grade encryption (AES-256) for all data in transit and at rest. Payment information is processed through PCI-compliant payment processors. We conduct regular security audits and penetration testing.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">5. Cookies</h2>
        <p className="text-text-secondary">We use essential cookies for authentication and session management. We also use analytics cookies to understand platform usage. You can disable non-essential cookies in your browser settings.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">6. Data Retention</h2>
        <p className="text-text-secondary">We retain your account data as long as your account is active. Upon account deletion, we remove personal data within 30 days. Transaction records are retained for 7 years to comply with financial regulations.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">7. Your Rights</h2>
        <p className="text-text-secondary">You have the right to: access your data, correct inaccurate data, delete your account, export your data, and opt out of marketing communications. To exercise these rights, contact us at https://t.me/Shopping_Operations.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">8. Third-Party Services</h2>
        <p className="text-text-secondary">Our platform links to third-party e-commerce platforms. Their privacy policies govern data collected on their sites. We are not responsible for their data practices.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">9. Children's Privacy</h2>
        <p className="text-text-secondary">Gift Haven is not intended for users under 18. We do not knowingly collect data from minors. If we discover such data, we will delete it immediately.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">10. Changes to Privacy Policy</h2>
        <p className="text-text-secondary">We will notify users of material changes to this policy. Continued use after changes constitutes acceptance.</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">11. Contact</h2>
        <p className="text-text-secondary">For privacy-related inquiries, contact our Data Protection Officer at <a href="mailto:https://t.me/Shopping_Operations" className="text-accent">https://t.me/Shopping_Operations</a>.</p>
      </section>
    </div>
  )
}
