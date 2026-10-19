const WINDOW_SEC=10,MIN_TAIL_SEC=1; // mirror classifier.py: 10-s windows, tails under 1 s are skipped
const state={file:null,audioUrl:null,audioDuration:0,peaks:null,results:[],apiUrl:"http://127.0.0.1:8000",username:"",password:"",connected:false,analyzing:false,stopAt:null,xhr:null,demo:false,demoAbort:null,resultsAreDemo:false};
const palette=["#00e5ff","#3c7dff","#9b5cff","#ff2dd1","#ff7a00","#ffe600","#ff3158","#45ffbd"];
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const statusDot=$("#statusDot"),systemStatus=$("#systemStatus"),fileInput=$("#fileInput"),dropzone=$("#dropzone"),selectedFile=$("#selectedFile"),fileName=$("#fileName"),fileMeta=$("#fileMeta"),clearFileBtn=$("#clearFileBtn"),waveShell=$("#waveShell"),waveStage=$("#waveStage"),waveform=$("#waveform"),waveWindows=$("#waveWindows"),durationLabel=$("#durationLabel"),currentTimeLabel=$("#currentTimeLabel"),windowCountLabel=$("#windowCountLabel"),nowWindow=$("#nowWindow"),waveMarker=$("#waveMarker"),audioEl=$("#audioEl"),playBtn=$("#playBtn"),analyzeBtn=$("#analyzeBtn"),analyzeLabel=$("#analyzeLabel"),resetBtn=$("#resetBtn"),processPanel=$("#processPanel"),processingBadge=$("#processingBadge"),pipelineProgress=$("#pipelineProgress"),timelinePanel=$("#timelinePanel"),timelineEl=$("#timeline"),resultStack=$("#resultStack"),resultsCount=$("#resultsCount"),accessPanel=$("#accessPanel"),accessForm=$("#accessForm"),accessStatus=$("#accessStatus"),apiUrlInput=$("#apiUrl"),apiUserInput=$("#apiUser"),apiPassInput=$("#apiPass"),dropTitle=$("#dropTitle"),dropSub=$("#dropSub"),openAccessBtn=$("#openAccessBtn"),cursorGlow=$("#cursorGlow"),demoBtn=$("#demoBtn"),accessDemoBtn=$("#accessDemoBtn"),demoBanner=$("#demoBanner"),exitDemoBtn=$("#exitDemoBtn"),demoSongBtn=$("#demoSongBtn");

