import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, Check, ChevronLeft, Compass, Heart, LockKeyhole, MapPin, Menu, Sparkles, TrendingUp, Users, X } from 'lucide-react'
import type { Campaign, Tier } from './data'
import { daysLeft, demoCampaigns, money } from './data'
import './App.css'

type Page = 'discover' | 'how' | 'studio'
type LocalPledges = Record<string, { amount: number; count: number }>
const json = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init)
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'Request failed')
  return body as T
}
const localPledges = (): LocalPledges => {
  try { return JSON.parse(localStorage.getItem('questfund-demo-pledges') ?? '{}') as LocalPledges } catch { return {} }
}
const withLocalPledges = (campaigns: Campaign[]) => campaigns.map(c => {
  const extra = localPledges()[c.slug] ?? { amount: 0, count: 0 }
  const raisedCents = c.raisedCents + extra.amount
  const percent = Math.floor(raisedCents * 100 / c.goalCents)
  return { ...c, raisedCents, percent, backerCount: c.backerCount + extra.count, milestones: c.milestones.map(m => ({ ...m, unlocked: percent >= m.percent })) }
})
function Visual({ kind, large = false }: { kind: string; large?: boolean }) {
  return <div className={`visual visual-${kind} ${large ? 'visual-large' : ''}`} aria-hidden="true">
    {kind === 'clay' && <><i className="art-sun" /><i className="vase vase-a" /><i className="vase vase-b" /><i className="art-floor" /></>}
    {kind === 'paper' && <><i className="paper-shadow" /><i className="paper-book"><b>SUN<br />ROOM</b><small>ISSUE 01 / HOME</small></i><i className="paper-stem" /></>}
    {kind === 'citrus' && <><i className="citrus-halo" /><i className="bottle bottle-a">M<br />&<br />M</i><i className="bottle bottle-b">M<br />&<br />M</i><i className="citrus-leaf" /></>}
    <span className="art-caption">{kind === 'clay' ? 'MAKE SPACE TO CREATE' : kind === 'paper' ? 'STORIES TO HOLD' : 'SIP SOMETHING NEW'}</span>
  </div>
}
function Progress({ value }: { value: number }) {
  return <div className="progress" role="progressbar" aria-valuenow={Math.min(value, 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(value, 100)}%` }} /></div>
}
function CampaignCard({ campaign, onOpen }: { campaign: Campaign; onOpen: () => void }) {
  return <button className="campaign-card" onClick={onOpen}><Visual kind={campaign.visual} /><div className="card-body">
    <div className="card-meta"><span>{campaign.category}</span><span><MapPin size={13} /> {campaign.location}</span></div>
    <h3>{campaign.title}</h3><p>{campaign.tagline}</p><Progress value={campaign.percent} />
    <div className="card-amount"><strong>{money(campaign.raisedCents)}</strong><span>of {money(campaign.goalCents)}</span></div>
    <div className="card-foot"><span>{campaign.percent}% funded</span><span>{daysLeft(campaign.deadline)} days left <ArrowUpRight size={15} /></span></div>
  </div></button>
}
export default function App() {
  const [page, setPage] = useState<Page>('discover')
  const [campaigns, setCampaigns] = useState<Campaign[]>(demoCampaigns)
  const [preview, setPreview] = useState(false)
  const [stripeReady, setStripeReady] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [tier, setTier] = useState<Tier | null>(null)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(() => {
    const status = new URLSearchParams(window.location.search).get('status')
    return status === 'success' ? 'Thank you! Your pledge will appear once Stripe confirms payment.'
      : status === 'cancelled' ? 'Checkout was cancelled. You can try again anytime.' : ''
  })
  const [category, setCategory] = useState('All projects')
  const [menuOpen, setMenuOpen] = useState(false)
  const active = campaigns.find(c => c.slug === selected)
  const filtered = useMemo(() => category === 'All projects' ? campaigns : campaigns.filter(c => c.category === category), [campaigns, category])
  const total = campaigns.reduce((n, c) => n + c.raisedCents, 0)
  const backers = campaigns.reduce((n, c) => n + c.backerCount, 0)
  const unlocked = campaigns.flatMap(c => c.milestones).filter(m => m.unlocked).length
  async function load() {
    try { setCampaigns(await json<Campaign[]>('/api/campaigns')); setPreview(false) }
    catch { setCampaigns(withLocalPledges(demoCampaigns)); setPreview(true) }
    try { setStripeReady((await json<{ stripeConfigured: boolean }>('/payments/config')).stripeConfigured) }
    catch { setStripeReady(false) }
  }
  useEffect(() => { void Promise.resolve().then(load) }, [])
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('status')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])
  function navigate(next: Page) { setPage(next); setSelected(null); setMenuOpen(false); scrollTo({ top: 0, behavior: 'smooth' }) }
  function openCampaign(slug: string) { setSelected(slug); setTier(null); setNotice('') }
  function pickTier(value: Tier) { setTier(value); setAmount(String(value.minimumCents / 100)) }
  async function pledge(real: boolean) {
    if (!active || !tier) return
    const cents = Math.round(Number(amount) * 100)
    if (name.trim().length < 2 || !Number.isSafeInteger(cents) || cents < tier.minimumCents || cents > 100000000) {
      setNotice(`Enter your name and an amount from ${money(tier.minimumCents)} to $1,000,000.`); return
    }
    setBusy(true); setNotice('')
    const input = { tierId: tier.id, supporterName: name.trim(), amountCents: cents }
    try {
      if (real) {
        const result = await json<{ url: string }>('/payments/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: active.slug, ...input }) })
        window.location.assign(result.url); return
      }
      if (preview) {
        const saved = localPledges()
        const current = saved[active.slug] ?? { amount: 0, count: 0 }
        saved[active.slug] = { amount: current.amount + cents, count: current.count + 1 }
        localStorage.setItem('questfund-demo-pledges', JSON.stringify(saved))
        setCampaigns(withLocalPledges(demoCampaigns))
      } else {
        await json(`/api/campaigns/${active.slug}/demo-pledges`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
        await load()
      }
      setTier(null); setName(''); setNotice('Demo pledge added. Thanks for supporting this project!')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Pledge failed') }
    finally { setBusy(false) }
  }
  return <div className="site">
    <header><div className="header-inner"><button className="brand" onClick={() => navigate('discover')}><span className="brand-icon"><Sparkles size={21} /></span>quest<span>fund.</span></button>
      <nav className={menuOpen ? 'nav open' : 'nav'}><button className={page === 'discover' ? 'active' : ''} onClick={() => navigate('discover')}>Discover</button><button className={page === 'how' ? 'active' : ''} onClick={() => navigate('how')}>How it works</button><button className={page === 'studio' ? 'active' : ''} onClick={() => navigate('studio')}>Creator studio</button></nav>
      <button className="header-cta" onClick={() => navigate('studio')}>Creator studio <ArrowUpRight size={16} /></button><button className="menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu"><Menu size={23} /></button>
    </div></header>
    {notice && <div className="notice" role="status"><Sparkles size={17} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={17} /></button></div>}
    {page === 'discover' && <main>
      <section className="hero"><div className="hero-inner"><div className="hero-copy"><div className="eyebrow light"><i /> IDEAS WORTH BACKING</div><h1>Good ideas grow<br />better <em>together.</em></h1><p>Discover thoughtful projects, meet the people behind them, and get a little something special for helping them happen.</p><div className="hero-actions"><a className="button orange" href="#projects">Explore projects <ArrowRight size={18} /></a><button className="button ghost" onClick={() => navigate('how')}>How it works <ArrowRight size={18} /></button></div><div className="hero-proof"><span className="avatars"><i>MC</i><i>NR</i><i>AW</i></span><span><strong>Made possible by people like you</strong><small>Back creativity. Share in the journey.</small></span></div></div><div className="hero-art"><div className="orbit orbit-a" /><div className="orbit orbit-b" /><div className="sticker sticker-a"><Sparkles size={16} /> THE NEXT BIG THING</div><div className="hero-card"><Visual kind="clay" large /><div className="hero-card-info"><span>FEATURED PROJECT</span><strong>Wildwood Studio</strong><div><Progress value={68} /><b>68%</b></div></div></div><div className="sticker sticker-b"><Heart size={20} fill="currentColor" /> Made with community</div></div></div></section>
      <section className="stat-strip"><div><strong>{money(total)}</strong><span>raised together</span></div><div><strong>{backers}</strong><span>people backing ideas</span></div><div><strong>{unlocked}</strong><span>milestones unlocked</span></div><p><Sparkles size={18} /> Every pledge moves a story forward.</p></section>
      <section className="projects wrap" id="projects"><div className="section-heading"><div><div className="eyebrow"><i /> FIND YOUR NEXT FAVORITE</div><h2>Projects with purpose.</h2><p>Fresh ideas from people making things that matter.</p></div><span>Curated with curiosity <Sparkles size={17} /></span></div><div className="filters">{['All projects', 'Design', 'Publishing', 'Food & Drink'].map(item => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="cards">{filtered.map(c => <CampaignCard key={c.slug} campaign={c} onOpen={() => openCampaign(c.slug)} />)}</div></section>
      <section className="callout wrap"><div className="callout-icon"><Sparkles size={34} /></div><div><span>FOR THE CURIOUS & THE COURAGEOUS</span><h2>Small support. Big beginnings.</h2><p>Find a project you love, choose a reward, and be part of what happens next.</p></div><button className="button dark" onClick={() => navigate('how')}>See how it works <ArrowRight size={18} /></button></section>
    </main>}
    {page === 'how' && <main className="subpage"><div className="wrap sub-hero"><div className="eyebrow"><i /> THE SIMPLE VERSION</div><h1>Be part of the <em>beginning.</em></h1><p>QuestFund connects people with ideas worth making real. Back a project, unlock rewards, and follow every milestone along the way.</p></div><div className="steps wrap"><article><span>01</span><Compass size={29} /><h2>Find your thing</h2><p>Explore creative projects and get to know the makers behind them.</p></article><article><span>02</span><Heart size={29} /><h2>Choose your reward</h2><p>Pick a tier that feels right. Each reward is a thank-you from the creator.</p></article><article><span>03</span><TrendingUp size={29} /><h2>Watch it grow</h2><p>Your support moves the funding bar and unlocks new project milestones.</p></article></div><div className="how-note wrap"><LockKeyhole size={20} /> Stripe Checkout runs in test mode when configured. Demo pledges never charge a card.</div><div className="center"><button className="button orange" onClick={() => navigate('discover')}>Explore projects <ArrowRight size={18} /></button></div></main>}
    {page === 'studio' && <main className="subpage studio wrap"><div className="studio-heading"><div><div className="eyebrow"><i /> CREATOR STUDIO / DEMO</div><h1>Your impact, <em>at a glance.</em></h1><p>A live overview of pledges and unlocked milestones across featured campaigns.</p></div><span className="live"><i /> {preview ? 'Browser preview' : 'Connected to MongoDB'}</span></div><div className="dashboard-stats"><article><span><TrendingUp size={20} /> Total raised</span><strong>{money(total)}</strong><small>Across {campaigns.length} campaigns</small></article><article><span><Users size={20} /> Supporters</span><strong>{backers}</strong><small>People behind the projects</small></article><article><span><Sparkles size={20} /> Milestones</span><strong>{unlocked}</strong><small>Creative goals unlocked</small></article></div><div className="dashboard-panel"><div className="panel-head"><h2>Campaign performance</h2><span>Funding progress</span></div>{campaigns.map(c => <button className="dashboard-row" key={c.slug} onClick={() => openCampaign(c.slug)}><span className={`mini mini-${c.visual}`}><Sparkles size={22} /></span><span className="row-name"><strong>{c.title}</strong><small>{c.category} · {c.backerCount} supporters</small></span><span className="row-progress"><Progress value={c.percent} /><small>{c.percent}% of {money(c.goalCents)} goal</small></span><strong>{money(c.raisedCents)}</strong><ArrowUpRight size={18} /></button>)}</div><p className="studio-note"><Sparkles size={17} /> This portfolio dashboard is read-only. Creator accounts and campaign editing are not included.</p></main>}
    <footer><div className="wrap footer-inner"><div><div className="footer-brand"><Sparkles size={22} /> quest<span>fund.</span></div><p>Good ideas grow better together.</p></div><div className="footer-links"><button onClick={() => navigate('discover')}>Discover</button><button onClick={() => navigate('how')}>How it works</button><button onClick={() => navigate('studio')}>Creator studio</button></div><small>© {new Date().getFullYear()} QuestFund · A portfolio project</small></div></footer>
    {active && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null) }}><div className="modal" role="dialog" aria-modal="true" aria-label={active.title}><button className="modal-close" onClick={() => setSelected(null)} aria-label="Close"><X size={20} /></button><div className="modal-art"><Visual kind={active.visual} large /></div><div className="modal-body"><div className="modal-top"><span>{active.category} / {active.location}</span><span>{daysLeft(active.deadline)} days left</span></div><h2>{active.title}</h2><p className="modal-tagline">{active.tagline}</p><p className="byline">A project by <strong>{active.creator}</strong></p><div className="modal-money"><div><strong>{money(active.raisedCents)}</strong><small>raised of {money(active.goalCents)} goal</small></div><b>{active.percent}%</b></div><Progress value={active.percent} /><div className="modal-section"><h3>The story</h3><p>{active.story}</p></div><div className="modal-section"><div className="section-line"><h3>Milestones</h3><span>{active.milestones.filter(m => m.unlocked).length}/{active.milestones.length} unlocked</span></div>{active.milestones.map(m => <div className={`milestone ${m.unlocked ? 'unlocked' : ''}`} key={m.percent}><i>{m.unlocked ? <Check size={17} /> : <LockKeyhole size={16} />}</i><span><strong>{m.title}</strong><small>{m.description}</small></span><b>{m.percent}%</b></div>)}</div><div className="modal-section"><div className="section-line"><h3>Choose your reward</h3><span>Pick what speaks to you</span></div>{active.tiers.map(option => <button className={`reward ${tier?.id === option.id ? 'picked' : ''}`} key={option.id} onClick={() => pickTier(option)}><span><strong>{option.title}</strong><small>{option.description}</small><em>{option.perk}</em></span><b>{money(option.minimumCents)}+</b></button>)}</div>{tier && <div className="pledge-form"><div className="pledge-title"><button onClick={() => setTier(null)}><ChevronLeft size={18} /></button><strong>Back {active.title}</strong></div><label>Your name<input value={name} onChange={e => setName(e.target.value)} placeholder="How should we thank you?" maxLength={80} /></label><label>Pledge amount (USD)<span className="amount-input">$ <input type="number" min={tier.minimumCents / 100} value={amount} onChange={e => setAmount(e.target.value)} /></span></label><button className="button orange pledge-button" disabled={busy} onClick={() => void pledge(false)}>{busy ? 'Adding pledge...' : 'Make a demo pledge'} <ArrowRight size={18} /></button>{stripeReady && <button className="stripe-button" disabled={busy} onClick={() => void pledge(true)}>Pay with Stripe test mode <ArrowUpRight size={16} /></button>}<small className="demo-note">Demo pledges use no card and are labeled as demo data.</small></div>}</div></div></div>}
  </div>
}
