/* =========================================================================
   CALIBR — Posture Coach  ·  pure JS, no dependencies
   Screens render into #screen; icons & charts are inline SVG.
   ========================================================================= */
'use strict';
const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $  = (s, r = document) => r.querySelector(s);

/* ---------------------------------------------------------------- data --- */
const DATA = {
  user:{ name:'Jiwon', initial:'J', handicap:18, goal:'Break 90',
         roundInDays:3, roundName:'Namdong CC', streak:6, weekSessions:4,
         baselineDate:'Jun 3, 2026' },
  mission:{
    title:'Impact Stability',
    focus:'Hold your head still through the ball — quiet the sway you had at the top last time.',
    min:12, mode:'Mid Iron', reps:'3 blocks · 8 reps',
    adjusted:'Load lightened for the left wrist you flagged — fewer full swings, more slow tempo reps.',
  },
  correction:'Let the trail elbow fold later. You’re casting from the top.',
  report:{
    date:'Tonight · 13 min',
    finding:'The top over-rotated again, but impact was the steadiest it’s been — the fix is holding downstream.',
    phases:[
      {k:'Address', warn:false},
      {k:'Top',     warn:true },
      {k:'Impact',  warn:false},
      {k:'Finish',  warn:false},
    ],
    metrics:[
      {k:'Tempo',           v:'3.0', sub:':1 back·down', dir:'up',   d:'+0.2', spark:[2.6,2.7,2.7,2.9,3.0]},
      {k:'Head Steadiness', v:'92',  sub:'%',            dir:'up',   d:'+4',   spark:[80,83,85,88,92]},
      {k:'Weight Transfer', v:'78',  sub:'% to lead',    dir:'up',   d:'+6',   spark:[64,67,70,74,78]},
      {k:'Wrist Release',   v:'Late',sub:'timing',       dir:'down', d:'−3',   spark:[88,86,85,84,81], warn:true},
    ],
    improved:3, total:4, success:82, streak:6,
  },
  growth:{
    weekSessions:4, weekMin:52, weekGoal:5, monthName:'July 2026',
    firstDow:2 /* Jul 1 2026 = Wed(0=Sun) */, days:31, today:22,
    done:[1,2,4,6,7,9,11,13,14,16,18,20,21,22],
    trend:{ name:'Head Steadiness', baseline:74,
            values:[74,76,79,82,84,88,92], labels:['W1','W2','W3','W4','W5','W6','Now'] },
    ba:[
      {k:'Spine angle at address', b:'28°',   a:'34°',  d:'+6°'},
      {k:'Head sway, top → impact',b:'6.2 cm', a:'3.7 cm',d:'−40%'},
      {k:'Hip rotation at impact', b:'32°',   a:'41°',  d:'+9°'},
    ],
  },
  // Putting session = game-result report (no posture avatar; measurable outcomes only)
  puttReport:{ date:'Tonight · 9 min', made:4, attempts:5, lastMade:3,
    streak:6, avgError:20, avgErrorGain:6, tempo:91, tempoDelta:3,
    finding:'Pace control tightened — your misses clustered just short, an easy read to adjust.',
    accSpark:[34,30,27,24,20], tempoSpark:[82,85,87,89,91] },
  // Individual training missions — measurable actions only (counts / tempo / pass-fail)
  missions:[
    {id:'m1', cat:'putt',  goal:'Sink ten 3-metre putts',            min:8,  mode:'Putt',        diff:'Medium', done:true,  rec:false},
    {id:'m2', cat:'putt',  goal:'Pass the putting gate 8 of 10',     min:6,  mode:'Putt',        diff:'Medium', done:false, rec:true },
    {id:'m3', cat:'putt',  goal:'Lag 8m putts to inside 1m — 6 of 8',min:7,  mode:'Putt',        diff:'Hard',   done:false, rec:false},
    {id:'m4', cat:'swing', goal:'Hold wedge tempo across 20 swings', min:10, mode:'Wedge',       diff:'Medium', done:true,  rec:false},
    {id:'m5', cat:'swing', goal:'Fix weight-transfer timing — 10 swings', min:9, mode:'Mid Iron',diff:'Medium', done:false, rec:true },
    {id:'m6', cat:'swing', goal:'Keep head steady — 12 mid-iron swings', min:8, mode:'Mid Iron', diff:'Easy',   done:false, rec:true },
    {id:'m7', cat:'swing', goal:'Adapt to the driver balance — 15 swings', min:12, mode:'Driver',diff:'Hard',   done:false, rec:false},
    {id:'m8', cat:'swing', goal:'Fairway-wood tempo — 15 swings',    min:11, mode:'Fairway Wood',diff:'Medium', done:false, rec:false},
    {id:'m9', cat:'swing', goal:'Hybrid low-point control — 12 swings', min:9, mode:'Hybrid',    diff:'Medium', done:false, rec:false},
  ],
};
/* Round-prep set = the weak spots pulled from recent sessions, run back-to-back */
const ROUND_PREP={ title:'Round Prep', mode:'Full-bag mix', min:22, sets:12,
  focus:'Top over-rotation, impact spine angle, and 3m putts — your softest spots this month.' };

const MODES = ['Driver','Fairway Wood','Hybrid','Mid Iron','Wedge','Putt'];
const DIFF_ORDER={Easy:0,Medium:1,Hard:2};

/* --------------------------------------------------------------- state --- */
const state = {
  screen:'home',
  mood:null,              // 0 fresh · 1 okay · 2 tired · null = none selected
  areas:new Set(),        // discomfort
  growthTab:'calendar',
  missionCat:'all',       // missions filter: all | swing | putt | rec
  ob:0,                   // onboarding step
  obGoal:0,
  reflected:false,
  reportPhase:'impact',   // avatar phase shown in report
  sessionType:'swing',    // 'swing' → posture report · 'putt' → game-result report
  replaying:false,
  replayTimer:null,
  // baseline: established demo by default; onboarding flips to a fresh user
  hasBaseline:true,       // false = no starting point captured yet
  baselineJustSet:false,  // show the "saved as baseline" state on the report
  obScore:null,           // onboarding: target-score choice (none until tapped)
  obRound:null,           // onboarding: next-round choice (none until tapped)
};

/* --------------------------------------------------------------- icons --- */
const I = {
  home:'<path d="M4 11 12 4l8 7"/><path d="M6 10.2V19h4v-5h4v5h4v-8.8"/>',
  growth:'<path d="M4 5v14h16"/><path d="M7 14l3.5-4L14 13l5-7"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4.5 20c1.4-3.6 5-5 7.5-5s6.1 1.4 7.5 5"/>',
  play:'<path d="M8 5.2 19 12 8 18.8Z"/>',
  bell:'<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  share:'<path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M5 12v7h14v-7"/>',
  back:'<path d="M15 5 8 12l7 7"/>',
  chev:'<path d="m9 6 6 6-6 6"/>',
  gear:'<circle cx="12" cy="12" r="3.1"/><path d="M12 2.5v2.6M12 18.9v2.6M4.6 4.6 6.5 6.5M17.5 17.5l1.9 1.9M2.5 12h2.6M18.9 12h2.6M4.6 19.4 6.5 17.5M17.5 6.5l1.9-1.9"/>',
  camera:'<rect x="3" y="7" width="18" height="13" rx="3.5"/><circle cx="12" cy="13.5" r="3.4"/><path d="M8.5 7 10 4h4l1.5 3"/>',
  laser:'<circle cx="12" cy="12" r="7"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  voice:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0"/><path d="M12 17.5V21"/>',
  shield:'<path d="M12 3l7 3v5.5c0 4.6-3.2 7.6-7 9.5-3.8-1.9-7-4.9-7-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
  target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="3.5"/><path d="M3 9.5h18M8 3v4M16 3v4"/>',
  edit:'<path d="M4 20h4L18.5 9.5l-4-4L4 16z"/><path d="m13 7 4 4"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  bt:'<path d="m8 7 8 10-4 3V4l4 3-8 10"/>',
  clock:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 1.8"/>',
  flag:'<path d="M6 21V4"/><path d="M6 5h11l-2 3 2 3H6"/>',
  bolt:'<path d="M13 3 5 13h5l-1 8 8-11h-5z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  missions:'<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 5.6l1.3 1.3L7.7 4.2M4 11.6l1.3 1.3L7.7 10.2M4 17.6l1.3 1.3L7.7 16.2"/>',
  target2:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
};
const svgIco = (p, extra='') => `<svg viewBox="0 0 24 24" ${extra}>${p}</svg>`;

/* mood faces (SVG, not emoji) */
const FACE = {
  0:'<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.2 4.2 0 0 0 7 0"/><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/>',
  1:'<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5h7"/><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/>',
  2:'<circle cx="12" cy="12" r="9"/><path d="M8.5 15.5a4.2 4.2 0 0 1 7 0"/><path d="M8 10.5l2 .6M16 10.5l-2 .6"/>',
};
const MOOD_LAB = ['Fresh','Okay','Tired'];

/* ----------------------------------------------------- skeleton avatar --- */
/* face-on golfer · viewBox 200×300 · club end is `club` */
const BASE = { head:[100,52], neck:[100,74], shL:[78,95], shR:[122,95],
  elL:[70,130], elR:[130,128], hand:[100,160], hip:[100,170],
  hipL:[85,170], hipR:[115,170], knL:[82,224], knR:[118,224],
  anL:[80,276], anR:[120,276], club:[100,290] };
const POSES = {
  address: {...BASE},
  top:     {...BASE, head:[98,52], shL:[80,102], shR:[122,84], hand:[152,78], elR:[141,96], elL:[119,88],
            hipR:[119,169], club:[119,44]},
  impact:  {...BASE, head:[97,55], hand:[108,160], hipL:[86,168], hipR:[117,172],
            club:[107,290]},
  finish:  {...BASE, head:[95,50], shL:[78,86], shR:[120,100], hand:[56,76], elL:[62,100], elR:[82,94],
            hipL:[84,169], hipR:[116,171], knR:[118,214], anR:[118,266], club:[90,48]},
};
const BONES=[['neck','hip'],['shL','shR'],['shL','elL'],['elL','hand'],
  ['shR','elR'],['elR','hand'],['hipL','hipR'],['hipL','knL'],['knL','anL'],
  ['hipR','knR'],['knR','anR']];
const JOINTS=['shL','shR','elL','elR','hand','hipL','hipR','knL','knR','anL','anR'];