function motionAnimate(target,keyframes,options={}){return window.Motion?.animate?window.Motion.animate(target,keyframes,options):null}
function setSystemState(mode,text){
  systemStatus.textContent=text;
  statusDot.style.background=mode==="online"?"var(--green)":mode==="busy"?"var(--cyan)":"var(--red)";
  statusDot.style.boxShadow=mode==="online"?"0 0 13px rgba(69,255,189,.7)":mode==="busy"?"0 0 13px rgba(0,229,255,.7)":"0 0 13px rgba(255,49,88,.7)";
}
function basicAuthHeader(){return"Basic "+btoa(unescape(encodeURIComponent(state.username+":"+state.password)))}
function formatBytes(bytes){if(!bytes)return"0 B";const u=["B","KB","MB","GB"],i=Math.min(Math.floor(Math.log(bytes)/Math.log(1024)),3);return(bytes/Math.pow(1024,i)).toFixed(i?1:0)+" "+u[i]}
function formatTime(seconds){const s=Math.max(0,Math.floor(Number(seconds)||0));return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function parseTimestamp(t){const m=String(t||"").match(/(\d+):(\d+)\s*-\s*(\d+):(\d+)/);return m?{start:+m[1]*60+ +m[2],end:+m[3]*60+ +m[4]}:null}
function normalizeConfidence(item){
  const raw=Number(item?.confidence);
  if(Number.isFinite(raw))return{raw,pct:Math.max(0,Math.min(100,raw*100))};
  const pct=Number(String(item?.confidence_percentage||"").replace("%",""));
  return Number.isFinite(pct)?{raw:pct/100,pct:Math.max(0,Math.min(100,pct))}:{raw:0,pct:0};
}
function getInstrument(item){return item?.instrument||item?.original_prediction||"Unknown instrument"}
function escapeHtml(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function setAccessMessage(m,type=""){accessStatus.className="access-status "+type;accessStatus.textContent=m}
function openAccess(show=true){
  if(show){accessPanel.classList.remove("hidden");motionAnimate(accessPanel,{opacity:[0,1],scale:[.97,1],y:[-16,0]},{duration:.4,ease:"ease-out"})}
  else accessPanel.classList.add("hidden");
}

// ---- Window maths (same rule as the backend) ----
function windowCount(duration){
  if(!duration)return 0;
  const full=Math.floor(duration/WINDOW_SEC),tail=duration-full*WINDOW_SEC;
  return full+(tail>=MIN_TAIL_SEC?1:0);
}
// The timeline spans the song, or the last padded window if that ends later.
function songSpan(){
  let span=state.audioDuration||0;
  state.results.forEach(r=>{const p=parseTimestamp(r.timestamp);if(p)span=Math.max(span,p.end)});
  return Math.max(span,WINDOW_SEC);
}

// ---- Pipeline (real upload progress; server steps shown together) ----
function resetPipeline(){
  $$(".process-step").forEach(s=>{s.classList.remove("active","done","failed");s.querySelector(".step-state").textContent="WAITING"});
  pipelineProgress.style.width="0%";
  pipelineProgress.classList.remove("waiting");
  processingBadge.className="processing-badge";
  processingBadge.textContent="PROCESSING";
}
function setStep(i,status,label){
  const s=document.querySelector('.process-step[data-step="'+i+'"]');
  if(!s)return;
  s.classList.toggle("active",status==="active");
  s.classList.toggle("done",status==="done");
  s.classList.toggle("failed",status==="failed");
  s.querySelector(".step-state").textContent=label||(status==="done"?"DONE":status==="failed"?"FAILED":"RUNNING");
}

// ---- Waveform ----
function drawWaveform(samples=state.peaks){
  const ctx=waveform.getContext("2d"),dpr=devicePixelRatio||1,w=waveform.clientWidth||760,h=120;
  waveform.width=Math.round(w*dpr);waveform.height=Math.round(h*dpr);
  ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
  ctx.strokeStyle="rgba(0,229,255,.08)";ctx.lineWidth=1;
  for(let y=17;y<h;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  const points=samples||Array.from({length:Math.max(100,Math.floor(w/4.6))},(_,i)=>.06+(Math.abs(Math.sin(i*.21))*.62+Math.abs(Math.cos(i*.047))*.38)*(.12+(i%19)/74));
  const gap=w/points.length,bw=Math.max(1.3,gap*.72),g=ctx.createLinearGradient(0,0,w,0);
  g.addColorStop(0,"#00e5ff");g.addColorStop(.43,"#3c7dff");g.addColorStop(.7,"#9b5cff");g.addColorStop(1,"#ff2dd1");
  ctx.fillStyle=g;
  points.forEach((a,i)=>{const hh=Math.max(2,a*(h-22));ctx.fillRect(i*gap,h/2-hh/2,bw,hh)});
}
async function createAudioWaveform(file){
  const C=window.AudioContext||window.webkitAudioContext;
  if(!C){drawWaveform();return}
  try{
    const ac=new C(),buf=await ac.decodeAudioData((await file.arrayBuffer()).slice(0)),data=buf.getChannelData(0);
    if(state.file!==file){await ac.close();return}
    setDuration(buf.duration);
    const n=Math.max(120,Math.min(460,Math.floor((waveform.clientWidth||760)/2.2))),size=Math.max(1,Math.floor(data.length/n)),samples=[];
    for(let i=0;i<n;i++){
      let max=0;const start=i*size,end=Math.min(data.length,start+size);
      for(let j=start;j<end;j+=Math.max(1,Math.floor(size/20)))max=Math.max(max,Math.abs(data[j]));
      samples.push(Math.min(1,max));
    }
    state.peaks=samples;drawWaveform();
    await ac.close();
  }catch{drawWaveform()}
}
function setDuration(d){
  if(!Number.isFinite(d)||d<=0)return;
  state.audioDuration=d;
  durationLabel.textContent=formatTime(d);
  const n=windowCount(d);
  windowCountLabel.textContent=n+" × 10-S WINDOW"+(n===1?"":"S");
  renderWaveWindows();
  if(state.results.length)renderTimeline();
}
// 10-s window grid on the waveform, with detected windows highlighted.
function renderWaveWindows(){
  const span=songSpan();
  if(!state.audioDuration){waveWindows.innerHTML="";return}
  let html="";
  for(let t=WINDOW_SEC;t<span;t+=WINDOW_SEC)html+='<i class="win-line" style="left:'+(t/span*100)+'%"></i>';
  const seen=new Set();
  state.results.forEach((r,i)=>{
    const p=parseTimestamp(r.timestamp);if(!p)return;
    const key=p.start;
    const label=seen.has(key)?"":escapeHtml(getInstrument(r));
    seen.add(key);
    html+='<div class="win-hit" style="--accent:'+palette[i%palette.length]+';left:'+(p.start/span*100)+'%;width:'+((p.end-p.start)/span*100)+'%">'+(label?"<span>"+label+"</span>":"")+"</div>";
  });
  waveWindows.innerHTML=html;
}

// ---- Audio player ----
function setPlayingUi(){
  const playing=!audioEl.paused&&!audioEl.ended;
  playBtn.classList.toggle("playing",playing);
  playBtn.setAttribute("aria-label",playing?"Pause":"Play");
}
function seekTo(sec,play=false){
  if(!state.audioUrl)return;
  audioEl.currentTime=Math.max(0,Math.min(sec,state.audioDuration||sec));
  if(play)audioEl.play().catch(()=>{});
  updatePlayhead();
}
function playWindow(start,end){
  state.stopAt=Math.min(end,state.audioDuration||end);
  seekTo(start,true);
}
function togglePlay(){
  if(!state.audioUrl)return;
  state.stopAt=null;
  if(audioEl.paused)audioEl.play().catch(()=>{});else audioEl.pause();
}
function updatePlayhead(){
  const t=audioEl.currentTime||0,span=songSpan(),p=Math.min(1,t/span);
  currentTimeLabel.textContent=formatTime(t);
  waveMarker.style.left=(p*100)+"%";
  const ph=$("#timelinePlayhead");if(ph)ph.style.setProperty("--p",p);
  const idx=Math.floor(t/WINDOW_SEC);
  nowWindow.textContent=state.audioDuration?"WINDOW "+(idx+1)+" · "+formatTime(idx*WINDOW_SEC)+"–"+formatTime(idx*WINDOW_SEC+WINDOW_SEC):"WINDOW —";
  // Highlight instruments whose strongest window is playing now.
  const playing=!audioEl.paused;
  let any=false;
  $$("[data-start]").forEach(el=>{
    const live=playing&&t>=+el.dataset.start&&t<+el.dataset.end;
    el.classList.toggle("live",live);
    if(live)any=true;
  });
  nowWindow.classList.toggle("active",any);
}
audioEl.addEventListener("loadedmetadata",()=>{if(!state.audioDuration)setDuration(audioEl.duration)});
audioEl.addEventListener("timeupdate",()=>{
  if(state.stopAt!==null&&audioEl.currentTime>=state.stopAt){audioEl.pause();state.stopAt=null}
  updatePlayhead();
});
["play","pause","ended"].forEach(n=>audioEl.addEventListener(n,()=>{setPlayingUi();updatePlayhead()}));
playBtn.addEventListener("click",togglePlay);
waveStage.addEventListener("click",e=>{
  if(!state.audioDuration)return;
  const r=waveStage.getBoundingClientRect();
  state.stopAt=null;
  seekTo((e.clientX-r.left)/r.width*songSpan());
});
// Smooth playhead between timeupdate events.
(function tick(){if(!audioEl.paused)updatePlayhead();requestAnimationFrame(tick)})();

// ---- File handling ----
function handleFile(file){
  if(!file)return;
  if(file.type&&!file.type.startsWith("audio/")){setAccessMessage("Please select a valid audio file.","error");openAccess(true);return}
  clearFile();
  state.file=file;
  state.audioUrl=URL.createObjectURL(file);
  audioEl.src=state.audioUrl;
  selectedFile.classList.remove("hidden");
  waveShell.classList.remove("hidden");
  fileName.textContent=file.name;
  fileMeta.textContent=formatBytes(file.size)+" · "+(file.type||"audio");
  dropTitle.textContent="SIGNAL LOADED";
  dropSub.textContent="Ready for backend inference";
  analyzeBtn.disabled=false;
  motionAnimate(selectedFile,{opacity:[0,1],y:[15,0],scale:[.98,1]},{duration:.42,easing:"ease-out"});
  motionAnimate(waveShell,{opacity:[0,1],y:[8,0]},{duration:.45,delay:.07,easing:"ease-out"});
  createAudioWaveform(file);
}
function clearFile(){
  audioEl.pause();
  audioEl.removeAttribute("src");audioEl.load();
  if(state.audioUrl)URL.revokeObjectURL(state.audioUrl);
  Object.assign(state,{file:null,audioUrl:null,audioDuration:0,peaks:null,stopAt:null});
  fileInput.value="";
  selectedFile.classList.add("hidden");
  waveShell.classList.add("hidden");
  dropTitle.textContent="DROP AUDIO HERE";
  dropSub.textContent="or click to browse your machine";
  analyzeBtn.disabled=true;
  durationLabel.textContent="00:00";currentTimeLabel.textContent="00:00";
  windowCountLabel.textContent="— WINDOWS";nowWindow.textContent="WINDOW —";
  waveWindows.innerHTML="";waveMarker.style.left="0%";
  setPlayingUi();
  drawWaveform();
}

// ---- API ----
async function connectAPI(){
  state.apiUrl=apiUrlInput.value.trim().replace(/\/$/,"");
  state.username=apiUserInput.value;
  state.password=apiPassInput.value;
  setAccessMessage("Connecting to FastAPI…");
  setSystemState("busy","CONNECTING API");
  try{
    const r=await fetch(state.apiUrl+"/",{headers:{Authorization:basicAuthHeader()}});
    if(!r.ok){if(r.status===401)throw new Error("401 Unauthorized — check Basic Auth credentials");throw new Error("HTTP "+r.status)}
    await r.json();
    exitDemo();
    state.connected=true;
    setAccessMessage("Connected. FastAPI health check passed.","success");
    setSystemState("online","API ONLINE");
    motionAnimate(openAccessBtn,{scale:[1,1.04,1]},{duration:.35});
    setTimeout(()=>openAccess(false),280);
  }catch(e){
    state.connected=false;
    setAccessMessage("Connection failed: "+e.message,"error");
    setSystemState("offline","API DISCONNECTED");
  }
}
// XHR rather than fetch so upload progress is real.
function postDetect(file,onUploadProgress,onUploaded){
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest(),body=new FormData();
    state.xhr=xhr;
    body.append("file",file);
    xhr.open("POST",state.apiUrl+"/detect");
    xhr.setRequestHeader("Authorization",basicAuthHeader());
    xhr.upload.onprogress=e=>{if(e.lengthComputable)onUploadProgress(e.loaded/e.total)};
    xhr.upload.onload=onUploaded;
    xhr.onload=()=>{
      let json=null;try{json=JSON.parse(xhr.responseText)}catch{}
      if(xhr.status>=200&&xhr.status<300&&json)resolve(json);
      else reject(new Error(json?.detail?(xhr.status+" — "+json.detail):"HTTP "+xhr.status));
    };
    xhr.onerror=()=>reject(new Error("Network error — is the API running and reachable?"));
    xhr.onabort=()=>reject(Object.assign(new Error("Request cancelled"),{aborted:true}));
    xhr.send(body);
  });
}

// ---- Demo mode ----
// Lets the console be presented without the CLAP backend. Everything it produces is labelled
// as simulated / sample data; it never claims to be real model output.
function enterDemo(){
  state.demo=true;state.connected=true;
  demoBanner.classList.remove("hidden");
  setSystemState("online","DEMO MODE");
  setAccessMessage("Demo mode on: analysis is simulated and returns a sample result.","success");
  openAccess(false);
  motionAnimate(demoBanner,{opacity:[0,1],y:[-8,0]},{duration:.35,easing:"ease-out"});
  if(!state.file)loadDemoSong();
}
function exitDemo(){
  if(!state.demo)return;
  if(state.demoAbort)state.demoAbort();
  state.demo=false;state.connected=false;
  demoBanner.classList.add("hidden");
  setSystemState("offline","API DISCONNECTED");
}
// A 65-second synthetic track: tanpura-like drone throughout, a harmonium-like chord section,
// tabla-like strokes and a bansuri-like melody, placed in the windows the sample result reports.
async function synthDemoSong(){
  const sr=22050,dur=65,ctx=new OfflineAudioContext(1,sr*dur,sr),out=ctx.createGain();
  out.gain.value=0.9;out.connect(ctx.destination);
  const env=(g,t,a,d,peak)=>{g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+d)};
  // drone
  [110,165,220].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type="sine";o.frequency.value=f;g.gain.value=[0.06,0.035,0.02][i];o.connect(g).connect(out);o.start(0);o.stop(dur)});
  // harmonium-like chords, 10–20 s
  const lp=ctx.createBiquadFilter();lp.type="lowpass";lp.frequency.value=1400;lp.connect(out);
  [[220,277,330],[247,311,370],[196,247,294],[220,277,330],[262,330,392]].forEach((ch,k)=>{
    const t=10+k*2;ch.forEach(f=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type="sawtooth";o.frequency.value=f;
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.035,t+0.15);g.gain.setValueAtTime(0.035,t+1.8);g.gain.linearRampToValueAtTime(0,t+2);
      o.connect(g).connect(lp);o.start(t);o.stop(t+2.05)})});
  // light percussion 20–40 s, tabla-like strokes 40–50 s
  const noise=ctx.createBuffer(1,sr*0.2,sr),nd=noise.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
  const stroke=(t,f,amp,bright)=>{
    const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*0.55,t+0.12);
    env(g,t,0.004,0.18,amp);o.connect(g).connect(out);o.start(t);o.stop(t+0.25);
    const n=ctx.createBufferSource(),ng=ctx.createGain(),bp=ctx.createBiquadFilter();n.buffer=noise;bp.type="bandpass";bp.frequency.value=bright;
    env(ng,t,0.002,0.06,amp*0.5);n.connect(bp).connect(ng).connect(out);n.start(t);n.stop(t+0.1)};
  for(let t=20;t<40;t+=1)stroke(t,180,0.12,1500);
  const pattern=[1,0,1,1,0,1,0,1];
  for(let t=40,i=0;t<50;t+=0.25,i++)if(pattern[i%8])stroke(t,i%4===0?320:240,i%4===0?0.32:0.2,i%2?3200:2200);
  // bansuri-like melody 50–60 s
  const notes=[587,659,784,880,784,659,587,523,587,659,784,659,587,659,523,587,659,784,880,988];
  notes.forEach((f,k)=>{const t=50+k*0.5,o=ctx.createOscillator(),g=ctx.createGain(),lfo=ctx.createOscillator(),lg=ctx.createGain();
    o.type="sine";o.frequency.value=f;lfo.frequency.value=5.5;lg.gain.value=f*0.012;lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.14,t+0.06);g.gain.setValueAtTime(0.14,t+0.38);g.gain.linearRampToValueAtTime(0,t+0.49);
    o.connect(g).connect(out);o.start(t);lfo.start(t);o.stop(t+0.5);lfo.stop(t+0.5)});
  const buf=await ctx.startRendering();
  return new File([encodeWav(buf.getChannelData(0),sr)],"demo-song.wav",{type:"audio/wav"});
}
function encodeWav(samples,sr){
  const b=new ArrayBuffer(44+samples.length*2),v=new DataView(b),w=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
  w(0,"RIFF");v.setUint32(4,36+samples.length*2,true);w(8,"WAVE");w(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,"data");v.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++)v.setInt16(44+i*2,Math.max(-1,Math.min(1,samples[i]))*0x7fff,true);
  return b;
}
async function loadDemoSong(){
  demoSongBtn.disabled=true;dropSub.textContent="Synthesising demo song…";
  try{state.results=[];timelinePanel.classList.add("hidden");handleFile(await synthDemoSong())}
  catch(e){setAccessMessage("Could not create the demo song: "+e.message,"error");openAccess(true)}
  finally{demoSongBtn.disabled=false}
}
// Sample payload in the exact /detect format. The demo song places each instrument in the window
// reported here; files shorter than 60 s get the windows spread across the song instead.
function demoPayload(duration){
  const n=Math.max(1,windowCount(duration)),ts=i=>{const s=i*WINDOW_SEC,e=s+WINDOW_SEC,f=x=>Math.floor(x/60)+":"+String(x%60).padStart(2,"0");return f(s)+" - "+f(e)};
  const pick=n>=6?[4,1,5]:[Math.floor(n*0.6),Math.floor(n*0.2),Math.min(n-1,Math.floor(n*0.85))];
  const rows=[["Tabla",0.3142],["Harmonium",0.2918],["Bansuri",0.2745]];
  const instruments=rows.map(([name,c],k)=>({instrument:name,original_prediction:name,confidence:c,confidence_percentage:(c*100).toFixed(2)+"%",timestamp:ts(pick[k])}));
  return{success:true,total_instruments_detected:instruments.length,instruments,demo:true};
}
// Simulated request with the same callbacks as postDetect.
function simulateDetect(file,onUploadProgress,onUploaded){
  return new Promise((resolve,reject)=>{
    const timers=[];let f=0;
    state.demoAbort=()=>{timers.forEach(clearTimeout);timers.forEach(clearInterval);state.demoAbort=null;reject(Object.assign(new Error("Request cancelled"),{aborted:true}))};
    const up=setInterval(()=>{f=Math.min(1,f+0.08);onUploadProgress(f);if(f>=1){clearInterval(up);onUploaded();
      timers.push(setTimeout(()=>{state.demoAbort=null;resolve(demoPayload(state.audioDuration))},1800))}},70);
    timers.push(up);
  });
}

