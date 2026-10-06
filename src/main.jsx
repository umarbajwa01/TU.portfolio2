import React, {useState, useEffect, useLayoutEffect, useRef} from 'react';
import {createRoot} from 'react-dom/client';
import Mascot, {Room} from './Mascot.jsx';
import './styles.css';

const projects=[
 {name:'Hate Speech Detection',subtitle:'& automated moderation',type:'Machine learning',stack:['Python','React','Node.js','Express','MongoDB'],description:'A machine-learning-based system for detecting harmful text, with a web interface and Discord moderation workflow.',details:'The project combines text classification with progressive moderation: warnings for initial violations and stronger action for repeated ones.',live:'https://hate-speech-detection-azure.vercel.app/',github:'https://github.com/umarbajwa01/hate-speech-detection',mark:'Aa',label:'TEXT → CLASSIFY → MODERATE'},
 {name:'Finora',subtitle:'Personal finance, in one place',type:'Web application',stack:['JavaScript','Vercel'],description:'A finance management application with a login flow and a clear interface for viewing and managing financial information.',details:'Built with an emphasis on readable information and straightforward navigation. Deployed on Vercel.',live:'https://finora-eight-beige.vercel.app/login',github:'https://github.com/umarbajwa01/Finora',mark:'ƒ',label:'ORGANIZE / UNDERSTAND'},
 {name:'Exactitude Estimation',subtitle:'Business website',type:'Business website',stack:['HTML','CSS','JavaScript','React'],description:'A responsive website presenting company services and business information with consistent navigation across screen sizes.',details:'Interactive front-end elements focus on usability and visual consistency. Deployed on Vercel.',live:'https://exactitude-vesv.vercel.app/',mark:'E.',label:'CLARITY / PRECISION'},
 {name:'Job Tracker',subtitle:'A clearer application journey',type:'Web application',stack:['JavaScript','Vercel'],description:'A web application for recording job applications, organizing opportunities and following their progress.',details:'A simple interface brings applications together in one place. Deployed on Vercel.',live:'https://job-tracker-phi-livid.vercel.app/',github:'https://github.com/umarbajwa01/Job-Tracker',mark:'JT',label:'APPLY / ORGANIZE / FOLLOW UP'},
 {name:'Todo App',subtitle:'Make room for what matters',type:'Web application',stack:['JavaScript'],description:'A task management application for adding, completing and deleting daily tasks.',details:'Focused on the core workflow: create a task, keep track of it and mark it complete.',github:'https://github.com/umarbajwa01/todo',mark:'✓',label:'PLAN / DO / COMPLETE'}
];
const pages=['Home','Projects','About','Contact'];
const external={target:'_blank',rel:'noopener noreferrer'};
function App(){
 const getPage=()=>{let p=location.hash.slice(1).toLowerCase();return pages.find(n=>n.toLowerCase()===p)||'Home'};
 const [page,setPage]=useState(getPage),[filter,setFilter]=useState('All'),[open,setOpen]=useState(null),[copied,setCopied]=useState(false);
 const main=useRef(null), header=useRef(null), footer=useRef(null), dock=useRef(null);
 // Dark / light theme: saved choice wins, otherwise follow the phone's system setting.
 const [theme,setTheme]=useState(()=>document.documentElement.getAttribute('data-theme')||'light');
 useEffect(()=>{
  document.documentElement.setAttribute('data-theme',theme);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content',theme==='dark'?'#0f1110':'#ebebea');
 },[theme]);
 useEffect(()=>{
  const mq=window.matchMedia('(prefers-color-scheme: dark)');
  const fn=e=>{let saved=null;try{saved=localStorage.getItem('theme')}catch{} if(!saved)setTheme(e.matches?'dark':'light')};
  mq.addEventListener('change',fn);return()=>mq.removeEventListener('change',fn)
 },[]);
 const toggleTheme=()=>{const next=theme==='dark'?'light':'dark';setTheme(next);try{localStorage.setItem('theme',next)}catch{}};
 // Anchor the shirt to the viewport edge until the footer pushes it upward.
 // Recompute the available height too, so the hat never clips behind the header.
 useLayoutEffect(()=>{
  let frame=0;
  const update=()=>{
   frame=0;
   if(!dock.current || !footer.current || !header.current) return;
   const bottom=Math.max(0,window.innerHeight-footer.current.getBoundingClientRect().top);
   const top=Math.max(16,header.current.getBoundingClientRect().bottom+24);
   const height=Math.max(0,window.innerHeight-bottom-top-32);
   dock.current.style.setProperty('--footer-offset',`${bottom}px`);
   dock.current.style.setProperty('--mascot-height',`${height}px`);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)};
  const observer=new ResizeObserver(schedule);
  [header.current,main.current,footer.current].forEach(el=>el&&observer.observe(el));
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  update();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule)};
 },[page]);
 useEffect(()=>{const fn=()=>{setPage(getPage());setOpen(null);window.scrollTo({top:0,behavior:'instant'})};window.addEventListener('hashchange',fn);return()=>window.removeEventListener('hashchange',fn)},[]);
 useEffect(()=>{document.title=`${page==='Home'?'Full Stack Developer':page} | Toufeeq Umar`},[page]);
 async function copy(){try{await navigator.clipboard.writeText('toufeequmarbajwa@gmail.com');setCopied(true);setTimeout(()=>setCopied(false),2200)}catch{setCopied(false);location.href='mailto:toufeequmarbajwa@gmail.com'}}
 return <div className={`site page-${page.toLowerCase()}`}><Room/><a href="#main" className="skip" onClick={e=>{e.preventDefault();main.current.focus()}}>Skip to content</a>
 <header ref={header} className="header"><a className="brand" href="#home" aria-label="Toufeeq Umar, home"><b>TU</b><span>TOUFEEQ UMAR</span></a><nav aria-label="Main navigation">{pages.map((p,i)=><a key={p} href={'#'+p.toLowerCase()} aria-current={page===p?'page':undefined}><span className="nav-index">0{i+1}</span>{p}</a>)}</nav><a className="header-contact" href="mailto:toufeequmarbajwa@gmail.com">LET’S TALK <span>✳</span></a><button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={theme==='dark'?'Switch to light mode':'Switch to dark mode'} title={theme==='dark'?'Light mode':'Dark mode'}><svg className="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><svg className="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button></header>
 <main id="main" ref={main} tabIndex={-1}>
 {page==='Home'?<section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="edition">2026</span> DEVELOPER PORTFOLIO</div><h1><span>TOUFEEQ</span><span className="name-last">UMAR<span className="name-star" aria-hidden="true">*</span></span></h1><div className="role"><span>FULL STACK</span><span>DEVELOPER<span className="role-dot">.</span></span></div><p className="intro">From interface to API.<br/>I build web applications with React,<br className="desktop-break"/> Node.js, Express and MongoDB.</p><div className="hero-actions"><a className="pill" href="#projects"><span>Explore*</span><b>Selected work</b></a><a className="text-link" href="/Toufeeq-Umar-CV.docx" download>Download CV</a></div><div className="hero-meta"><span>PASRUR, PAKISTAN</span><span>BSCS · CLASS OF 2026</span></div></div><div className="hero-note"><span>CURIOUS BY NATURE.<br/>DEVELOPER BY CHOICE.</span><span className="note-line"/></div></section>:null}
 {page==='Projects'?<section className="content projects"><div className="eyebrow">01 / SELECTED WORK</div><h1 className="page-title">Things I’ve<br/><span className="underlined">built.</span><sup>05</sup></h1><p className="page-intro">Web applications, practical tools and a little machine learning. Explore the projects and their source.</p><div className="filters" aria-label="Filter projects">{['All','Web application','Machine learning','Business website'].map(f=><button key={f} onClick={()=>{setFilter(f);setOpen(null)}} aria-pressed={filter===f}>{f==='All'?'All projects':f}</button>)}</div><div className="project-list">{projects.map((p,i)=>filter==='All'||p.type===filter?<article className="project" key={p.name}><div className={`project-art art-${i}`} aria-hidden="true"><span className="art-index">0{i+1} / 2026</span><strong>{p.mark}</strong><span className="art-label">{p.label}</span></div><div className="project-body"><p className="project-type">{p.type}</p><h2>{p.name}</h2><p className="project-subtitle">{p.subtitle}</p><p>{p.description}</p><div className="tags">{p.stack.map(t=><span key={t}>{t}</span>)}</div><div className="project-links">{p.live&&<a href={p.live} {...external}>Live demo</a>}{p.github&&<a href={p.github} {...external}>GitHub</a>}<button aria-expanded={open===i} aria-controls={'details-'+i} onClick={()=>setOpen(open===i?null:i)}>{open===i?'Less −':'Details +'}</button></div><p className="details" id={'details-'+i} hidden={open!==i}>{p.details}</p></div></article>:null)}</div></section>:null}
 {page==='About'?<section className="content about"><div className="eyebrow">02 / THE PERSON BEHIND THE CODE</div><h1 className="page-title">A builder.<br/>A <span className="underlined">learner.</span></h1><p className="about-lead">I’m Toufeeq Umar, a Full Stack Developer based in Pasrur, Pakistan.</p><p className="page-intro">A fresh Computer Science graduate from the University of the Punjab, I build web applications with React, Node.js, Express and MongoDB. My projects range from business websites to machine-learning-based text moderation.</p><div className="about-section"><div className="section-label">01 / TOOLKIT</div><h2>From the browser<br/>to the backend.</h2><dl className="skills">{[['Frontend','HTML5 · CSS3 · JavaScript · React · Responsive design'],['Backend','Node.js · Express.js · RESTful APIs · API integration'],['Data & ML','MongoDB · Python · Text classification · ML model integration'],['Workflow','Git · GitHub · Vercel']].map(([t,d])=><div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}</dl></div><div className="about-section"><div className="section-label">02 / EDUCATION</div><div className="education"><span className="year-stamp">2026</span><div><h2>BS Computer Science</h2><p>University of the Punjab</p></div></div></div><div className="about-section"><div className="section-label">03 / COMMUNICATION</div><div className="language-row"><span>Urdu <small>Fluent</small></span><span>Punjabi <small>Fluent</small></span><span>English <small>Intermediate</small></span></div></div><a className="button" href="/Toufeeq-Umar-CV.docx" download>Download my CV</a></section>:null}
 {page==='Contact'?<section className="content contact"><div className="eyebrow">03 / START A CONVERSATION</div><h1 className="page-title">Let’s build<br/><span className="underlined">something.</span></h1><p className="page-intro">Hiring for an entry-level full-stack role, or have a web project in mind? Get in touch.</p><div className="contact-main"><span className="section-label">EMAIL ME</span><a className="email" href="mailto:toufeequmarbajwa@gmail.com">toufeequmarbajwa<br className="email-break"/>@gmail.com</a><button className="copy" onClick={copy}>{copied?'Email copied':'Copy email'}</button><span className="sr-only" role="status">{copied?'Email address copied to clipboard':''}</span></div><div className="contact-links"><a href="https://github.com/umarbajwa01" {...external}><span>GitHub</span><small>@umarbajwa01</small></a><a href="https://www.linkedin.com/in/toufeeq-umer-b77352284" {...external}><span>LinkedIn</span><small>Toufeeq Umar</small></a><a href="tel:+923404120360"><span>Phone</span><small>+92 340 4120360</small></a></div><p className="location">BASED IN PASRUR, PUNJAB, PAKISTAN</p></section>:null}
 </main>
 <aside ref={dock} className={`mascot-dock ${page==='Home'?'is-home':''}`} aria-label="Interactive portfolio mascot"><div className="mascot-caption"><span>MEET YOUR GUIDE</span><span>MOVE YOUR CURSOR · TAP TO SAY HI</span></div><Mascot greetings={["Hi! I’m Toufeeq’s guide.","Have a look at the projects!","Let’s build something useful.","Thanks for stopping by!"]}/></aside>
 <footer ref={footer}><a href="#home">TOUFEEQ UMAR<span>© 2026</span></a><span>REACT · NODE.JS · EXPRESS · MONGODB</span><a href="mailto:toufeequmarbajwa@gmail.com">LET’S CONNECT</a></footer>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