function skeletonInner(pose){
  const L=(f,t)=>`<line class="bone" data-from="${f}" data-to="${t}" x1="${pose[f][0]}" y1="${pose[f][1]}" x2="${pose[t][0]}" y2="${pose[t][1]}"/>`;
  const bones=BONES.map(([f,t])=>L(f,t)).join('');
  const club=`<line class="club" data-club x1="${pose.hand[0]}" y1="${pose.hand[1]}" x2="${pose.club[0]}" y2="${pose.club[1]}"/>`;
  const neck=`<line class="bone" data-from="head" data-to="neck" x1="${pose.head[0]}" y1="${pose.head[1]}" x2="${pose.neck[0]}" y2="${pose.neck[1]}"/>`;
  const head=`<circle class="joint" data-head cx="${pose.head[0]}" cy="${pose.head[1]}" r="12"/>`;
  const j=JOINTS.map(k=>`<circle class="joint" data-j="${k}" cx="${pose[k][0]}" cy="${pose[k][1]}" r="3.4"/>`).join('');
  return `${club}${neck}${bones}${head}${j}`;
}
function buildSkeleton(pose, cls=''){
  return `<svg viewBox="0 0 200 300" class="skeleton ${cls}">${skeletonInner(pose)}</svg>`;
}

/* ---- Glow joint-mannequin (volumetric, pose-driven) ---------------------- */
const cap = s => s[0].toUpperCase()+s.slice(1);
const pt  = p => `${p[0]},${p[1]}`;
const spineMid = p => [(p.neck[0]+p.hip[0])/2,(p.neck[1]+p.hip[1])/2];
const crown    = p => [p.head[0], p.head[1]-11];
/* thick "capsule" bones that give the figure volume */
const BODYBONES=[['neck','hip',30],['shL','shR',19],['shL','elL',13],['elL','hand',12],
  ['shR','elR',13],['elR','hand',12],['hipL','knL',16],['knL','anL',13],
  ['hipR','knR',16],['knR','anR',13]];
const DOTS=['crown','shL','shR','elL','elR','hand','spine','hip','knL','knR','anL','anR'];
const dotPoint=(pose,k)=> k==='crown'?crown(pose): k==='spine'?spineMid(pose): pose[k];