async function runAnalysis(){
  if(!state.file){setAccessMessage("Select an audio file first.","error");openAccess(true);return}
  if(!state.connected){openAccess(true);setAccessMessage("Connect to FastAPI first, then run the classifier.","error");return}
  if(state.analyzing)return;
  state.analyzing=true;
  analyzeBtn.disabled=true;
  analyzeLabel.textContent="ANALYZING";
  processPanel.classList.remove("hidden");
  resetPipeline();
  const demo=state.demo;
  resultStack.innerHTML='<div class="empty-state"><span class="empty-orbit"></span><strong>'+(demo?"RUNNING DEMO":"RUNNING INFERENCE")+'</strong><span>'+(demo?"Simulating the pipeline with a sample result…":"Waiting for the FastAPI + CLAP response…")+'</span></div>';
  setSystemState("busy",demo?"DEMO RUNNING":"INFERENCE RUNNING");
  motionAnimate(processPanel,{opacity:[0,1],y:[14,0],scale:[.985,1]},{duration:.45,easing:"ease-out"});
  const started=performance.now();
  const timer=setInterval(()=>{processingBadge.textContent=(demo?"DEMO · ":"PROCESSING · ")+formatTime((performance.now()-started)/1000)},250);
  setStep(0,"active","0%");
  const serverSteps=()=>{for(let i=1;i<5;i++)setStep(i,"active",demo?"SIMULATED":"ON SERVER")};
  try{
    const payload=await (demo?simulateDetect:postDetect)(state.file,
      f=>{setStep(0,"active",Math.round(f*100)+"%");pipelineProgress.style.width=(f*30)+"%"},
      ()=>{setStep(0,"done");pipelineProgress.style.width="30%";pipelineProgress.classList.add("waiting");serverSteps()});
    for(let i=0;i<5;i++)setStep(i,"done");
    pipelineProgress.classList.remove("waiting");
    pipelineProgress.style.width="100%";
    processingBadge.className="processing-badge done";
    processingBadge.textContent=(demo?"DEMO · SIMULATED IN ":"DONE IN ")+((performance.now()-started)/1000).toFixed(1)+" S";
    renderResults(payload);
    setSystemState("online",demo?"DEMO MODE":"API ONLINE");
  }catch(e){
    if(e.aborted)return; // console was reset mid-request
    pipelineProgress.classList.remove("waiting");
    $$(".process-step.active").forEach(s=>setStep(+s.dataset.step,"failed"));
    processingBadge.className="processing-badge failed";
    processingBadge.textContent="FAILED";
    setSystemState("offline","API ERROR");
    resultStack.innerHTML='<div class="empty-state"><strong>INFERENCE FAILED</strong><span>'+escapeHtml(e.message)+'</span></div>';
  }finally{
    clearInterval(timer);
    state.xhr=null;
    state.analyzing=false;
    analyzeBtn.disabled=!state.file;
    analyzeLabel.textContent=state.file?"ANALYZE AGAIN":"ANALYZE AUDIO";
  }
}

// ---- Results ----
function renderResults(payload){
  const results=Array.isArray(payload?.instruments)?payload.instruments:[];
  state.results=results;
  state.resultsAreDemo=!!payload?.demo;
  resultsCount.textContent=results.length+" DETECTED";
  $("#metricInstruments").textContent=results.length||"0";
  renderWaveWindows();
  if(!results.length){
    $("#metricTop").textContent="—";$("#metricScore").textContent="—";
    resultStack.innerHTML='<div class="empty-state"><strong>NO MATCHES ABOVE THRESHOLD</strong><span>The backend returned no instrument candidates after dynamic filtering.</span></div>';
    timelinePanel.classList.add("hidden");
    return;
  }
  const scores=results.map(normalizeConfidence),best=scores.reduce((b,x,i)=>x.pct>scores[b].pct?i:b,0);
  $("#metricTop").textContent=getInstrument(results[best]);
  $("#metricScore").textContent=scores[best].raw.toFixed(3);
  resultStack.innerHTML="";
  results.forEach((item,i)=>{
    const score=scores[i],name=getInstrument(item),accent=palette[i%palette.length],p=parseTimestamp(item.timestamp),card=document.createElement("div");
    card.className="result-card magnetic-tilt";
    card.style.setProperty("--accent",accent);
    if(p){card.dataset.start=p.start;card.dataset.end=p.end}
    card.innerHTML='<div class="result-main"><div class="result-top"><span class="result-name">'+escapeHtml(name)+'</span><span class="result-tag">MATCH #'+String(i+1).padStart(2,"0")+'</span></div><div class="score-line"><div class="score-track"><div class="score-fill"></div></div><span class="score-num">'+score.pct.toFixed(2)+'%</span></div><div class="result-sub"><span>raw '+score.raw.toFixed(4)+'</span><span>cosine similarity</span>'+(state.resultsAreDemo?'<span class="demo-tag">SAMPLE · DEMO</span>':'')+'</div></div>'
      +'<div class="result-side"><span class="timestamp">'+escapeHtml(item.timestamp||"Peak window unavailable")+'</span>'
      +(p?'<button class="mini-btn play-window" type="button">PLAY WINDOW</button>':"")+'</div>';
    if(p)card.querySelector(".play-window").addEventListener("click",()=>playWindow(p.start,p.end));
    resultStack.appendChild(card);
    motionAnimate(card,{opacity:[0,1],x:[-25,0],scale:[.97,1]},{duration:.5,delay:i*.08,easing:"ease-out"});
    motionAnimate(card.querySelector(".score-fill"),{width:["0%",score.pct+"%"]},{duration:1.05,delay:.18+i*.07,easing:"ease-out"});
    attachTilt(card);
  });
  renderTimeline(true);
}
function renderTimeline(animate=false){
  const results=state.results,span=songSpan(),rows=[];
  // Ruler: minor tick per 10-s window, labelled major ticks at a readable step.
  const step=span<=60?10:span<=180?30:span<=600?60:120;
  let ticks="";
  for(let t=0;t<=span+.01;t+=WINDOW_SEC){
    const major=t%step===0;
    ticks+='<i class="ruler-tick'+(major?" major":"")+'" style="left:'+(t/span*100)+'%">'+(major?"<span>"+formatTime(t)+"</span>":"")+"</i>";
  }
  rows.push('<div class="timeline-row ruler" id="timelineRuler"><div class="timeline-label">SONG · '+escapeHtml(formatTime(state.audioDuration||span))+'</div><div class="ruler-track">'+ticks+"</div></div>");
  results.forEach((item,i)=>{
    const p=parseTimestamp(item.timestamp);if(!p)return;
    const left=p.start/span*100,width=(p.end-p.start)/span*100;
    rows.push('<div class="timeline-row" data-start="'+p.start+'" data-end="'+p.end+'"><div class="timeline-label">'+escapeHtml(getInstrument(item))+"<small>"+escapeHtml(item.timestamp)+'</small></div><div><div class="timeline-track" style="--win:'+(WINDOW_SEC/span*100)+'%"><span class="timeline-hit" style="left:'+left+"%;width:"+width+"%;--accent:"+palette[i%palette.length]+'"></span></div></div></div>');
  });
  if(rows.length<2){timelinePanel.classList.add("hidden");return}
  timelinePanel.classList.remove("hidden");
  timelineEl.innerHTML=rows.join("")+'<div class="timeline-playhead" id="timelinePlayhead"></div>';
  timelineEl.querySelectorAll(".timeline-row[data-start]").forEach(row=>row.addEventListener("click",()=>playWindow(+row.dataset.start,+row.dataset.end)));
  const ruler=$("#timelineRuler .ruler-track");
  ruler.addEventListener("click",e=>{const r=ruler.getBoundingClientRect();state.stopAt=null;seekTo((e.clientX-r.left)/r.width*songSpan(),true)});
  updatePlayhead();
  if(animate)motionAnimate(timelinePanel,{opacity:[0,1],y:[15,0],scale:[.985,1]},{duration:.5,easing:"ease-out"});
}