function figShapes(pose){
  const caps=BODYBONES.map(([f,t,w])=>
    `<line x1="${pose[f][0]}" y1="${pose[f][1]}" x2="${pose[t][0]}" y2="${pose[t][1]}" stroke-width="${w}"/>`).join('');
  const torso=`<polygon class="torso" points="${pt(pose.shL)} ${pt(pose.shR)} ${pt(pose.hipR)} ${pt(pose.hipL)}"/>`;
  const head=`<circle class="fig-head" cx="${pose.head[0]}" cy="${pose.head[1]}" r="15"/>`;
  return torso+caps+head;
}
function figWire(pose){
  const lines=BONES.map(([f,t])=>`<line x1="${pose[f][0]}" y1="${pose[f][1]}" x2="${pose[t][0]}" y2="${pose[t][1]}"/>`).join('')
    +`<line x1="${pose.head[0]}" y1="${pose.head[1]}" x2="${pose.neck[0]}" y2="${pose.neck[1]}"/>`;
  const club=`<line class="club" x1="${pose.hand[0]}" y1="${pose.hand[1]}" x2="${pose.club[0]}" y2="${pose.club[1]}"/>`;
  const dots=DOTS.map(k=>{const p=dotPoint(pose,k);return `<circle cx="${p[0]}" cy="${p[1]}" r="2.3"/>`;}).join('');
  return lines+club+dots;
}
function glowFigure(pose){
  const s=figShapes(pose);
  return `<g class="figbloom">${s}</g><g class="figbody">${s}</g><g class="figwire">${figWire(pose)}</g>`;
}
/* animatable variant — elements tagged so setGlowPose() can morph them in a loop */
function figShapesAnim(pose){
  const caps=BODYBONES.map(([f,t,w])=>
    `<line data-from="${f}" data-to="${t}" x1="${pose[f][0]}" y1="${pose[f][1]}" x2="${pose[t][0]}" y2="${pose[t][1]}" stroke-width="${w}"/>`).join('');
  return `<polygon class="torso" data-torso points="${pt(pose.shL)} ${pt(pose.shR)} ${pt(pose.hipR)} ${pt(pose.hipL)}"/>`
    +caps+`<circle class="fig-head" data-head cx="${pose.head[0]}" cy="${pose.head[1]}" r="15"/>`;
}
function figWireAnim(pose){
  const lines=BONES.map(([f,t])=>`<line data-from="${f}" data-to="${t}" x1="${pose[f][0]}" y1="${pose[f][1]}" x2="${pose[t][0]}" y2="${pose[t][1]}"/>`).join('')
    +`<line data-from="head" data-to="neck" x1="${pose.head[0]}" y1="${pose.head[1]}" x2="${pose.neck[0]}" y2="${pose.neck[1]}"/>`;
  const club=`<line class="club" data-club x1="${pose.hand[0]}" y1="${pose.hand[1]}" x2="${pose.club[0]}" y2="${pose.club[1]}"/>`;
  const dots=DOTS.map(k=>{const p=dotPoint(pose,k);return `<circle data-dot="${k}" cx="${p[0]}" cy="${p[1]}" r="2.3"/>`;}).join('');
  return lines+club+dots;
}
function glowFigureAnim(pose){
  const s=figShapesAnim(pose);
  return `<g class="figbloom">${s}</g><g class="figbody">${s}</g><g class="figwire">${figWireAnim(pose)}</g>`;
}
function setGlowPose(svg,pose){
  svg.querySelectorAll('line[data-from]').forEach(l=>{
    const a=pose[l.dataset.from], b=pose[l.dataset.to];
    l.setAttribute('x1',a[0]); l.setAttribute('y1',a[1]); l.setAttribute('x2',b[0]); l.setAttribute('y2',b[1]);
  });
  svg.querySelectorAll('[data-torso]').forEach(t=>
    t.setAttribute('points',`${pt(pose.shL)} ${pt(pose.shR)} ${pt(pose.hipR)} ${pt(pose.hipL)}`));
  svg.querySelectorAll('[data-head]').forEach(h=>{h.setAttribute('cx',pose.head[0]);h.setAttribute('cy',pose.head[1]);});
  svg.querySelectorAll('[data-club]').forEach(c=>{c.setAttribute('x1',pose.hand[0]);c.setAttribute('y1',pose.hand[1]);c.setAttribute('x2',pose.club[0]);c.setAttribute('y2',pose.club[1]);});
  svg.querySelectorAll('[data-dot]').forEach(d=>{const p=dotPoint(pose,d.dataset.dot);d.setAttribute('cx',p[0]);d.setAttribute('cy',p[1]);});
}
function avatarDefs(){
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ECFFF5"/><stop offset="45%" stop-color="#A6E7DF"/>
      <stop offset="100%" stop-color="#4FBEB2"/></linearGradient>
    <radialGradient id="headGrad" cx="40%" cy="34%" r="72%">
      <stop offset="0" stop-color="#F4FFFA"/><stop offset="100%" stop-color="#6BD3C6"/></radialGradient>
  </defs></svg>`;
}

/* hotspots — golf-posture joints only (no health/medical metrics) */
const HOTSPOTS=[
  { id:'shoulder', joint:'shR', name:'Shoulder rotation',
    st:{address:'good',top:'alert',impact:'good',finish:'good'},
    m:{address:['Turn 10°','Coiling on plane'], top:['Turn 104°','+14° past your top'],
       impact:['Turn 42°','Square to target'], finish:['Full','Released through']},
    coach:{top:'Stop the backswing a touch shorter — the shoulder is over-rotating at the top.',
           _:'Shoulder line is tracking well through this phase.'} },
  { id:'spine', joint:'spine', name:'Spine angle',
    st:{address:'good',top:'good',impact:'alert',finish:'good'},
    m:{address:['34°','Set at address'], top:['33°','Held from address'],
       impact:['37°','Collapsed 5° — standing up'], finish:['—','Tall & balanced']},
    coach:{impact:'Keep your chest over the ball — hold the spine angle you set at address through impact.',
           _:'Spine angle is holding steady.'} },
  { id:'wrist', joint:'hand', name:'Wrist release',
    st:{address:'good',top:'good',impact:'alert',finish:'good'},
    m:{address:['Neutral','Set at address'], top:['Hinged','Fully loaded'],
       impact:['Late 0.05s','Releasing behind the ball'], finish:['Unhinged','Complete']},
    coach:{impact:'Start the release a hair earlier so the face squares at the ball, not after it.',
           _:'Release timing looks on schedule.'} },
  { id:'pelvis', joint:'hip', name:'Weight transfer',
    st:{address:'good',top:'good',impact:'good',finish:'good'},
    m:{address:['50%','Centered'], top:['62% trail','Loaded into the trail side'],
       impact:['78% lead','+6% vs last — driving forward'], finish:['92% lead','Fully through']},
    coach:{_:'Weight transfer onto the lead side is improving — keep it up.'} },
];
const hsPoint=(pose,id)=> id==='shoulder'?pose.shR : id==='wrist'?pose.hand
  : id==='pelvis'?pose.hip : spineMid(pose);

/* The avatar/detail engine reads its joints from the "active record", so the
   same view serves today's report AND any past day opened from the calendar. */
let curRecord=null;
const HS = () => (curRecord && curRecord.hotspots) || HOTSPOTS;

function markerLayer(pose,phase){
  const alerts=[];
  const marks=HS().map(h=>{
    const st=h.st[phase], p=hsPoint(pose,h.id);
    if(st==='alert') alerts.push({h,p});
    return `<g class="mk mk-${st}" data-act="hs:${h.id}" tabindex="0" role="button" aria-label="${h.name} detail">
      <circle class="mk-hit" cx="${p[0]}" cy="${p[1]}" r="14"/>
      <circle class="mk-ring" cx="${p[0]}" cy="${p[1]}" r="8"/>
      <circle class="mk-ring mk-ring2" cx="${p[0]}" cy="${p[1]}" r="8"/>
      <circle class="mk-dot" cx="${p[0]}" cy="${p[1]}" r="3.8"/></g>`;
  }).join('');
  const cards=alerts.slice(0,2).map((a,i)=>{
    const left=i===0, [jx,jy]=a.p, cw=72, ch=25;
    const cx=left?3:200-3-cw, cyr=jy-ch/2, cy=Math.max(5,Math.min(300-ch-5,cyr));
    const ax=left?cx+cw:cx, ay=cy+ch/2, m=a.h.m[phase];
    return `<line class="lead" x1="${jx}" y1="${jy}" x2="${ax}" y2="${ay}" pathLength="1"/>
      <g class="callout" data-act="hs:${a.h.id}" tabindex="0" role="button" aria-label="${a.h.name}">
        <rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="7"/>
        <text class="co-t" x="${cx+8}" y="${cy+10}">${a.h.name}</text>
        <text class="co-v" x="${cx+8}" y="${cy+20}">${m[0]}</text></g>`;
  }).join('');
  return cards+marks;
}
function avatarSVG(phase){
  const pose=POSES[phase];
  return `<svg class="glowfig" viewBox="0 0 200 300">${glowFigure(pose)}${state.replaying?'':markerLayer(pose,phase)}</svg>`;
}
function setPose(svg, pose){
  svg.querySelectorAll('line[data-from]').forEach(l=>{
    const a=pose[l.dataset.from], b=pose[l.dataset.to];
    l.setAttribute('x1',a[0]); l.setAttribute('y1',a[1]);
    l.setAttribute('x2',b[0]); l.setAttribute('y2',b[1]);
  });
  const c=svg.querySelector('[data-club]');
  c.setAttribute('x1',pose.hand[0]); c.setAttribute('y1',pose.hand[1]);
  c.setAttribute('x2',pose.club[0]); c.setAttribute('y2',pose.club[1]);
  const h=svg.querySelector('[data-head]');
  h.setAttribute('cx',pose.head[0]); h.setAttribute('cy',pose.head[1]);
  svg.querySelectorAll('[data-j]').forEach(o=>{
    const p=pose[o.dataset.j]; o.setAttribute('cx',p[0]); o.setAttribute('cy',p[1]);
  });
}
const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t];
const lerpPose=(A,B,t)=>{const o={};for(const k in A)o[k]=lerp(A[k],B[k],t);return o;};
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;

let animId=null;
function stopAnim(){ if(animId){cancelAnimationFrame(animId);animId=null;} }
function playSwing(svg){
  if(RM){ setPose(svg,POSES.impact); return; }
  const seq=[POSES.address,POSES.top,POSES.impact,POSES.finish,POSES.address];
  const dur=950; let seg=0, start=null;
  const frame=ts=>{
    if(!svg.isConnected){animId=null;return;}
    if(start==null) start=ts;
    let t=(ts-start)/dur;
    if(t>=1){ seg=(seg+1)%(seq.length-1); start=ts; t=0; }
    setPose(svg, lerpPose(seq[seg], seq[seg+1], ease(t)));
    animId=requestAnimationFrame(frame);
  };
  animId=requestAnimationFrame(frame);
}

/* --------------------------------------------------------- charts (svg) -- */
function lineChart(cfg){
  const W=320,H=150,pL=6,pR=6,pT=14,pB=22;
  const vs=cfg.values, n=vs.length;
  const all=vs.concat([cfg.baseline]);
  let lo=Math.min(...all), hi=Math.max(...all);
  const pad=(hi-lo)*.25||1; lo-=pad; hi+=pad;
  const X=i=>pL+(W-pL-pR)*(i/(n-1));
  const Y=v=>pT+(H-pT-pB)*(1-(v-lo)/(hi-lo));
  const pts=vs.map((v,i)=>[X(i),Y(v)]);
  const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area=line+` L ${X(n-1).toFixed(1)} ${H-pB} L ${pL} ${H-pB} Z`;
  const by=Y(cfg.baseline);
  const dots=pts.map((p,i)=>{
    const last=i===n-1;
    return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${last?4.5:2.6}" fill="${last?'#87D8CE':'#0B0C08'}" stroke="#87D8CE" stroke-width="1.8"/>`
      + (last?`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="9" fill="none" stroke="#87D8CE" stroke-opacity=".3" stroke-width="1.5"/>`:'');
  }).join('');
  const labels=cfg.labels.map((l,i)=>`<text x="${X(i).toFixed(1)}" y="${H-6}" fill="#5E6156" font-size="9" font-weight="600" text-anchor="middle">${l}</text>`).join('');
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}">
    <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#87D8CE" stop-opacity=".22"/>
      <stop offset="1" stop-color="#87D8CE" stop-opacity="0"/></linearGradient></defs>
    <line x1="${pL}" y1="${by.toFixed(1)}" x2="${W-pR}" y2="${by.toFixed(1)}" stroke="#5E6156" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="${W-pR}" y="${(by-6).toFixed(1)}" fill="#8E927E" font-size="9" font-weight="700" text-anchor="end">BASELINE ${cfg.baseline}</text>
    <path d="${area}" fill="url(#ag)"/>
    <path d="${line}" fill="none" stroke="#87D8CE" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}${labels}
  </svg></div>`;
}
function sparkline(vs){
  const W=100,H=28,p=3;
  const lo=Math.min(...vs),hi=Math.max(...vs),r=hi-lo||1;
  const X=i=>p+(W-2*p)*(i/(vs.length-1));
  const Y=v=>p+(H-2*p)*(1-(v-lo)/r);
  const d=vs.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)).join(' ');
  const lx=X(vs.length-1).toFixed(1), ly=Y(vs[vs.length-1]).toFixed(1);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lx}" cy="${ly}" r="2.4" fill="currentColor"/></svg>`;
}
function ring(pct,size=118,sw=11){
  const r=(size-sw)/2, c=2*Math.PI*r, off=c*(1-pct/100);
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="${sw}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#87D8CE" stroke-width="${sw}"
      stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg>`;
}
const deltaHTML=(dir,txt)=>{
  const ic = dir==='up' ? '<path d="M12 19V5M6 11l6-6 6 6"/>'
           : dir==='down' ? '<path d="M12 5v14M6 13l6 6 6-6"/>'
           : '<path d="M5 12h14"/>';
  return `<span class="delta ${dir}">${svgIco(ic,'stroke="currentColor" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"')}${txt}</span>`;
};

/* ================================================================ HOME === */
function renderHome(){
  const d=DATA, u=d.user;
  const fresh = !state.hasBaseline;               // onboarded but no first session yet
  const rd = u.roundInDays;                        // may be null (no round scheduled)
  const focus = !fresh && rd!=null && rd<=3;
  const adjusted = !fresh && (state.mood===2 || state.areas.size>0);
  const streak = fresh?0:u.streak;
  const week = fresh?0:u.weekSessions;

  const conditionCard = `
    <div class="card cond-card">
      <div class="row between"><span class="eyebrow">Condition check</span>
        <span class="small dim">Tunes today’s load</span></div>
      <div class="mood-row mt-12">
        ${[0,1,2].map(i=>`<button class="mood" data-act="mood:${i}" aria-pressed="${state.mood===i}">
            ${svgIco(FACE[i])}<span class="lab">${MOOD_LAB[i]}</span></button>`).join('')}
      </div>
      <div class="small dim mt-16" style="margin-bottom:9px">Anything bothering you?</div>
      <div class="chips">
        ${['Wrist','Elbow','Lower back','Shoulder','None'].map(a=>`
          <button class="chip" data-act="area:${a}" aria-pressed="${state.areas.has(a)}">${a}</button>`).join('')}
      </div>
    </div>`;

  // Fresh users get the single lime card as the BASELINE banner (the key item),
  // so the first-session mission is a quieter dark card.
  const missionCard = fresh ? `
    <div class="card card-xl">
      <div class="row between">
        <span class="eyebrow">Tonight</span>
        <span class="pill pill-lime"><span class="dot"></span>${d.mission.mode}</span>
      </div>
      <div class="h1" style="margin-top:14px">Your first session</div>
      <p class="body dim" style="margin-top:8px">Swing naturally so CALIBR can read your starting posture. No targets tonight — just move the way you normally do.</p>
      <div class="row gap-8 mt-16 wrap">
        <span class="pill">${svgIco(I.clock,'stroke="var(--ink)" fill="none" stroke-width="1.9" style="width:14px;height:14px"')}~12 min</span>
        <span class="pill">Easy · full swings</span>
      </div>
    </div>` : `
    <div class="card-lime card-xl mission-hero">
      <div class="row between">
        <span class="eyebrow">Today’s mission</span>
        <span class="pill pill-dark"><span class="dot"></span>${d.mission.mode}</span>
      </div>
      <div class="h1" style="margin-top:14px">${d.mission.title}</div>
      <p class="body" style="color:rgba(12,13,9,.72);margin-top:8px">${d.mission.focus}</p>
      <div class="row gap-8 mt-16 wrap">
        <span class="pill pill-dark">${svgIco(I.clock,'stroke="#fff" fill="none" stroke-width="1.9" style="width:14px;height:14px"')}${d.mission.min} min</span>
        <span class="pill pill-dark">${d.mission.reps}</span>
      </div>
      <div id="missionAdjust">${adjusted?adjustNoteHTML():''}</div>
    </div>`;

  const baselineBanner = `
    <div class="card-lime card-xl" style="margin-bottom:12px">
      <div class="row gap-12">
        ${svgIco(I.target,'stroke="var(--lime)" fill="none" stroke-width="1.9" style="width:24px;height:24px;flex:0 0 auto"')}
        <div class="grow"><div class="eyebrow">Baseline not set yet</div>
          <div class="h2" style="margin-top:3px">Tonight becomes your Day 0</div></div>
      </div>
      <p class="small" style="color:rgba(12,13,9,.76);margin-top:12px;font-weight:600">
        Your first real session is saved automatically as your starting posture — every session after is measured against it.</p>
    </div>`;

  return `
    <div class="head">
      <div class="head-titles">
        <div class="small dim">${greeting()}, ${u.name}</div>
        <div class="h2" style="margin-top:2px">Ready for tonight?</div>
      </div>
      <div class="icon-cluster">
        <button class="icon-btn" data-act="toast:No new alerts" aria-label="Notifications">${svgIco(I.bell)}</button>
        <button class="icon-btn" data-act="nav:profile" aria-label="Profile"><span class="avatar-badge" style="width:40px;height:40px">${u.initial}</span></button>
      </div>
    </div>

    ${rd!=null?`<button class="dday-bar" data-act="nav:missions" aria-label="Next round in ${rd} days — open Missions">
      ${svgIco(I.flag,'stroke="var(--lime)" fill="none" stroke-width="1.9" style="width:18px;height:18px;flex:0 0 auto"')}
      <span class="grow small" style="font-weight:600">Next round · ${u.roundName}</span>
      <span class="pill pill-lime">D-${rd}</span>
      <span class="chev">${svgIco(I.chev)}</span>
    </button>`:''}

    ${fresh?baselineBanner:''}

    <div class="bento" style="margin-top:12px">
      <div class="card v-between">
        <span class="eyebrow">Streak</span>
        <div><span class="big">${streak}</span><span class="unit"> days</span></div>
      </div>
      <div class="card v-between week-card">
        <span class="eyebrow">This week</span>
        <div><span class="big">${week}</span><span class="unit"> / 5</span>
          <div class="meter mt-10"><i style="width:${week/5*100}%"></i></div></div>
      </div>
    </div>

    <div style="margin-top:12px">${conditionCard}</div>
    <div style="margin-top:12px">${missionCard}</div>

    ${fresh?'':`
    <div class="card card-tight" style="margin-top:12px">
      <span class="eyebrow">Correction of the day</span>
      <div class="body" style="margin-top:8px;font-weight:600">${d.correction}</div>
    </div>`}

    <button class="btn btn-primary" data-act="start" style="margin-top:20px">
      ${svgIco(I.play,'fill="var(--lime-ink)" stroke="none" style="width:18px;height:18px"')} ${fresh?'Start your first session':'Start tonight’s session'}</button>
    <div class="small dim center" style="margin-top:12px;padding:0 20px">You won’t need the app while you train. CALIBR guides you by voice — come back after.</div>
  `;
}

/* ============================================================== REPORT === */
const phasePose = k => ({Address:POSES.address, Top:POSES.top, Impact:POSES.impact, Finish:POSES.finish}[k]);
const sUp   = v => [v-8,v-6,v-4,v-2,v];
const sDown = v => [v+7,v+6,v+5,v+3,v];

/* today's record (from DATA.report) and per-day past records share one shape */
function todayRecord(){
  const r=DATA.report;
  return { label:r.date, hotspots:HOTSPOTS, finding:r.finding, phases:r.phases,
    metrics:r.metrics, success:r.success, streak:r.streak, improved:r.improved, total:r.total,
    note:'Felt steadier at impact than last time.' };
}
/* Deterministic sample for a past calendar day — earlier days sit closer to the
   baseline, later days show the improvement story. Golf-posture metrics only. */
function makeRecord(day){
  const done=DATA.growth.done, idx=Math.max(0,done.indexOf(day)), n=done.length;
  const prog = n>1 ? idx/(n-1) : 1;                 // 0 earliest .. 1 latest
  const b = prog<.34?0 : prog<.7?1 : 2;             // rough / improving / sharp
  const head=Math.round(78+prog*15), weight=Math.round(63+prog*18), tempo=2.7+prog*0.35;
  const spineAng=Math.round(41-prog*6), drop=spineAng-34, shTop=Math.round(96+(b<2?12:2));
  const st={
    shoulder:{address:'good',top:b<2?'alert':'good',impact:'good',finish:'good'},
    spine:{address:'good',top:'good',impact:b===0?'alert':'good',finish:'good'},
    wrist:{address:'good',top:'good',impact:b===0?'alert':'good',finish:'good'},
    pelvis:{address:'good',top:'good',impact:'good',finish:'good'},
  };
  const hs=HOTSPOTS.map(h=>{
    const o={...h, st:st[h.id], m:{...h.m}};
    if(h.id==='spine')    o.m={...h.m, impact:[`${spineAng}°`, drop>1?`Collapsed ${drop}° — standing up`:'Held your angle through']};
    if(h.id==='shoulder') o.m={...h.m, top:[`Turn ${shTop}°`, b<2?`+${shTop-92}° past your top`:'On plane']};
    if(h.id==='wrist')    o.m={...h.m, impact: st.wrist.impact==='alert'?['Late 0.05s','Releasing behind the ball']:['On time','Squares at the ball']};
    if(h.id==='pelvis')   o.m={...h.m, impact:[`${weight}% lead`,'Driving onto the lead side']};
    return o;
  });
  const wristAlert = st.wrist.impact==='alert';
  const metrics=[
    {k:'Tempo', v:tempo.toFixed(1), sub:':1 back·down', dir:'up', d:'+'+(0.1*(1+idx%2)).toFixed(1), spark:[2.6,2.7,2.7,+(tempo-.1).toFixed(1),+tempo.toFixed(1)]},
    {k:'Head Steadiness', v:''+head, sub:'%', dir:'up', d:'+'+(2+b), spark:sUp(head)},
    {k:'Weight Transfer', v:''+weight, sub:'% to lead', dir:'up', d:'+'+(3+b), spark:sUp(weight)},
    wristAlert
      ? {k:'Wrist Release', v:'Late', sub:'timing', dir:'down', d:'−3', spark:sDown(84), warn:true}
      : {k:'Wrist Release', v:'On time', sub:'timing', dir:'up', d:'+2', spark:sUp(86)},
  ];
  const phases=['Address','Top','Impact','Finish'].map(k=>({k, warn: hs.some(h=>h.st[k.toLowerCase()]==='alert')}));
  const finding = b===0
    ? 'Early session — the top over-rotated and you lost spine angle at impact. A clear place to build from.'
    : b===1 ? 'Cleaner through impact today. The one thing left is trimming the over-rotation at the top.'
    : 'Sharp from address to finish — posture held all the way through the strike.';
  return { label:`Jul ${day}, 2026`, hotspots:hs, finding, phases, metrics,
    success: Math.round(66+prog*24+(day%3)*2), streak: idx+1,
    improved: metrics.filter(m=>m.dir==='up').length, total:4,
    note: b===2?'Best it’s felt in weeks.':b===1?'Getting more repeatable.':'Rough, but a start.' };
}

/* the interactive avatar + finding + phases + metrics — reused by the report
   screen AND the calendar's past-day modal (data comes from `rec`) */
function reportContent(rec, opts={}){
  const bl=!!opts.bl, flagged=rec.phases.filter(p=>p.warn).length;
  return `
    ${avatarDefs()}
    <div class="avatar-stage" style="margin-top:6px;padding:8px 8px 6px">
      <div class="avatar-grid"></div>
      <span class="pill pill-lime phase-tag"><span class="dot"></span>Joint map · tap a point</span>
      <button class="pill play-pill" data-act="replay">Replay swing</button>
      <div id="avatarWrap" class="avatarWrap">${avatarSVG(state.reportPhase)}</div>
    </div>
    <div class="seg" id="phaseSwitch" style="margin-top:10px">
      ${['address','top','impact','finish'].map(p=>`
        <button data-act="rphase:${p}" aria-selected="${state.reportPhase===p}">${cap(p)}</button>`).join('')}
    </div>
    <div class="small dim center pseg-cap">Joint recognition · 32 points tracked · red = needs work</div>

    <div class="card card-tight" style="margin-top:14px;border-color:rgba(135,216,206,.22)">
      <span class="eyebrow">${bl?'Where you’re starting':'Key finding'}</span>
      <div class="body" style="margin-top:7px;font-weight:600">${bl
        ? 'Here’s your Day-0 read. Nothing to compare against yet — from tonight on, CALIBR tracks every change against these numbers.'
        : rec.finding}</div>
    </div>

    <div class="sec-title"><span class="h3">Posture by phase</span>
      <span class="small dim">${flagged?`${flagged} flagged`:'all clear'}</span></div>
    <div class="frames">
      ${rec.phases.map(p=>`
        <div class="frame ${p.warn?'warn':''}">
          ${p.warn?'<span class="flag">!</span>':''}
          <div class="mini">${buildSkeleton(phasePose(p.k), p.warn?'warn':'')}</div>
          <div class="fl">${p.k}</div>
        </div>`).join('')}
    </div>

    <div class="sec-title"><span class="h3">Swing metrics</span>
      <span class="small ${bl?'dim':'lime'}">${bl?'Your Day-0 numbers':`${rec.improved} of ${rec.total} improved`}</span></div>
    <div class="bento">
      ${rec.metrics.map(m=>`
        <div class="card metric" style="${m.warn?'border-color:rgba(255,107,91,.4)':''}">
          <div class="ml">${m.k}</div>
          <div class="mv" style="${m.warn?'color:var(--alert)':''}">${m.v}<small> ${m.sub}</small></div>
          ${bl?'<span class="delta flat" style="margin-top:7px">baseline</span>':deltaHTML(m.dir, m.d+' vs last')}
          ${bl?'':`<div style="color:${m.warn?'var(--alert)':'var(--lime)'}">${sparkline(m.spark)}</div>`}
        </div>`).join('')}
    </div>

    ${bl?`
    <div class="bento" style="margin-top:12px">
      <div class="card v-between" style="min-height:132px">
        <span class="eyebrow">Baseline</span>
        <div><span class="big lime">Day 0</span>
          <div class="small dim" style="margin-top:6px">Saved ${DATA.user.baselineDate}</div></div>
      </div>
      <div class="card v-between" style="min-height:132px">
        <span class="eyebrow">Streak</span>
        <div><span class="big">1</span><span class="unit"> day</span>
          <div class="small dim" style="margin-top:6px">It starts tonight — keep it going</div></div>
      </div>
    </div>`:`
    <div class="bento" style="margin-top:12px">
      <div class="card-lime card v-between" style="min-height:150px">
        <span class="eyebrow">Mission success</span>
        <div><span class="mega" style="font-size:56px">${rec.success}</span><span class="unit" style="font-size:22px;font-weight:800;color:rgba(12,13,9,.6)">%</span>
          <div class="small" style="color:rgba(12,13,9,.7);margin-top:6px;font-weight:600">Impact Stability · hit target</div></div>
      </div>
      <div class="card v-between" style="min-height:150px">
        <span class="eyebrow">Streak</span>
        <div class="row" style="align-items:center;gap:14px">
          <div style="position:relative;width:96px;height:96px">
            ${ring(rec.streak/7*100,96,10)}
            <div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center">
              <div><div class="med">${rec.streak}</div><div class="small dim" style="font-size:10px">days</div></div></div>
          </div>
        </div>
        <div class="small dim">Keep the run going</div>
      </div>
    </div>`}`;
}

/* Putting session → game-result report (no posture avatar, no spine/weight metrics) */
function renderPuttReport(){
  const p=DATA.puttReport, bl=state.baselineJustSet, rate=Math.round(p.made/p.attempts*100);
  return `
    <div class="head">
      <button class="icon-btn" data-act="nav:home" aria-label="Back">${svgIco(I.back)}</button>
      <div class="head-titles center" style="flex:1">
        <div class="eyebrow">Putting · game result</div>
        <div class="h3" style="margin-top:2px">${bl?'Tonight · first session':p.date}</div>
      </div>
      <button class="icon-btn" data-act="toast:Report saved to your records" aria-label="Share">${svgIco(I.share)}</button>
    </div>

    ${bl?`<div class="card-lime card-xl" style="margin-top:6px;margin-bottom:2px">
      <div class="row gap-12">
        ${svgIco(I.check,'stroke="var(--lime)" fill="none" stroke-width="2.6" style="width:22px;height:22px;flex:0 0 auto"')}
        <div class="grow"><div class="eyebrow">Baseline saved</div>
          <div class="h2" style="margin-top:3px">This is your Day 0</div></div>
      </div>
      <p class="small" style="margin-top:12px;font-weight:600">Tonight’s putting is your starting point — every session after compares to it.</p>
    </div>`:''}

    <div class="card-lime card-xl" style="margin-top:6px;text-align:center;padding:26px 22px">
      <span class="eyebrow">Mission success</span>
      <div style="margin-top:8px"><span class="mega" style="font-size:72px">${p.made}</span><span class="unit" style="font-size:30px;font-weight:800">/${p.attempts}</span></div>
      <div class="small dim" style="margin-top:4px">putts made · ${rate}%${bl?'':` · up from ${p.lastMade}/${p.attempts} last time`}</div>
      <div class="meter" style="margin:16px auto 0;max-width:220px"><i style="width:${rate}%"></i></div>
    </div>

    <div class="card card-tight" style="margin-top:12px;border-color:rgba(135,216,206,.28)">
      <span class="eyebrow">Key finding</span>
      <div class="body" style="margin-top:7px;font-weight:600">${bl?'Your Day-0 putting read. From here, every session compares to these numbers.':p.finding}</div>
    </div>

    <div class="sec-title"><span class="h3">Putting result</span>
      <span class="small ${bl?'dim':'lime'}">${bl?'Your Day-0 numbers':'vs last session'}</span></div>
    <div class="bento">
      <div class="card metric">
        <div class="ml">Distance accuracy</div>
        <div class="mv">${p.avgError}<small> cm avg miss</small></div>
        ${bl?'<span class="delta flat" style="margin-top:7px">baseline</span>':deltaHTML('up', `${p.avgErrorGain}cm tighter`)}
        <div style="color:var(--lime)">${sparkline(p.accSpark)}</div>
      </div>
      <div class="card metric">
        <div class="ml">Tempo consistency</div>
        <div class="mv">${p.tempo}<small> %</small></div>
        ${bl?'<span class="delta flat" style="margin-top:7px">baseline</span>':deltaHTML('up', `+${p.tempoDelta} vs last`)}
        <div style="color:var(--lime)">${sparkline(p.tempoSpark)}</div>
      </div>
    </div>

    <div class="bento" style="margin-top:12px">
      <div class="card v-between" style="min-height:150px">
        <span class="eyebrow">Streak</span>
        <div class="row" style="align-items:center;gap:14px">
          <div style="position:relative;width:96px;height:96px">
            ${ring((bl?1:p.streak)/7*100,96,10)}
            <div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center">
              <div><div class="med">${bl?1:p.streak}</div><div class="small dim" style="font-size:10px">days</div></div></div>
          </div>
        </div>
        <div class="small dim">${bl?'It starts tonight':'Keep the run going'}</div>
      </div>
      <div class="card v-between" style="min-height:150px">
        <span class="eyebrow">${bl?'Baseline':'Change vs last'}</span>
        ${bl?`<div><span class="big lime">Saved</span><div class="small dim" style="margin-top:6px">Starting point · ${DATA.user.baselineDate}</div></div>`
           :`<div class="stack" style="width:100%">
              <div class="row between"><span class="small dim">Putts made</span><span class="small lime" style="font-weight:700">+${p.made-p.lastMade}</span></div>
              <div class="row between"><span class="small dim">Avg miss</span><span class="small lime" style="font-weight:700">−${p.avgErrorGain} cm</span></div>
              <div class="row between"><span class="small dim">Tempo</span><span class="small lime" style="font-weight:700">+${p.tempoDelta}%</span></div>
            </div>`}
      </div>
    </div>

    <div class="card" style="margin-top:12px">
      <span class="eyebrow">One-line reflection</span>
      <textarea class="input" id="reflect" rows="2" style="margin-top:12px" placeholder="How did tonight feel? (optional)"></textarea>
      <button class="btn btn-primary" data-act="save-reflect" style="margin-top:14px;height:50px;font-size:15px">
        ${svgIco(I.check,'stroke="var(--lime-ink)" fill="none" stroke-width="2.4" style="width:18px;height:18px"')} Save &amp; finish</button>
    </div>
  `;
}

function renderReport(){
  if(state.sessionType==='putt') return renderPuttReport();
  curRecord = todayRecord();                        // active data for the avatar
  const bl=state.baselineJustSet, rec=curRecord;
  return `
    <div class="head">
      <button class="icon-btn" data-act="nav:home" aria-label="Back">${svgIco(I.back)}</button>
      <div class="head-titles center" style="flex:1">
        <div class="eyebrow">Session report</div>
        <div class="h3" style="margin-top:2px">${bl?'Tonight · first session':rec.label}</div>
      </div>
      <button class="icon-btn" data-act="toast:Report saved to your records" aria-label="Share">${svgIco(I.share)}</button>
    </div>

    ${bl?`<div class="card-lime card-xl" style="margin-top:6px;margin-bottom:2px">
      <div class="row gap-12">
        ${svgIco(I.check,'stroke="var(--lime)" fill="none" stroke-width="2.6" style="width:22px;height:22px;flex:0 0 auto"')}
        <div class="grow"><div class="eyebrow">Baseline saved</div>
          <div class="h2" style="margin-top:3px">This is your Day 0</div></div>
      </div>
      <p class="small" style="color:rgba(12,13,9,.76);margin-top:12px;font-weight:600">
        Tonight’s posture is now your starting point. From here, every session shows how far you’ve moved from these numbers.</p>
    </div>`:''}

    ${reportContent(rec,{bl})}

    <div class="card" style="margin-top:12px">
      <span class="eyebrow">One-line reflection</span>
      <textarea class="input" id="reflect" rows="2" style="margin-top:12px"
        placeholder="How did tonight feel? (optional)"></textarea>
      <button class="btn btn-primary" data-act="save-reflect" style="margin-top:14px;height:50px;font-size:15px">
        ${svgIco(I.check,'stroke="var(--lime-ink)" fill="none" stroke-width="2.4" style="width:18px;height:18px"')} Save &amp; finish</button>
    </div>
  `;
}

/* ---- Past-day record modal (opened from the calendar) -------------------- */
function openDayRecord(day, originEl){
  const rec=makeRecord(day);
  curRecord=rec; state.reportPhase='impact';
  let o=$('#record');
  if(!o){ o=document.createElement('div'); o.id='record'; o.className='record-overlay';
    $('#phone').appendChild(o);                          // mount inside the phone frame
    o.addEventListener('click',e=>{ if(e.target===o || e.target.classList.contains('record-back')) closeDayRecord(); });
  }
  o.innerHTML=`<div class="record-back"></div>
    <div class="record-card">
      <div class="record-head">
        <div><div class="eyebrow">Past session</div><div class="h3" style="margin-top:2px">${rec.label}</div></div>
        <button class="icon-btn sm" data-act="record-close" aria-label="Close">${svgIco(I.x)}</button>
      </div>
      <div class="record-scroll">
        ${reportContent(rec,{})}
        <div class="card card-tight" style="margin-top:12px">
          <span class="eyebrow">Your note that day</span>
          <div class="body" style="margin-top:7px;font-weight:600">${rec.note}</div>
        </div>
      </div>
    </div>`;
  o.classList.add('show');
  growFrom(o.querySelector('.record-card'), originEl);   // grow out of the tapped day
  setTimeout(()=>o.classList.add('in'),20);              // reveal (fires even when rAF is throttled)
}
function closeDayRecord(){
  const o=$('#record'); if(!o || !o.classList.contains('show')) return;
  closeDetail();
  o.classList.remove('in');
  const done=()=>{ o.classList.remove('show'); o.innerHTML=''; curRecord=null; };
  const card=o.querySelector('.record-card');
  if(card) card.addEventListener('transitionend',done,{once:true});
  setTimeout(done,380);
}
function hardCloseRecord(){ const o=$('#record'); if(o){ o.className='record-overlay'; o.innerHTML=''; } }

/* ============================================================== GROWTH === */
function renderGrowth(){
  const g=DATA.growth;
  const tabBody =
    state.growthTab==='calendar' ? calendarView(g)
    : state.growthTab==='metrics' ? metricsView(g)
    : beforeAfterView(g);

  return `
    <div class="head">
      <div class="head-titles"><div class="eyebrow">Your progress</div>
        <div class="h1" style="margin-top:3px">Growth</div></div>
      <button class="icon-btn" data-act="toast:Filter — coming soon" aria-label="Filter">${svgIco(I.cal)}</button>
    </div>

    <div class="bento" style="margin-top:6px">
      <div class="card-lime card v-between col-2" style="min-height:0;padding:20px 22px">
        <div class="row between">
          <span class="eyebrow">This week</span>
          <span class="pill pill-dark">${g.weekSessions}/${g.weekGoal} sessions</span>
        </div>
        <div class="row between" style="align-items:flex-end;margin-top:16px">
          <div><span class="mega" style="font-size:58px;color:var(--lime)!important">${g.weekMin}</span><span class="unit" style="font-weight:800"> min trained</span></div>
          <div class="small" style="color:rgba(12,13,9,.72);text-align:right;font-weight:650">Since baseline<br>${DATA.user.baselineDate}</div>
        </div>
        <div class="meter" style="margin-top:16px"><i style="width:${g.weekSessions/g.weekGoal*100}%"></i></div>
      </div>
    </div>

    <div class="seg" style="margin-top:16px">
      ${[['calendar','Calendar'],['metrics','Metrics'],['ba','Before / After']].map(([k,l])=>`
        <button data-act="gtab:${k}" aria-selected="${state.growthTab===k}">${l}</button>`).join('')}
    </div>

    <div style="margin-top:16px">${tabBody}</div>
  `;
}
function calendarView(g){
  const dows=['S','M','T','W','T','F','S'];
  let cells='';
  for(let i=0;i<g.firstDow;i++) cells+='<div class="cal-d pad"></div>';
  for(let day=1;day<=g.days;day++){
    const done=g.done.includes(day), today=day===g.today;
    const tap=done?`data-act="day:${day}" role="button" tabindex="0" aria-label="Open ${g.monthName.split(' ')[0]} ${day} session"`:'';
    cells+=`<div class="cal-d ${done?'done':''} ${today?'today':''}" ${tap}>${day}</div>`;
  }
  return `
    <div class="card card-xl">
      <div class="row between">
        <span class="h3">${g.monthName}</span>
        <span class="small dim">${g.done.length} days trained</span>
      </div>
      <div class="cal-grid">${dows.map(d=>`<div class="cal-h">${d}</div>`).join('')}${cells}</div>
      <div class="row gap-12" style="margin-top:16px">
        <span class="row gap-8 small dim"><span class="dot"></span>Trained · tap to open</span>
        <span class="row gap-8 small dim"><span class="dot"></span>Today</span>
      </div>
    </div>`;
}
function metricsView(g){
  const t=g.trend, now=t.values[t.values.length-1], gain=now-t.baseline;
  return `
    <div class="card card-xl">
      <div class="row between" style="align-items:flex-start">
        <div><span class="eyebrow">Metric trend</span>
          <div class="h3" style="margin-top:4px">${t.name}</div></div>
        <div class="center"><div class="med lime">+${gain}</div><div class="small dim">since baseline</div></div>
      </div>
      <div style="margin-top:18px">${lineChart(t)}</div>
      <div class="legend">
        <span><i style="background:#87D8CE"></i>Your trend</span>
        <span><i style="background:#5E6156"></i>Baseline (${t.baseline})</span>
      </div>
    </div>
    <div class="bento" style="margin-top:12px">
      ${[['Head Steadiness','92','+18'],['Weight Transfer','78','+14'],['Tempo','3.0:1','+0.4'],['Wrist Release','On time','fixed']].map(([k,v,d])=>`
        <div class="card metric">
          <div class="ml">${k}</div>
          <div class="mv" style="font-size:23px">${v}</div>
          ${deltaHTML('up', d==='fixed'?'stabilized':d+' vs base')}
        </div>`).join('')}
    </div>`;
}
function beforeAfterView(g){
  return `
    <div class="card card-xl">
      <div class="row between">
        <span class="pill pill-ghost" style="border:1px solid var(--stroke)">Baseline · ${DATA.user.baselineDate}</span>
        <span class="pill pill-lime">Now</span>
      </div>
      <div class="row" style="gap:10px;margin-top:14px;align-items:stretch">
        <div class="grow" style="background:#0A0B07;border-radius:16px;border:1px solid var(--stroke)">${buildSkeleton(POSES.impact,'ghost')}</div>
        <div class="grow" style="background:radial-gradient(90% 70% at 50% 0,rgba(135,216,206,.12),transparent 60%),#0A0B07;border-radius:16px;border:1px solid var(--stroke)">${buildSkeleton(betterImpact())}</div>
      </div>
      <div class="row between" style="margin-top:10px">
        <span class="small dim" style="width:50%;text-align:center">Then</span>
        <span class="small lime" style="width:50%;text-align:center;font-weight:700">Tonight</span>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <span class="eyebrow">What moved</span>
      <div style="margin-top:6px">
        ${g.ba.map(s=>`
          <div class="row between" style="padding:13px 0;border-top:1px solid var(--stroke)">
            <div><div class="h3" style="font-size:14px;font-weight:600">${s.k}</div>
              <div class="small dim" style="margin-top:3px">${s.b} → <span class="lime" style="font-weight:700">${s.a}</span></div></div>
            <span class="pill pill-lime">${s.d}</span>
          </div>`).join('')}
      </div>
    </div>`;
}
const betterImpact=()=>({...POSES.impact, head:[100,54], hipR:[116,171], knR:[120,224]});

/* ============================================================ MISSIONS === */
function renderMissions(){
  const u=DATA.user, rd=u.roundInDays, cat=state.missionCat, list=DATA.missions;
  const done=list.filter(m=>m.done).length;

  const missionCard=m=>`
    <button class="card mission-card ${m.done?'is-done':''}" data-act="mission:${m.id}">
      <div class="row between" style="align-items:flex-start;gap:12px">
        <div class="grow">
          <div class="h3" style="font-weight:700">${m.goal}</div>
          <div class="row gap-6 mt-10 wrap">
            <span class="pill pill-lime"><span class="dot"></span>${m.mode}</span>
            <span class="pill">${svgIco(I.clock,'stroke="var(--ink)" fill="none" stroke-width="1.9" style="width:13px;height:13px"')}${m.min} min</span>
            <span class="pill diff-${m.diff.toLowerCase()}">${m.diff}</span>
            ${m.rec?'<span class="pill pill-lime">Today’s pick</span>':''}
          </div>
        </div>
        <span class="mcheck ${m.done?'done':''}" aria-label="${m.done?'Completed':'Not done'}">
          ${m.done?svgIco(I.check,'stroke="var(--lime-ink)" fill="none" stroke-width="3" style="width:15px;height:15px"'):''}</span>
      </div>
    </button>`;

  const section=(title,arr)=> arr.length?`
    <div class="sec-title"><span class="h3">${title}</span><span class="small dim">${arr.length} missions</span></div>
    <div class="stack">${arr.map(missionCard).join('')}</div>`:'';

  let body;
  if(cat==='all')      body = section('Swing', list.filter(m=>m.cat==='swing')) + section('Putting', list.filter(m=>m.cat==='putt'));
  else if(cat==='rec') body = `<div class="small dim" style="margin:6px 2px 12px">Picked from your softest spots in recent sessions.</div>
                                <div class="stack">${list.filter(m=>m.rec).map(missionCard).join('')}</div>`;
  else                 body = `<div class="stack">${list.filter(m=>m.cat===cat).map(missionCard).join('')}</div>`;

  return `
    <div class="head">
      <div class="head-titles"><div class="eyebrow">Train with purpose</div>
        <div class="h1" style="margin-top:3px">Missions</div></div>
      <button class="icon-btn" data-act="toast:${done} of ${list.length} missions done" aria-label="Progress">${svgIco(I.check)}</button>
    </div>

    <div class="card card-xl rp-hero" style="margin-top:6px">
      <div class="row between">
        <span class="eyebrow">Round prep</span>
        <span class="pill pill-lime">${rd!=null?`D-${rd}`:'No round set'}</span>
      </div>
      <div class="h1" style="margin-top:12px">${rd!=null?`${rd} days to ${u.roundName}`:'Get round-ready'}</div>
      <p class="body" style="color:rgba(255,255,255,.8);margin-top:8px">Match-ready focus training — one set built from your softest spots this month.</p>
      <button class="btn btn-primary" data-act="roundprep" style="margin-top:18px">
        ${svgIco(I.play,'fill="var(--lime-ink)" stroke="none" style="width:18px;height:18px"')} Start round prep</button>
    </div>

    <div class="chips" style="margin-top:18px">
      ${[['all','All'],['swing','Swing'],['putt','Putting'],['rec','Recommended']].map(([k,l])=>`
        <button class="chip" data-act="mcat:${k}" aria-pressed="${cat===k}">${l}</button>`).join('')}
    </div>

    <div style="margin-top:4px">${body}</div>
  `;
}

/* ============================================================= PROFILE === */
function renderProfile(){
  const u=DATA.user;
  const settingRow=(ic,t,s,act='toast:Setting — demo')=>`
    <button class="lrow" data-act="${act}" style="width:100%;text-align:left">
      <span class="ico">${svgIco(ic)}</span>
      <span class="lm"><span class="lt" style="display:block">${t}</span><span class="ls">${s}</span></span>
      <span class="chev">${svgIco(I.chev)}</span></button>`;
  const toggleRow=(ic,t,s,on)=>`
    <div class="lrow"><span class="ico">${svgIco(ic)}</span>
      <span class="lm"><span class="lt" style="display:block">${t}</span><span class="ls">${s}</span></span>
      <button class="sw" data-act="sw" aria-checked="${on}" aria-label="${t}"></button></div>`;

  return `
    <div class="head">
      <div class="head-titles"><div class="eyebrow">Account</div>
        <div class="h1" style="margin-top:3px">Profile</div></div>
      <button class="icon-btn" data-act="toast:Edit profile — demo" aria-label="Edit">${svgIco(I.edit)}</button>
    </div>

    <div class="card card-xl" style="margin-top:6px">
      <div class="row gap-12">
        <span class="avatar-badge" style="width:56px;height:56px;font-size:22px">${u.initial}</span>
        <div class="grow"><div class="h2">${u.name}</div>
          <div class="small dim" style="margin-top:2px">Member since ${u.baselineDate}</div></div>
      </div>
      <div class="bento gap-sm" style="margin-top:16px">
        <div class="card card-tight center"><div class="med">${u.handicap}</div><div class="small dim mt-6">Handicap</div></div>
        <div class="card card-tight center"><div class="med" style="font-size:22px;line-height:1.3">${u.goal}</div><div class="small dim mt-6">Goal</div></div>
      </div>
      <div class="card card-tight" style="margin-top:10px">
        <div class="row between"><span class="row gap-8"><span class="dot"></span><span class="small" style="font-weight:600">Next round</span></span>
          <span class="small dim">${u.roundName} · D-${u.roundInDays}</span></div>
      </div>
    </div>

    <div class="sec-title"><span class="h3">Device</span></div>
    <div class="list">
      ${settingRow(I.camera,'Camera','Joint tracking · 60 fps')}
      ${settingRow(I.laser,'Laser guide','Alignment line · medium')}
      ${settingRow(I.voice,'Voice coach','Voice: Calm — Ari')}
      ${settingRow(I.target,'Home position','Recalibrate the standing spot','toast:Recalibrate on the device')}
    </div>

    <div class="sec-title"><span class="h3">Data &amp; privacy</span></div>
    <div class="list">
      ${toggleRow(I.shield,'On-device processing','Swing video never leaves your phone',true)}
      ${toggleRow(I.bell,'Practice reminders','Weekday evenings · 8:00 PM',true)}
    </div>

    <button class="btn btn-ghost" data-act="ob:restart" style="margin-top:20px">Replay onboarding</button>
    <div class="small dim-2 center" style="margin-top:18px">CALIBR · Posture Coach — prototype</div>
  `;
}

/* ============================================================= TAB BAR === */
function renderTabbar(){
  const tab=(scr,ic,lab)=>`
    <button class="tab" data-act="nav:${scr}" ${state.screen===scr?'aria-current="page"':''}>
      ${svgIco(I[ic])}<span>${lab}</span></button>`;
  $('#tabbar').innerHTML =
    tab('home','home','Home') +
    tab('growth','growth','Growth') +
    `<div class="tab-start"><button class="start-btn" data-act="start" aria-label="Start session">
        ${svgIco(I.play,'fill="var(--lime-ink)" stroke="none"')}</button><span class="start-lab">START</span></div>` +
    tab('missions','missions','Missions') +
    tab('profile','user','Profile');
}

/* ============================================================ RENDERING === */
const SCREENS={home:renderHome, report:renderReport, growth:renderGrowth, missions:renderMissions, profile:renderProfile};
function render(){
  stopAnim(); clearReplay(); hardCloseDetail(); hardCloseRecord(); stopZsTimer();
  curRecord=null;
  const scr=$('#screen');
  scr.innerHTML=SCREENS[state.screen]();
  scr.scrollTop=0;
  scr.classList.toggle('on-photo', state.screen==='missions');   // dark-glass cards over the photo
  setScreenBg();
  renderTabbar();
}
function setScreenBg(){
  let bg=$('#screenBg');
  if(!bg){ bg=document.createElement('div'); bg.id='screenBg'; bg.className='screen-bg';
    const ph=$('#phone'); ph.insertBefore(bg, ph.firstChild); }
  bg.classList.toggle('show', state.screen==='missions');        // full-bleed photo only on Missions
}
function nav(scr){ if(scr!=='report') state.baselineJustSet=false; state.screen=scr; render(); }

/* ---- Report avatar: phase paint, replay, joint detail sheet -------------- */
function paintAvatar(){
  const w=$('#avatarWrap'); if(w) w.innerHTML=avatarSVG(state.reportPhase);
  document.querySelectorAll('#phaseSwitch button').forEach(b=>
    b.setAttribute('aria-selected', String(b.dataset.act===`rphase:${state.reportPhase}`)));
}
function clearReplay(){ if(state.replayTimer){clearTimeout(state.replayTimer);state.replayTimer=null;} state.replaying=false; }
function setReportPhase(p){ clearReplay(); state.reportPhase=p; paintAvatar(); }
function replaySwing(){
  clearReplay();
  const seq=['address','top','impact','finish','impact'];
  state.replaying=true; let i=0; state.reportPhase=seq[0]; paintAvatar();
  const step=()=>{
    i++;
    if(i>=seq.length){ state.replaying=false; state.reportPhase='impact'; paintAvatar(); state.replayTimer=null; return; }
    state.reportPhase=seq[i]; paintAvatar();
    state.replayTimer=setTimeout(step,760);
  };
  state.replayTimer=setTimeout(step,760);
}

function miniHotspot(phaseKey,h){
  const pose=POSES[phaseKey], [x,y]=hsPoint(pose,h.id), s=h.st[phaseKey];
  const col=s==='alert'?'var(--alert)':'var(--lime)';
  return `<svg viewBox="0 0 200 300" class="skeleton">${skeletonInner(pose)}
    <circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${col}" stroke-width="2" opacity=".75"/>
    <circle cx="${x}" cy="${y}" r="4.5" fill="${col}"/></svg>`;
}
/* Anchor a scale-in card's transform-origin to the point that was tapped, so
   it appears to grow out of that spot. Measures the untransformed layout box. */
function growFrom(card, originEl){
  if(!card || !originEl) return;
  card.style.transition='none';
  const saved=card.style.transform;
  card.style.transform='none';                 // measure the full-size layout box
  const cr=card.getBoundingClientRect();
  card.style.transform=saved;                  // back to the CSS start state (scaled)
  const r=originEl.getBoundingClientRect();
  card.style.transformOrigin=`${(r.left+r.width/2-cr.left).toFixed(1)}px ${(r.top+r.height/2-cr.top).toFixed(1)}px`;
  void card.offsetWidth;                        // flush with transition off
  card.style.transition='';                     // restore the stylesheet transition
}

/* ---- Joint detail: card grows out of the tapped joint, close-up loops ---- */
let detail=null, detailRAF=null;

function jointViewBox(id){
  const ps=['address','top','impact','finish'].map(p=>hsPoint(POSES[p],id));
  let minX=Math.min(...ps.map(p=>p[0])), maxX=Math.max(...ps.map(p=>p[0]));
  let minY=Math.min(...ps.map(p=>p[1])), maxY=Math.max(...ps.map(p=>p[1]));
  const pad=34; minX-=pad; maxX+=pad; minY-=pad; maxY+=pad;
  let w=maxX-minX, h=maxY-minY; const min=104;           // floor keeps near-static joints framed
  if(w<min){minX-=(min-w)/2; w=min;} if(h<min){minY-=(min-h)/2; h=min;}
  return `${minX.toFixed(0)} ${minY.toFixed(0)} ${w.toFixed(0)} ${h.toFixed(0)}`;
}
function detailInfoHTML(h,phase){
  const st=h.st[phase], m=h.m[phase], coach=h.coach[phase]||h.coach._;
  return `<span class="pill ${st==='alert'?'pill-alert':'pill-lime'}" style="align-self:flex-start">
      ${st==='alert'?'Needs work':'On track'}</span>
    <div style="margin-top:12px"><div class="eyebrow">${h.name} · ${cap(phase)}</div>
      <div class="big" style="color:${st==='alert'?'var(--alert)':'var(--lime)'};margin-top:7px">${m[0]}</div>
      <div class="small dim" style="margin-top:5px">${m[1]}</div></div>
    <div class="card card-tight" style="margin-top:14px"><span class="eyebrow">Coaching</span>
      <div class="body" style="margin-top:7px;font-weight:600">${coach}</div></div>`;
}
function detailThumbsHTML(h,phase){
  return ['address','top','impact','finish'].map(p=>`
    <div class="frame ${p===phase?'cur':''} ${h.st[p]==='alert'?'warn':''}" data-act="dphase:${p}" role="button" tabindex="0" aria-label="${cap(p)}">
      <div class="mini">${miniHotspot(p,h)}</div><div class="fl">${cap(p)}</div></div>`).join('');
}
function openDetail(id, originEl){
  const h=HS().find(x=>x.id===id); if(!h) return;
  detail={id, phase:state.reportPhase};
  let o=$('#detail');
  if(!o){ o=document.createElement('div'); o.id='detail'; o.className='detail-overlay';
    $('#phone').appendChild(o);                          // mount inside the phone frame
    o.addEventListener('click',e=>{ if(e.target===o || e.target.classList.contains('detail-back')) closeDetail(); });
  }
  o.innerHTML=`<div class="detail-back"></div>
    <div class="detail-card" role="dialog" aria-label="${h.name} detail">
      <div class="row between" style="align-items:flex-start">
        <div class="eyebrow" style="padding-top:5px">Joint detail</div>
        <button class="icon-btn sm" data-act="hs-close" aria-label="Close">${svgIco(I.x)}</button>
      </div>
      <div class="detail-fig" id="detailFig">
        <svg class="glowfig" viewBox="${jointViewBox(id)}">${glowFigureAnim(POSES[detail.phase])}</svg>
        <span class="pill pill-lime detail-loop"><span class="dot"></span>Looping swing</span>
      </div>
      <div id="detailInfo">${detailInfoHTML(h,detail.phase)}</div>
      <div class="eyebrow" style="margin:16px 2px 0">Through the swing · tap to review</div>
      <div class="frames" id="detailThumbs" style="margin-top:10px">${detailThumbsHTML(h,detail.phase)}</div>
    </div>`;
  o.classList.add('show');
  growFrom(o.querySelector('.detail-card'), originEl);   // grow out of the tapped joint
  setTimeout(()=>o.classList.add('in'),20);              // reveal (fires even when rAF is throttled)
  startDetailLoop();
}
function startDetailLoop(){
  stopDetailLoop();
  const svg=$('#detailFig .glowfig'); if(!svg) return;
  if(RM){ setGlowPose(svg,POSES.impact); return; }
  const seq=['address','top','impact','finish','address'], dur=820;
  let seg=0, start=null;
  const frame=ts=>{
    if(!svg.isConnected){ detailRAF=null; return; }
    if(start==null) start=ts;
    let t=(ts-start)/dur;
    if(t>=1){ seg=(seg+1)%(seq.length-1); start=ts; t=0; }
    setGlowPose(svg, lerpPose(POSES[seq[seg]], POSES[seq[seg+1]], ease(t)));
    detailRAF=requestAnimationFrame(frame);
  };
  detailRAF=requestAnimationFrame(frame);
}
function stopDetailLoop(){ if(detailRAF){ cancelAnimationFrame(detailRAF); detailRAF=null; } }

function selectDetailPhase(p){
  if(!detail) return; detail.phase=p;
  const h=HS().find(x=>x.id===detail.id);
  const info=$('#detailInfo'); if(info) info.innerHTML=detailInfoHTML(h,p);
  document.querySelectorAll('#detailThumbs .frame').forEach(f=>
    f.classList.toggle('cur', f.getAttribute('data-act')===`dphase:${p}`));
}
function closeDetail(){
  const o=$('#detail'); if(!o || !o.classList.contains('show')) return;
  stopDetailLoop();
  o.classList.remove('in'); o.classList.add('out');
  const done=()=>{ o.classList.remove('show','out'); detail=null; };
  const card=o.querySelector('.detail-card');
  if(card) card.addEventListener('transitionend',done,{once:true});
  setTimeout(done,420);                                   // fallback if transitionend misses
}
function hardCloseDetail(){ stopDetailLoop(); const o=$('#detail'); if(o){ o.className='detail-overlay'; o.innerHTML=''; } detail=null; }

/* ================================================================ EVENTS = */
function greeting(){ return 'Good evening'; }

function toast(msg){
  let t=$('#toast');
  if(!t){ t=document.createElement('div'); t.id='toast'; t.className='toast'; $('#phone').appendChild(t); }
  t.textContent=msg; requestAnimationFrame(()=>t.classList.add('show'));
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),1900);
}

document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]'); if(!el) return;
  const [act,arg]=el.dataset.act.split(':');

  switch(act){
    case 'nav': nav(arg); break;
    case 'start': startSession(); break;
    case 'toast': toast(el.dataset.act.slice(6)); break;

    case 'mood':
      state.mood=+arg;
      syncPressed('mood:', a=>+a===state.mood);           // highlight only the tapped emoji
      updateAdjust();
      break;
    case 'area':
      toggleArea(arg);
      syncPressed('area:', a=>state.areas.has(a));         // reflect the whole set (None exclusivity)
      updateAdjust();
      break;

    case 'gtab': state.growthTab=arg; render(); break;
    case 'mcat': state.missionCat=arg; render(); break;
    case 'roundprep': startSession(ROUND_PREP); break;
    case 'mission': startMission(arg); break;
    case 'day': openDayRecord(+arg, el); break;
    case 'record-close': closeDayRecord(); break;

    case 'replay': replaySwing(); break;
    case 'rphase': setReportPhase(arg); break;
    case 'hs': openDetail(arg, el); break;
    case 'hs-close': closeDetail(); break;
    case 'dphase': selectDetailPhase(arg); break;
    case 'save-reflect': {
      const v=($('#reflect')?.value||'').trim();
      toast(v?'Reflection saved · session complete':'Session saved to your records');
      state.reflected=true; setTimeout(()=>nav('home'),700); break;
    }
    case 'sw': { const on=el.getAttribute('aria-checked')==='true'; el.setAttribute('aria-checked',String(!on)); break; }

    case 'ob':
      if(arg==='restart'){ state.ob=0; showOnboarding(); }
      break;
    case 'launch-start': hideLaunch(); state.ob=0; showOnboarding(); break;
    case 'launch-login': hideLaunch(); nav('home'); break;
    case 'ob-next': obNext(); break;
    case 'ob-skip': hideOnboarding(); break;
    case 'ob-score': state.obScore=+arg; syncPressed('ob-score:', a=>+a===state.obScore); updateGoalCta(); break;
    case 'ob-round': state.obRound=+arg; syncPressed('ob-round:', a=>+a===state.obRound); updateGoalCta(); break;
    case 'zs-done':
      stopZsTimer(); hideOverlay('#zs');
      if(!state.hasBaseline){ state.hasBaseline=true; state.baselineJustSet=true;
        DATA.user.baselineDate='Today'; }
      nav('report'); break;
    case 'zs-cancel': stopZsTimer(); hideOverlay('#zs'); break;
  }
});

function toggleArea(a){
  if(a==='None'){ state.areas.clear(); state.areas.add('None'); return; }
  state.areas.delete('None');
  state.areas.has(a)? state.areas.delete(a) : state.areas.add(a);
}
function adjustNoteHTML(){
  return `<div class="row gap-8 mt-16" style="align-items:flex-start;padding-top:14px;border-top:1px solid rgba(12,13,9,.14)">
    ${svgIco(I.bolt,'fill="#08211d" stroke="none" style="width:16px;height:16px;flex:0 0 auto;margin-top:1px"')}
    <span class="small" style="color:rgba(12,13,9,.78);font-weight:600">${DATA.mission.adjusted}</span></div>`;
}
/* Update ONLY the mission card's auto-adjust note — no full re-render, no flicker */
function updateAdjust(){
  const box=$('#missionAdjust'); if(!box) return;      // absent for fresh-user card
  const show = state.mood===2 || state.areas.size>0;
  box.innerHTML = show ? adjustNoteHTML() : '';
}
/* Reflect a single-select group's state on its buttons via aria-pressed only */
function syncPressed(prefix, isOn){
  document.querySelectorAll(`[data-act^="${prefix}"]`).forEach(b=>
    b.setAttribute('aria-pressed', String(isOn(b.dataset.act.slice(prefix.length)))));
}

/* ---- In-session "Training in progress" screen (zero-screen philosophy) --- */
function guessSets(goal){
  const nums=(goal.match(/\d+/g)||[]).map(Number).filter(n=>n>=4 && n<=30);
  return nums.length?Math.max(...nums):10;
}
function startMission(id){
  const m=DATA.missions.find(x=>x.id===id); if(!m) return;
  startSession({title:m.goal, mode:m.mode, min:m.min, sets:guessSets(m.goal)});
}
const zsFmt=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
function stopZsTimer(){ if(state.zsTimer){ clearInterval(state.zsTimer); state.zsTimer=null; } }

function startSession(mission){
  stopZsTimer();
  let z=$('#zs');
  if(!z){ z=document.createElement('div'); z.id='zs'; z.className='overlay'; document.body.appendChild(z); }
  const m=mission||DATA.mission, first=!state.hasBaseline;
  state.sessionType = m.mode==='Putt' ? 'putt' : 'swing';   // decides the report layout
  const N=m.sets||10, name=first?'Baseline session':(m.title||'Practice');
  z.innerHTML=`<div class="zs">
    <div class="zs-orb">
      <div class="zs-ring breathe"></div>
      <svg class="zs-spin" width="170" height="170" viewBox="0 0 170 170" aria-hidden="true">
        <circle cx="85" cy="85" r="76" fill="none" stroke="rgba(135,216,206,.4)" stroke-width="2" stroke-dasharray="3 15" stroke-linecap="round"/></svg>
      <div class="core">${svgIco(I.voice,'stroke="var(--lime-ink)" fill="none" stroke-width="2" style="width:38px;height:38px"')}</div>
    </div>
    <div class="eyebrow">Training in progress</div>
    <div class="h1" style="margin-top:10px;max-width:280px">Put your phone down</div>
    <p class="body dim" style="margin-top:12px;max-width:300px">
      ${first
        ? `Swing naturally — CALIBR is reading your posture by voice. <b style="color:var(--ink)">Tonight becomes your baseline.</b>`
        : `CALIBR is coaching by voice. No screen while you swing — come back when you’re done.`}</p>
    <div class="row gap-8 wrap" style="justify-content:center;margin-top:16px">
      <span class="pill pill-lime"><span class="dot"></span>${m.mode||'Mixed'}</span>
      <span class="pill">${name}</span>
    </div>
    <div class="zs-live">
      <div class="zs-live-col"><div class="zs-live-num" id="zsElapsed">00:00</div><div class="zs-live-lab">Elapsed</div></div>
      <div class="zs-live-div"></div>
      <div class="zs-live-col"><div class="zs-live-num" id="zsSets">1<span class="zs-sets-tot"> / ${N}</span></div><div class="zs-live-lab">Sets</div></div>
    </div>
    <div style="position:absolute;left:26px;right:26px;bottom:44px">
      <button class="btn btn-primary" data-act="zs-done">End session${first?' — save baseline':''}</button>
      <button class="btn btn-ghost" data-act="zs-cancel" style="margin-top:12px;height:48px;font-size:14.5px">Cancel — don’t save</button>
    </div></div>`;
  z.classList.add('show');
  // live, minimal progress (setInterval fires even in throttled tabs)
  state.zsElapsed=0;
  const el=$('#zsElapsed'), setsEl=$('#zsSets');
  state.zsTimer=setInterval(()=>{
    state.zsElapsed++;
    if(el) el.textContent=zsFmt(state.zsElapsed);
    const set=Math.min(N, 1+Math.floor(state.zsElapsed/6));
    if(setsEl) setsEl.innerHTML=`${set}<span class="zs-sets-tot"> / ${N}</span>`;
  },1000);
}
function hideOverlay(sel){ const o=$(sel); if(o) o.classList.remove('show'); }

/* ---------------------------------------------------------- ONBOARDING --- */
/* Phone-only: concept → pair → home position → goal. No swing capture here —
   the first real session becomes the baseline automatically. */
const OB=[
  { key:'concept', hero:()=>`<div class="avatar-stage" style="width:210px;height:230px;margin:0 auto">
        <div class="avatar-grid"></div>${buildSkeleton(POSES.finish)}</div>`,
    title:'You won’t look at<br>a screen while you train.',
    sub:'CALIBR coaches you by voice while you swing — no screen, no ball, no mat. The app briefs your mission before, and reviews your posture after.',
    cta:'Get started' },
  { key:'pair', hero:()=>`<div style="width:150px;height:150px;margin:0 auto;position:relative;display:grid;place-items:center">
        <svg class="scan-ring" width="150" height="150" viewBox="0 0 150 150"><circle cx="75" cy="75" r="66" fill="none" stroke="rgba(135,216,206,.25)" stroke-width="2" stroke-dasharray="6 12"/></svg>
        <div style="position:absolute;width:88px;height:88px;border-radius:50%;background:radial-gradient(circle at 35% 30%,var(--lime-hi),var(--lime-deep));display:grid;place-items:center;box-shadow:0 0 50px rgba(135,216,206,.4)">
          ${svgIco(I.bt,'stroke="var(--lime-ink)" fill="none" stroke-width="2" style="width:38px;height:38px"')}</div></div>`,
    title:'Pair your club &amp; stand',
    sub:'Power on the club and set your phone in the stand. We found <b style="color:var(--ink)">CALIBR-0417</b> — connecting now.<br><br><b style="color:var(--lime)">Just this once</b> — after today, picking up the club or setting it in the stand connects it automatically.',
    cta:'Connected — continue' },
  { key:'goal', hero:null, title:'Set your goal',
    sub:'Your target score and next round shape each night’s mission. Change it anytime.',
    cta:'Finish setup' },
];
const SCORES=[['Break 100'],['Break 95'],['Break 90'],['Break 85']];
const ROUNDS=[['This weekend',3],['In 2 weeks',14],['In a month',30],['Not scheduled',null]];

function showOnboarding(){ $('#onboarding').className='overlay show'; renderOnboarding(); }
function hideOnboarding(){ $('#onboarding').className='overlay'; stopAnim(); }
const goalReady=()=> state.obScore!=null && state.obRound!=null;
/* Toggle the Finish button live (no full re-render) as goal options are picked */
function updateGoalCta(){
  const btn=$('#onboarding [data-act="ob-next"]');
  if(btn) btn.disabled=!goalReady();
}
function obNext(){ if(state.ob>=OB.length-1){ finishOnboarding(); } else { state.ob++; renderOnboarding(); } }
function finishOnboarding(){
  if(!goalReady()) return;          // need both a score and a round first
  DATA.user.goal=SCORES[state.obScore][0];
  const rd=ROUNDS[state.obRound][1];
  DATA.user.roundInDays = rd==null ? null : rd;
  state.hasBaseline=false;          // fresh user — first session becomes baseline
  state.baselineJustSet=false;
  hideOnboarding(); nav('home');
  toast('All set — your first session sets your baseline');
}
function renderOnboarding(){
  const s=OB[state.ob];
  const dots=OB.map((_,i)=>`<i class="${i===state.ob?'on':''}"></i>`).join('');
  const goalBody=`<div>
    <div class="eyebrow" style="margin-bottom:11px">Target score</div>
    <div class="chips">${SCORES.map((g,i)=>`<button class="chip" data-act="ob-score:${i}" aria-pressed="${state.obScore===i}">${g[0]}</button>`).join('')}</div>
    <div class="eyebrow" style="margin:20px 0 11px">Next round</div>
    <div class="chips">${ROUNDS.map((r,i)=>`<button class="chip" data-act="ob-round:${i}" aria-pressed="${state.obRound===i}">${r[0]}</button>`).join('')}</div>
  </div>`;

  $('#onboarding').innerHTML=`<div class="ob-inner">
    <div class="ob-top"><div class="ob-dots">${dots}</div>
      <button class="ob-skip" data-act="ob-skip">Skip</button></div>
    <div class="ob-body">
      ${s.key==='goal'?'':`<div class="ob-hero">${s.hero()}</div>`}
      <div class="ob-title">${s.title}</div>
      <p class="ob-sub">${s.sub}</p>
      ${s.key==='goal'?`<div style="margin-top:26px">${goalBody}</div>`:''}
    </div>
    <div class="ob-foot"><button class="btn btn-primary" data-act="ob-next" ${s.key==='goal'&&!goalReady()?'disabled':''}>${s.cta}</button></div>
  </div>`;
}

/* ----------------------------------------------------------- LAUNCH ------ */
function renderLaunch(){
  const mark=`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="var(--lime)" stroke-width="2"/>
    <circle cx="12" cy="12" r="3" fill="var(--lime)"/>
    <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" stroke="var(--lime)" stroke-width="2" stroke-linecap="round"/></svg>`;
  $('#launch').innerHTML=`<div class="launch">
    <div class="launch-fallback"></div>
    <div class="launch-bg"></div>
    <div class="launch-scrim"></div>
    <div class="launch-top"><span class="brand">${mark}CALIBR</span></div>
    <div class="launch-bottom">
      <div class="launch-slogan">Train every day<br>Break every limit</div>
      <div class="launch-sub">Zero-screen coaching for the range in your living room — brief before, review after.</div>
      <div class="launch-cta">
        <button class="btn btn-login" data-act="launch-login">Log in</button>
        <button class="btn btn-getstarted" data-act="launch-start">Get started</button>
      </div>
    </div>
  </div>`;
}
function showLaunch(){ $('#launch').className='overlay show'; renderLaunch(); }
function hideLaunch(){ $('#launch').className='overlay'; }

/* ================================================================= INIT === */
function init(){
  const q=new URLSearchParams(location.search);
  const scr=q.get('screen');
  if(scr && SCREENS[scr]) state.screen=scr;          // deep-link a screen
  if(q.get('tab')) state.growthTab=q.get('tab');
  renderTabbar();
  render();
  if(scr) return;                                    // deep-linked into the app — skip intro
  if(q.get('launch')==='0'){ if(q.get('ob')!=='0') showOnboarding(); }
  else showLaunch();                                 // first entry: launch screen
}
init();