// ---- Motion helpers ----
function attachTilt(el){
  el.addEventListener("mousemove",e=>{const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;motionAnimate(el,{rotateX:[y*-5],rotateY:[x*5],translateZ:[8]},{duration:.18,easing:"ease-out"})});
  el.addEventListener("mouseleave",()=>motionAnimate(el,{rotateX:[0],rotateY:[0],translateZ:[0]},{duration:.38,easing:"ease-out"}));
}
function resetConsole(){
  if(state.xhr)state.xhr.abort();
  if(state.demoAbort)state.demoAbort();
  state.analyzing=false;
  state.results=[];
  resetPipeline();
  clearFile();
  processPanel.classList.add("hidden");
  timelinePanel.classList.add("hidden");
  resultsCount.textContent="0 DETECTED";
  $("#metricInstruments").textContent="—";$("#metricTop").textContent="—";$("#metricScore").textContent="—";
  resultStack.innerHTML='<div class="empty-state"><span class="empty-orbit"></span><strong>NO ANALYSIS YET</strong><span>Upload audio and run the classifier to populate the matrix.</span></div>';
  analyzeLabel.textContent="ANALYZE AUDIO";
  setSystemState(state.connected?"online":"offline",state.demo?"DEMO MODE":state.connected?"API ONLINE":"API DISCONNECTED");
}
function attachGlobalMotion(){
  document.querySelectorAll(".magnetic").forEach(el=>{
    el.addEventListener("mousemove",e=>{const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;motionAnimate(el,{x:[x*8],y:[y*6]},{duration:.16,easing:"ease-out"})});
    el.addEventListener("mouseleave",()=>motionAnimate(el,{x:[0],y:[0]},{duration:.38,easing:"ease-out"}));
  });
  document.querySelectorAll(".magnetic-tilt").forEach(attachTilt);
}

// ---- Wiring ----
fileInput.addEventListener("change",e=>{
  const f=e.target.files?.[0];
  if(f){state.results=[];timelinePanel.classList.add("hidden")}
  handleFile(f);
});
["dragenter","dragover"].forEach(n=>dropzone.addEventListener(n,e=>{e.preventDefault();dropzone.classList.add("dragging")}));
["dragleave","drop"].forEach(n=>dropzone.addEventListener(n,e=>{e.preventDefault();dropzone.classList.remove("dragging")}));
dropzone.addEventListener("drop",e=>{const f=e.dataTransfer.files?.[0];if(f){state.results=[];timelinePanel.classList.add("hidden")}handleFile(f)});
clearFileBtn.addEventListener("click",()=>{state.results=[];timelinePanel.classList.add("hidden");clearFile()});
analyzeBtn.addEventListener("click",runAnalysis);
resetBtn.addEventListener("click",resetConsole);
openAccessBtn.addEventListener("click",()=>openAccess(true));
demoBtn.addEventListener("click",enterDemo);
accessDemoBtn.addEventListener("click",enterDemo);
exitDemoBtn.addEventListener("click",exitDemo);
demoSongBtn.addEventListener("click",loadDemoSong);
$("#closeAccessBtn").addEventListener("click",()=>openAccess(false));
accessForm.addEventListener("submit",e=>{e.preventDefault();connectAPI()});
$$(".rail-btn").forEach(b=>b.addEventListener("click",()=>{$$(".rail-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.getElementById(b.dataset.target)?.scrollIntoView({behavior:"smooth",block:"start"})}));
document.addEventListener("keydown",e=>{
  if(e.code!=="Space"||!state.audioUrl)return;
  if(e.target.closest("input,textarea,button,select,[contenteditable]"))return;
  e.preventDefault();togglePlay();
});
document.addEventListener("mousemove",e=>{if(!cursorGlow)return;cursorGlow.style.left=e.clientX+"px";cursorGlow.style.top=e.clientY+"px";cursorGlow.style.opacity=".55"});
let resizeTimer;
window.addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>drawWaveform(),120)});
attachGlobalMotion();
motionAnimate(".eyebrow",{opacity:[0,1],x:[-25,0]},{duration:.55,easing:"ease-out"});
motionAnimate("h1",{opacity:[0,1],y:[30,0],scale:[.97,1]},{duration:.75,delay:.08,easing:"ease-out"});
motionAnimate(".hero-copy",{opacity:[0,1],y:[18,0]},{duration:.55,delay:.18,easing:"ease-out"});
motionAnimate(".panel",{opacity:[0,1],y:[24,0],scale:[.985,1]},{duration:.6,delay:.1,easing:"ease-out"});
drawWaveform();
