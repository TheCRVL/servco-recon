import { useState, useEffect, useRef, useCallback } from "react";

// ─── NOTION CONFIG ────────────────────────────────────────────────────────────
// Credentials live in Vercel environment variables — never hardcoded
const NOTION_TOKEN = import.meta.env.VITE_NOTION_TOKEN || "";
const NOTION_DB_ID = import.meta.env.VITE_NOTION_DB_ID || "";

// Routes through our own Vercel serverless function — no CORS issues

// ─── PIPELINE STAGES ─────────────────────────────────────────────────────────
const STAGES = [
  { id: "fresh",       label: "Fresh",        color: "#1e3a5f", accent: "#38bdf8" },
  { id: "trade_hold",  label: "Trade Hold",   color: "#991b1b", accent: "#f87171" },
  { id: "title_work",  label: "Title Work",   color: "#6d28d9", accent: "#a78bfa" },
  { id: "reg_safety",  label: "Reg / Safety", color: "#92400e", accent: "#fbbf24" },
  { id: "service",     label: "In Service",   color: "#1e40af", accent: "#60a5fa" },
  { id: "body_shop",   label: "Body Shop",    color: "#0e7490", accent: "#22d3ee" },
  { id: "detail",      label: "Detail",       color: "#065f46", accent: "#34d399" },
  { id: "photos",      label: "Photos",       color: "#0f4c35", accent: "#6ee7b7" },
  { id: "frontline",   label: "Frontline ✓",  color: "#14532d", accent: "#4ade80" },
  { id: "sold",        label: "Sold 🏁",       color: "#1e1e2e", accent: "#818cf8" },
];
const PIPELINE_STAGES = STAGES.filter(s => s.id !== "sold");

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = [
  { id:"1", stockNo:"GVA05952", vin:"1FTBR1C80RKA05952", year:"2024", make:"Ford",   model:"Transit",      keys:"2", miles:"8,923",  acv:"$24,500", rw:"R", titleState:"HI", payoffBank:"Ally", acquiredDate:"2026-01-28", payoffSent:"2026-02-01", titleRcvd:"2026-02-08", sentDMV:"2026-02-09", spiTitle:"2026-02-18", regExp:"2026-12-01", scExp:"2026-11-15", inSvc:"2026-02-10", svcDone:"2026-02-13", bodyShop:"",         detail:"2026-02-14", pics:"2026-02-15", frontline:"2026-02-16", soldDate:"", stage:"frontline",  notes:[{text:"Detail and photos done. Frontline ready.",author:"Kapono",date:"2026-02-15"}] },
  { id:"2", stockNo:"WKA305P",  vin:"1N6BA1F42RN305002", year:"2016", make:"Nissan", model:"NV Passenger", keys:"1", miles:"83,422", acv:"$8,200",  rw:"R", titleState:"HI", payoffBank:"",     acquiredDate:"2026-01-20", payoffSent:"",          titleRcvd:"",          sentDMV:"",          spiTitle:"",          regExp:"2026-03-10", scExp:"2026-02-10", inSvc:"2026-02-20", svcDone:"",          bodyShop:"",         detail:"",           pics:"",          frontline:"",           soldDate:"", stage:"service",    notes:[{text:"Going in next available on heavy duty rack.",author:"Conrad",date:"2026-02-28"},{text:"HVAC heaterhose ordered from dealer.",author:"Lyie B",date:"2025-12-15"}] },
  { id:"3", stockNo:"SFB53904", vin:"1C6JJTBG5NL153904", year:"2022", make:"Jeep",   model:"Gladiator",    keys:"2", miles:"62,088", acv:"$31,000", rw:"R", titleState:"ML", payoffBank:"Ally", acquiredDate:"2026-02-10", payoffSent:"2026-02-12", titleRcvd:"",          sentDMV:"",          spiTitle:"",          regExp:"2026-01-15", scExp:"",           inSvc:"",           svcDone:"",          bodyShop:"",         detail:"",           pics:"",          frontline:"",           soldDate:"", stage:"title_work", notes:[{text:"Mainland bank — Ally. Payoff check mailed 2/12.",author:"Michelle P",date:"2026-02-12"}] },
  { id:"4", stockNo:"TYA22101", vin:"2T1BURHE0NC022101", year:"2023", make:"Toyota", model:"Corolla",      keys:"1", miles:"24,500", acv:"$18,750", rw:"R", titleState:"HI", payoffBank:"",     acquiredDate:"2026-02-15", payoffSent:"",          titleRcvd:"2026-02-22", sentDMV:"",          spiTitle:"",          regExp:"",           scExp:"2026-02-01", inSvc:"",           svcDone:"",          bodyShop:"",         detail:"",           pics:"",          frontline:"",           soldDate:"", stage:"reg_safety", notes:[{text:"Failed safety check. Needs fresh SC before detail.",author:"Kapono",date:"2026-02-25"}] },
  { id:"5", stockNo:"HNA88231", vin:"5FNYF6H09NB088231", year:"2021", make:"Honda",  model:"Pilot",        keys:"2", miles:"41,200", acv:"$22,000", rw:"R", titleState:"HI", payoffBank:"",     acquiredDate:"2026-02-20", payoffSent:"",          titleRcvd:"",          sentDMV:"",          spiTitle:"",          regExp:"",           scExp:"",           inSvc:"2026-02-26", svcDone:"2026-03-01", bodyShop:"2026-03-01",detail:"",           pics:"",          frontline:"",           soldDate:"", stage:"body_shop",  notes:[{text:"Minor bumper repair. Sent to sublet body shop.",author:"Tony",date:"2026-03-01"}] },
  { id:"6", stockNo:"MZA91045", vin:"JM3KFBCM1L0391045", year:"2020", make:"Mazda",  model:"CX-5",         keys:"1", miles:"55,100", acv:"$14,200", rw:"W", titleState:"HI", payoffBank:"",     acquiredDate:"2026-03-01", payoffSent:"",          titleRcvd:"",          sentDMV:"",          spiTitle:"",          regExp:"",           scExp:"",           inSvc:"",           svcDone:"",          bodyShop:"",         detail:"",           pics:"",          frontline:"",           soldDate:"", stage:"fresh",      notes:[{text:"Just acquired. Decide R or W by tomorrow.",author:"Kapono",date:"2026-03-01"}] },
  { id:"7", stockNo:"KIA77432",  vin:"5XXG14J27PG077432", year:"2023", make:"Kia",    model:"Sportage",     keys:"2", miles:"19,800", acv:"$26,500", rw:"R", titleState:"HI", payoffBank:"",     acquiredDate:"2026-01-10", payoffSent:"",          titleRcvd:"",          sentDMV:"",          spiTitle:"",          regExp:"",           scExp:"",           inSvc:"",           svcDone:"",          bodyShop:"",         detail:"",           pics:"",          frontline:"2026-02-01", soldDate:"2026-02-15", stage:"sold",       notes:[{text:"Sold 2/15. Deal funded.",author:"Kapono",date:"2026-02-15"}] },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const TODAY       = new Date(); TODAY.setHours(0,0,0,0);
const daysSince   = d => d ? Math.floor((Date.now()-new Date(d).getTime())/86400000) : null;
const fmtDate     = d => d ? new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "";
const stageOf     = id => STAGES.find(s=>s.id===id)||STAGES[0];
const soldDaysAgo = car => car.soldDate ? Math.floor((Date.now()-new Date(car.soldDate).getTime())/86400000) : null;
const isExpired   = d => { if(!d) return false; const e=new Date(d); e.setHours(0,0,0,0); return e<TODAY; };
const getDupVINs  = cars => {
  const seen={};
  cars.forEach(c=>{if(c.vin) seen[c.vin.toUpperCase()]=(seen[c.vin.toUpperCase()]||0)+1;});
  return new Set(Object.keys(seen).filter(v=>seen[v]>1));
};
const t2lBadge = days => {
  if(days===null) return {bg:"#1e293b",fg:"#64748b",label:"—"};
  if(days<=7)     return {bg:"#14532d",fg:"#4ade80",label:`${days}d`};
  if(days<=14)    return {bg:"#713f12",fg:"#fbbf24",label:`${days}d`};
  if(days<=21)    return {bg:"#7c2d12",fg:"#fb923c",label:`${days}d`};
                  return {bg:"#7f1d1d",fg:"#f87171",label:`${days}d ⚠`};
};

// ─── ISSUE TAGS ───────────────────────────────────────────────────────────────
function getIssueTags(car) {
  const tags = [];
  if (isExpired(car.regExp))          tags.push({ label:"REG EXP",        color:"#dc2626", bg:"#3f0e0e" });
  if (isExpired(car.scExp))           tags.push({ label:"SC EXP",         color:"#dc2626", bg:"#3f0e0e" });
  if (!car.titleRcvd)                 tags.push({ label:"NO TITLE RCVD",  color:"#d97706", bg:"#2d1b00" });
  if (!car.sentDMV && car.titleRcvd)  tags.push({ label:"DMV PENDING",    color:"#b45309", bg:"#2d1b00" });
  if (!car.spiTitle && car.sentDMV)   tags.push({ label:"SPI PENDING",    color:"#7c3aed", bg:"#1e0a3c" });
  if (car.keys === "1")               tags.push({ label:"1 KEY",          color:"#0369a1", bg:"#0c2340" });
  if (daysSince(car.acquiredDate) > 21 && !["frontline","sold"].includes(car.stage))
                                      tags.push({ label:"21d+ IN RECON",  color:"#b91c1c", bg:"#3f0e0e" });
  return tags;
}

// ─── CONFETTI ─────────────────────────────────────────────────────────────────
function Confetti({ active, onDone }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const pieces = Array.from({length:160}, () => ({
      x: Math.random()*canvas.width,
      y: Math.random()*canvas.height - canvas.height,
      r: Math.random()*8+4,
      d: Math.random()*160,
      color: ["#818cf8","#4ade80","#fbbf24","#f87171","#38bdf8","#e879f9"][Math.floor(Math.random()*6)],
      tilt: Math.random()*10-10,
      tiltAngle: 0,
      tiltSpeed: Math.random()*0.1+0.05,
    }));
    let frame = 0;
    let raf;
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      pieces.forEach(p => {
        p.tiltAngle += p.tiltSpeed;
        p.y += (Math.cos(p.d)+3+p.r/2)/2;
        p.x += Math.sin(frame/20)*2;
        p.tilt = Math.sin(p.tiltAngle)*15;
        ctx.beginPath();
        ctx.lineWidth = p.r/2;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x+p.tilt+p.r/4, p.y);
        ctx.lineTo(p.x+p.tilt, p.y+p.tilt+p.r/4);
        ctx.stroke();
      });
      frame++;
      if (frame < 180) raf = requestAnimationFrame(draw);
      else { ctx.clearRect(0,0,canvas.width,canvas.height); onDone(); }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  if (!active) return null;
  return <canvas ref={canvasRef} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999}} />;
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const input = (extra={}) => ({
  background:"#1e293b", border:"1px solid #334155", borderRadius:"6px",
  color:"#e2e8f0", padding:"7px 10px", fontSize:"13px",
  outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit", ...extra
});
const btn = (bg, border) => ({
  background:bg, border:`1px solid ${border}`, color:"#e2e8f0",
  borderRadius:"8px", padding:"8px 16px", cursor:"pointer",
  fontSize:"13px", fontWeight:600, fontFamily:"inherit"
});

// ─── NOTION API ───────────────────────────────────────────────────────────────
async function notionFetch(path, method="GET", body=null) {
  // Calls our Vercel serverless function — no CORS issues
  const url = `/api/notion?path=${encodeURIComponent(path.replace(/^\//, ""))}`;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (data.object === "error") throw new Error(`Notion: ${data.message}`);
  if (data.error) throw new Error(data.error);
  return data;
}
function carToNotion(car) {
  const rt = v => ({rich_text:[{text:{content:v||""}}]});
  const dt = v => v ? {date:{start:v}} : {date:null};
  return {
    "Stock No":      {title:[{text:{content:car.stockNo||""}}]},
    "VIN":           rt(car.vin), "Year": rt(car.year), "Make": rt(car.make), "Model": rt(car.model),
    "Keys":          {select:{name:car.keys||"1"}}, "Miles": rt(car.miles),
    "R/W":           {select:{name:car.rw||"R"}}, "Title State": {select:{name:car.titleState||"HI"}},
    "Payoff Bank":   rt(car.payoffBank), "ACV": rt(car.acv),
    "Stage":         {select:{name:car.stage||"fresh"}},
    "Acquired Date": dt(car.acquiredDate), "Payoff Sent": dt(car.payoffSent),
    "Title RCVD":    dt(car.titleRcvd),   "Sent DMV":    dt(car.sentDMV),
    "SPI Title RCVD":dt(car.spiTitle),    "Reg Exp":     dt(car.regExp),
    "SC Exp":        dt(car.scExp),       "In Svc":      dt(car.inSvc),
    "Svc Done":      dt(car.svcDone),     "Body Shop":   dt(car.bodyShop),
    "Detail":        dt(car.detail),      "Pics":        dt(car.pics),
    "Frontline":     dt(car.frontline),   "Sold Date":   dt(car.soldDate),
  };
}

// ─── STATS BAR ────────────────────────────────────────────────────────────────
function StatsBar({ cars }) {
  const frontline  = cars.filter(c=>c.stage==="frontline").length;
  const sold       = cars.filter(c=>c.stage==="sold").length;
  const stuck      = cars.filter(c=>daysSince(c.acquiredDate)>21&&!["frontline","sold"].includes(c.stage)).length;
  const inProgress = cars.filter(c=>!["frontline","fresh","sold"].includes(c.stage)).length;
  const doneCars   = cars.filter(c=>c.frontline&&c.acquiredDate);
  const avgT2L     = doneCars.length ? Math.round(doneCars.reduce((s,c)=>s+daysSince(c.acquiredDate),0)/doneCars.length) : null;
  const Stat = ({label,value,color}) => (
    <div style={{textAlign:"center",padding:"0 20px"}}>
      <div style={{fontSize:"28px",fontWeight:900,color,fontFamily:"'DM Mono',monospace"}}>{value}</div>
      <div style={{fontSize:"10px",color:"#475569",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginTop:"3px"}}>{label}</div>
    </div>
  );
  return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",background:"#0a0f1a",border:"1px solid #1e293b",borderRadius:"12px",padding:"16px",marginBottom:"20px",flexWrap:"wrap",gap:"4px"}}>
      <Stat label="Total"         value={cars.length}              color="#94a3b8"/>
      <div style={{width:"1px",height:"36px",background:"#1e293b"}}/>
      <Stat label="Frontline"     value={frontline}                color="#4ade80"/>
      <div style={{width:"1px",height:"36px",background:"#1e293b"}}/>
      <Stat label="Sold"          value={sold}                     color="#818cf8"/>
      <div style={{width:"1px",height:"36px",background:"#1e293b"}}/>
      <Stat label="In Progress"   value={inProgress}               color="#60a5fa"/>
      <div style={{width:"1px",height:"36px",background:"#1e293b"}}/>
      <Stat label="Stuck 21d+"    value={stuck}                    color="#f87171"/>
      <div style={{width:"1px",height:"36px",background:"#1e293b"}}/>
      <Stat label="Avg T2L"       value={avgT2L?`${avgT2L}d`:"—"} color="#fbbf24"/>
    </div>
  );
}

// ─── NOTE THREAD ─────────────────────────────────────────────────────────────
function NoteThread({ notes, onAdd }) {
  const [text,setText]     = useState("");
  const [author,setAuthor] = useState("");
  return (
    <div style={{marginTop:"12px"}}>
      <div style={{fontSize:"10px",fontWeight:700,color:"#64748b",letterSpacing:"0.1em",marginBottom:"8px"}}>NOTES LOG</div>
      <div style={{display:"flex",flexDirection:"column",gap:"6px",maxHeight:"140px",overflowY:"auto",marginBottom:"10px"}}>
        {notes.length===0 && <div style={{color:"#334155",fontSize:"12px",fontStyle:"italic"}}>No notes yet.</div>}
        {notes.map((n,i)=>(
          <div key={i} style={{background:"#060b14",border:"1px solid #1e293b",borderRadius:"6px",padding:"8px 10px"}}>
            <div style={{fontSize:"11px",color:"#94a3b8",marginBottom:"3px"}}>
              <span style={{color:"#e2e8f0",fontWeight:600}}>{n.author}</span> · {fmtDate(n.date)}
            </div>
            <div style={{fontSize:"13px",color:"#cbd5e1",lineHeight:"1.5"}}>{n.text}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
        <input placeholder="Name" value={author} onChange={e=>setAuthor(e.target.value)} style={input({width:"90px",minWidth:"80px",flex:"0 0 90px"})}/>
        <input placeholder="Add a note…" value={text} onChange={e=>setText(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&text&&author){onAdd({text,author,date:new Date().toISOString().split("T")[0]});setText("");}}}
          style={input({flex:"1",minWidth:"120px"})}/>
        <button onClick={()=>{if(text&&author){onAdd({text,author,date:new Date().toISOString().split("T")[0]});setText("");}}} style={btn("#1e40af","#3b82f6")}>Add</button>
      </div>
    </div>
  );
}

// ─── MODAL FIELD COMPONENTS (defined outside modal to prevent focus loss) ────
function ModalField({label, fkey, type="text", form, set}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
      <label style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</label>
      <input type={type} value={form[fkey]||""} onChange={e=>set(fkey,e.target.value)} style={input()}/>
    </div>
  );
}
function ModalSelect({label, fkey, options, form, set}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
      <label style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</label>
      <select value={form[fkey]||""} onChange={e=>set(fkey,e.target.value)} style={input()}>
        {options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
function ModalExpField({label, fkey, form, set}) {
  const expired = isExpired(form[fkey]);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
      <label style={{fontSize:"10px",color:expired?"#f87171":"#64748b",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>
        {label}{expired?" ⚠ EXPIRED":""}
      </label>
      <input type="date" value={form[fkey]||""} onChange={e=>set(fkey,e.target.value)}
        style={{...input(),border:expired?"1px solid #dc2626":"1px solid #334155",color:expired?"#f87171":"#e2e8f0",background:expired?"#3f0e0e":"#1e293b"}}/>
    </div>
  );
}

// ─── CAR DETAIL MODAL ────────────────────────────────────────────────────────
function CarModal({ car, onClose, onSave, onDelete, onSold }) {
  const [form, setForm]                   = useState({...car});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [regSafetyWarn, setRegSafetyWarn] = useState(false);

  // Auto-stage logic: when certain date fields are set, advance the stage intelligently
  const autoStage = (key, val, currentForm) => {
    const f = {...currentForm, [key]: val};
    // Only auto-advance — never auto-retreat from a later stage
    const stageOrder = ["fresh","trade_hold","title_work","reg_safety","service","body_shop","detail","photos","frontline","sold"];
    const currentIdx = stageOrder.indexOf(f.stage);
    let newStage = f.stage;

    if (key === "sentDMV" && val)    newStage = "title_work";
    if (key === "payoffSent" && val) newStage = "title_work";
    if (key === "regExp" || key === "scExp") {
      // If either exp date is in the past (or missing), suggest reg/safety
      const regExp = key === "regExp" ? val : f.regExp;
      const scExp  = key === "scExp"  ? val : f.scExp;
      if (isExpired(regExp) || isExpired(scExp)) newStage = "reg_safety";
    }
    if (key === "inSvc" && val)     newStage = "service";
    if (key === "svcDone" && val)   newStage = "detail";
    if (key === "pics" && val)      newStage = "photos";
    if (key === "frontline" && val) newStage = "frontline";
    if (key === "soldDate" && val)  newStage = "sold";

    // Only advance, never retreat automatically
    const newIdx = stageOrder.indexOf(newStage);
    if (newIdx > currentIdx) f.stage = newStage;
    return f;
  };

  const set = (k, v) => setForm(f => autoStage(k, v, f));

  const handleStageClick = (stageId) => {
    // Allow clicking any stage manually — including moving back from sold
    if (stageId === "reg_safety") {
      const regOk = form.regExp && !isExpired(form.regExp);
      const scOk  = form.scExp  && !isExpired(form.scExp);
      if (regOk && scOk) { setRegSafetyWarn(true); return; }
    }
    setForm(f => ({...f, stage: stageId}));
    setRegSafetyWarn(false);
  };

  // Use ModalField/ModalSelect/ModalExpField directly with form+set props

  const days  = daysSince(form.acquiredDate);
  const badge = t2lBadge(days);
  const tags  = getIssueTags(form);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:1000,padding:"12px",overflowY:"auto"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:"12px",width:"100%",maxWidth:"740px",padding:"20px",boxShadow:"0 30px 80px rgba(0,0,0,0.9)",margin:"auto"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px",gap:"10px"}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:"20px",fontWeight:800,color:"#f1f5f9",fontFamily:"'DM Sans',sans-serif",lineHeight:"1.2"}}>{form.year} {form.make} {form.model}</div>
            <div style={{fontSize:"11px",color:"#64748b",marginTop:"3px",fontFamily:"monospace",wordBreak:"break-all"}}>#{form.stockNo}{form.vin?` · ${form.vin}`:""} · {form.miles} mi</div>
          </div>
          <div style={{display:"flex",gap:"6px",alignItems:"center",flexShrink:0}}>
            <span style={{background:badge.bg,color:badge.fg,fontSize:"11px",fontWeight:700,fontFamily:"monospace",padding:"3px 8px",borderRadius:"5px",whiteSpace:"nowrap"}}>T2L {badge.label}</span>
            <button onClick={onClose} style={{background:"none",border:"1px solid #334155",color:"#94a3b8",borderRadius:"6px",padding:"6px 10px",cursor:"pointer",fontSize:"13px"}}>✕</button>
          </div>
        </div>

        {/* Issue Tags */}
        {tags.length > 0 && (
          <div style={{display:"flex",flexWrap:"wrap",gap:"5px",marginBottom:"14px"}}>
            {tags.map((t,i)=>(
              <span key={i} style={{background:t.bg,color:t.color,border:`1px solid ${t.color}44`,fontSize:"10px",fontWeight:800,padding:"3px 8px",borderRadius:"4px",letterSpacing:"0.06em"}}>
                {t.label}
              </span>
            ))}
          </div>
        )}

        {/* Stage */}
        <div style={{marginBottom:"16px"}}>
          <div style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",marginBottom:"8px"}}>STAGE</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
            {STAGES.map(st=>(
              <button key={st.id} onClick={()=>handleStageClick(st.id)} style={{
                background:form.stage===st.id?st.color:"#1e293b",
                color:form.stage===st.id?"#fff":"#64748b",
                border:`1px solid ${form.stage===st.id?st.accent:"#334155"}`,
                borderRadius:"6px",padding:"5px 10px",cursor:"pointer",
                fontSize:"11px",fontWeight:600,transition:"all 0.12s"
              }}>{st.label}</button>
            ))}
          </div>
          {/* Reg/Safety Warning */}
          {regSafetyWarn && (
            <div style={{marginTop:"10px",background:"#1c1600",border:"1px solid #fbbf24",borderRadius:"8px",padding:"12px 14px"}}>
              <div style={{fontSize:"12px",color:"#fde68a",fontWeight:700,marginBottom:"8px"}}>⚠ Reg and Safety Check appear up to date — did you mean to move here?</div>
              <div style={{display:"flex",gap:"8px"}}>
                <button onClick={()=>{set("stage","reg_safety");setRegSafetyWarn(false);}} style={{...btn("#92400e","#fbbf24"),fontSize:"12px",padding:"5px 12px",color:"#fde68a"}}>Yes, move to Reg / Safety</button>
                <button onClick={()=>setRegSafetyWarn(false)} style={{...btn("#1e293b","#334155"),fontSize:"12px",padding:"5px 12px"}}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Core fields */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:"10px",marginBottom:"16px"}}>
          <ModalField label="Stock No" fkey="stockNo" form={form} set={set}/>
          <div style={{display:"flex",flexDirection:"column",gap:"4px",gridColumn:"span 2"}}>
            <label style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>VIN</label>
            <input value={form.vin||""} onChange={e=>set("vin",e.target.value)}
              style={{...input(),borderColor:form.vin&&form.vin.length>0&&form.vin.length<17?"#ea580c":"#334155"}}/>
            {form.vin&&form.vin.length>0&&form.vin.length<17&&(
              <div style={{fontSize:"11px",color:"#fb923c",fontWeight:700}}>⚠ {form.vin.length}/17 characters</div>
            )}
          </div>
          <ModalField label="Year"  fkey="year" form={form} set={set}/>
          <ModalField label="Make"  fkey="make" form={form} set={set}/>
          <ModalField label="Model" fkey="model" form={form} set={set}/>
          <ModalField label="Miles" fkey="miles" form={form} set={set}/>
          <ModalField label="ACV"   fkey="acv" form={form} set={set}/>
          <ModalSelect label="Keys"        fkey="keys"       options={[{v:"1",l:"1 Key"},{v:"2",l:"2 Keys"}]} form={form} set={set}/>
          <ModalSelect label="Retail/Whsl" fkey="rw"         options={[{v:"R",l:"Retail"},{v:"W",l:"Wholesale"}]} form={form} set={set}/>
          <ModalSelect label="Title State" fkey="titleState" options={[{v:"HI",l:"Hawaii (HI)"},{v:"ML",l:"Mainland (ML)"}]} form={form} set={set}/>
        </div>

        {/* Timeline */}
        <div style={{borderTop:"1px solid #1e293b",paddingTop:"14px",marginBottom:"14px"}}>
          <div style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.1em",marginBottom:"10px"}}>TIMELINE</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"10px"}}>
            <ModalField label="Acquired"      fkey="acquiredDate"  type="date" form={form} set={set}/>
            <ModalField label="Payoff Bank"   fkey="payoffBank" form={form} set={set}/>
            <ModalField label="Payoff Sent"   fkey="payoffSent"    type="date" form={form} set={set}/>
            <ModalField label="Title RCVD"    fkey="titleRcvd"     type="date" form={form} set={set}/>
            <ModalField label="Sent DMV"      fkey="sentDMV"       type="date" form={form} set={set}/>
            <ModalField label="SPI Title"     fkey="spiTitle"      type="date" form={form} set={set}/>
            <ModalExpField label="Reg Exp"       fkey="regExp" form={form} set={set}/>
            <ModalExpField label="SC Exp"        fkey="scExp" form={form} set={set}/>
            <ModalField label="In Service"    fkey="inSvc"         type="date" form={form} set={set}/>
            <ModalField label="Service Done"  fkey="svcDone"       type="date" form={form} set={set}/>
            <ModalField label="Body Shop"     fkey="bodyShop"      type="date" form={form} set={set}/>
            <ModalField label="Detail"        fkey="detail"        type="date" form={form} set={set}/>
            <ModalField label="Photos"        fkey="pics"          type="date" form={form} set={set}/>
            <ModalField label="Frontline"     fkey="frontline"     type="date" form={form} set={set}/>
            <ModalField label="Sold Date"     fkey="soldDate"      type="date" form={form} set={set}/>
          </div>
        </div>

        {/* Notes */}
        <div style={{borderTop:"1px solid #1e293b",paddingTop:"14px"}}>
          <NoteThread notes={form.notes||[]} onAdd={note=>setForm(f=>({...f,notes:[...(f.notes||[]),note]}))}/>
        </div>

        {/* Actions */}
        {confirmDelete ? (
          <div style={{marginTop:"16px",background:"#3f0e0e",border:"1px solid #dc2626",borderRadius:"8px",padding:"12px 14px"}}>
            <div style={{fontSize:"13px",color:"#fca5a5",fontWeight:600,marginBottom:"10px"}}>Delete <strong>{form.year} {form.make} {form.model}</strong> (#{form.stockNo})? This cannot be undone.</div>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
              <button onClick={()=>setConfirmDelete(false)} style={btn("#1e293b","#334155")}>Cancel</button>
              <button onClick={()=>{onDelete(form.id);onClose();}} style={{...btn("#7f1d1d","#dc2626"),color:"#fca5a5"}}>Yes, Delete</button>
            </div>
          </div>
        ) : (
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"16px",flexWrap:"wrap",gap:"8px"}}>
            <button onClick={()=>setConfirmDelete(true)} style={{...btn("#1e293b","#334155"),color:"#f87171",fontSize:"12px"}}>🗑 Delete</button>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
              <button onClick={onClose} style={btn("#1e293b","#334155")}>Cancel</button>
              <button onClick={()=>{onSave(form);onClose();}} style={btn("#15803d","#4ade80")}>Save Changes</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ADD CAR MODAL ────────────────────────────────────────────────────────────
function AddCarModal({ onClose, onAdd, existingVINs }) {
  const blank = {id:Date.now().toString(),stockNo:"",vin:"",year:"",make:"",model:"",keys:"1",miles:"",acv:"",rw:"R",titleState:"HI",payoffBank:"",acquiredDate:new Date().toISOString().split("T")[0],stage:"fresh",notes:[],payoffSent:"",titleRcvd:"",sentDMV:"",spiTitle:"",regExp:"",scExp:"",inSvc:"",svcDone:"",bodyShop:"",detail:"",pics:"",frontline:"",soldDate:""};
  const [form,setForm] = useState(blank);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const vinDup = form.vin&&form.vin.length>5&&existingVINs.has(form.vin.toUpperCase());

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:1000,padding:"12px",overflowY:"auto"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:"12px",width:"100%",maxWidth:"540px",padding:"20px",boxShadow:"0 30px 80px rgba(0,0,0,0.9)",margin:"auto"}}>
        <div style={{fontSize:"20px",fontWeight:800,color:"#f1f5f9",fontFamily:"'DM Sans',sans-serif",marginBottom:"16px"}}>Add New Vehicle</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"10px",marginBottom:"14px"}}>
          {/* Static fields — avoids re-render focus loss caused by .map() creating new components */}
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Stock No</label>
            <input value={form.stockNo||""} onChange={e=>set("stockNo",e.target.value)} style={input()}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Year</label>
            <input value={form.year||""} onChange={e=>set("year",e.target.value)} style={input()}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Make</label>
            <input value={form.make||""} onChange={e=>set("make",e.target.value)} style={input()}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Model</label>
            <input value={form.model||""} onChange={e=>set("model",e.target.value)} style={input()}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Miles</label>
            <input value={form.miles||""} onChange={e=>set("miles",e.target.value)} style={input()}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>ACV</label>
            <input value={form.acv||""} onChange={e=>set("acv",e.target.value)} style={input()}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px",gridColumn:"1 / -1"}}>
            <label style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>VIN</label>
            <input value={form.vin||""} onChange={e=>set("vin",e.target.value)}
              style={{...input(),borderColor:form.vin&&form.vin.length>0&&form.vin.length<17?"#ea580c":"#334155"}}
              placeholder="17-character VIN"/>
            {form.vin&&form.vin.length>0&&form.vin.length<17&&(
              <div style={{fontSize:"11px",color:"#fb923c",fontWeight:700,marginTop:"2px"}}>⚠ VIN must be 17 characters — currently {form.vin.length}/17</div>
            )}
            {form.vin&&form.vin.length===17&&vinDup&&(
              <div style={{fontSize:"11px",color:"#fb923c",fontWeight:700,marginTop:"2px"}}>⚠ This VIN already exists in inventory — possible duplicate or re-acquired vehicle.</div>
            )}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Acquired</label>
            <input type="date" value={form.acquiredDate} onChange={e=>set("acquiredDate",e.target.value)} style={input()}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Title State</label>
            <select value={form.titleState} onChange={e=>set("titleState",e.target.value)} style={input()}>
              <option value="HI">Hawaii (HI)</option><option value="ML">Mainland (ML)</option>
            </select>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Keys</label>
            <select value={form.keys} onChange={e=>set("keys",e.target.value)} style={input()}>
              <option value="1">1 Key</option><option value="2">2 Keys</option>
            </select>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Retail / Whsl</label>
            <select value={form.rw} onChange={e=>set("rw",e.target.value)} style={input()}>
              <option value="R">Retail</option><option value="W">Wholesale</option>
            </select>
          </div>
        </div>
        <div style={{marginBottom:"14px"}}>
          <div style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",marginBottom:"8px"}}>INITIAL STAGE</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
            {STAGES.map(s=>(
              <button key={s.id} onClick={()=>set("stage",s.id)} style={{background:form.stage===s.id?s.color:"#1e293b",color:form.stage===s.id?"#fff":"#64748b",border:`1px solid ${form.stage===s.id?s.accent:"#334155"}`,borderRadius:"6px",padding:"5px 10px",cursor:"pointer",fontSize:"11px",fontWeight:600}}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:"8px",flexWrap:"wrap"}}>
          <button onClick={onClose} style={btn("#1e293b","#334155")}>Cancel</button>
          <button onClick={()=>{if(form.stockNo&&form.make){onAdd(form);onClose();}}} style={btn("#15803d","#4ade80")}>Add Vehicle</button>
        </div>
      </div>
    </div>
  );
}

// ─── KANBAN CARD ─────────────────────────────────────────────────────────────
function KanbanCard({ car, stage, onCarClick, isDupVIN }) {
  const days  = daysSince(car.acquiredDate);
  const badge = t2lBadge(days);
  const tags  = getIssueTags(car);
  return (
    <div onClick={()=>onCarClick(car)}
      style={{background:"#0f172a",border:isDupVIN?"1px solid #ea580c":"1px solid #1e293b",borderLeft:`3px solid ${isDupVIN?"#ea580c":stage.accent}`,borderRadius:"8px",padding:"10px",cursor:"pointer",transition:"background 0.12s"}}
      onMouseEnter={e=>e.currentTarget.style.background="#1e293b"}
      onMouseLeave={e=>e.currentTarget.style.background="#0f172a"}>
      <div style={{fontSize:"13px",fontWeight:700,color:"#f1f5f9",marginBottom:"2px",fontFamily:"'DM Sans',sans-serif",lineHeight:"1.2"}}>{car.year} {car.make} {car.model}</div>
      <div style={{fontSize:"11px",color:"#475569",marginBottom:"4px",fontFamily:"monospace"}}>#{car.stockNo}</div>
      {car.acv&&<div style={{fontSize:"11px",color:"#fbbf24",marginBottom:"4px",fontWeight:700}}>ACV {car.acv}</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom: tags.length>0?"6px":"0"}}>
        <span style={{fontSize:"11px",color:isDupVIN?"#ea580c":"#475569",fontFamily:"monospace",fontWeight:isDupVIN?700:400}}>
          {car.vin?car.vin.slice(-6):"—"}{isDupVIN?" ⚠ DUP":""}
        </span>
        <span style={{background:badge.bg,color:badge.fg,fontSize:"10px",fontWeight:700,fontFamily:"monospace",padding:"2px 6px",borderRadius:"4px"}}>{badge.label}</span>
      </div>
      {/* Issue tags on card */}
      {tags.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:"3px",marginTop:"4px"}}>
          {tags.map((t,i)=>(
            <span key={i} style={{background:t.bg,color:t.color,fontSize:"9px",fontWeight:800,padding:"2px 5px",borderRadius:"3px",letterSpacing:"0.04em"}}>{t.label}</span>
          ))}
        </div>
      )}
      {car.notes?.length>0&&(
        <div style={{marginTop:"6px",fontSize:"11px",color:"#334155",borderTop:"1px solid #1e293b",paddingTop:"5px",fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          💬 {car.notes[car.notes.length-1].text}
        </div>
      )}
    </div>
  );
}

// ─── DRAG SCROLL HOOK ────────────────────────────────────────────────────────
function useDragScroll() {
  const ref = useRef(null);
  const dragging = useRef(false);
  const startX   = useRef(0);
  const scrollX  = useRef(0);
  const moved    = useRef(false);

  const onMouseDown = e => {
    // Only left click, ignore clicks on interactive elements
    if (e.button !== 0) return;
    if (["INPUT","SELECT","BUTTON","TEXTAREA"].includes(e.target.tagName)) return;
    dragging.current = true;
    moved.current    = false;
    startX.current   = e.pageX - ref.current.offsetLeft;
    scrollX.current  = ref.current.scrollLeft;
    ref.current.style.cursor = "grabbing";
    ref.current.style.userSelect = "none";
  };
  const onMouseMove = e => {
    if (!dragging.current) return;
    const x    = e.pageX - ref.current.offsetLeft;
    const walk = x - startX.current;
    if (Math.abs(walk) > 4) moved.current = true;
    ref.current.scrollLeft = scrollX.current - walk;
  };
  const onMouseUp = () => {
    dragging.current = false;
    if (ref.current) {
      ref.current.style.cursor = "grab";
      ref.current.style.userSelect = "";
    }
  };
  // Returns props to spread onto the scroll container
  // Also returns moved ref so child click handlers can ignore drag-ends
  return { ref, moved, onMouseDown, onMouseMove, onMouseUp, onMouseLeave: onMouseUp };
}

// ─── KANBAN VIEW ─────────────────────────────────────────────────────────────
function KanbanView({ cars, onCarClick, dupVINs }) {
  const soldCars     = cars.filter(c=>c.stage==="sold");
  const pipelineCars = cars.filter(c=>c.stage!=="sold");
  const drag = useDragScroll();
  // Wrap onCarClick to ignore drag-ends
  const handleCardClick = car => { if (!drag.moved.current) onCarClick(car); };
  return (
    <div>
      <div ref={drag.ref} onMouseDown={drag.onMouseDown} onMouseMove={drag.onMouseMove} onMouseUp={drag.onMouseUp} onMouseLeave={drag.onMouseLeave}
        style={{display:"flex",gap:"10px",overflowX:"auto",padding:"4px 0 16px",minHeight:"400px",cursor:"grab",scrollbarWidth:"thin"}}>
        {PIPELINE_STAGES.map(stage=>{
          const col = pipelineCars.filter(c=>c.stage===stage.id);
          return (
            <div key={stage.id} style={{minWidth:"190px",width:"190px",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:stage.color+"44",borderRadius:"8px 8px 0 0",borderBottom:`2px solid ${stage.accent}`,marginBottom:"8px"}}>
                <span style={{fontSize:"10px",fontWeight:800,color:stage.accent,letterSpacing:"0.08em",textTransform:"uppercase"}}>{stage.label}</span>
                <span style={{background:stage.accent+"33",color:stage.accent,borderRadius:"12px",fontSize:"11px",fontWeight:700,padding:"1px 6px"}}>{col.length}</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
                {col.map(car=><KanbanCard key={car.id} car={car} stage={stage} onCarClick={handleCardClick} isDupVIN={!!(car.vin&&dupVINs.has(car.vin.toUpperCase()))}/>)}
                {col.length===0&&<div style={{textAlign:"center",color:"#1e293b",fontSize:"12px",padding:"20px 0"}}>—</div>}
              </div>
            </div>
          );
        })}
      </div>
      {soldCars.length>0&&(
        <div style={{marginTop:"20px",borderTop:"1px solid #1e293b",paddingTop:"16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"12px"}}>
            <span style={{fontSize:"12px",fontWeight:800,color:"#818cf8",letterSpacing:"0.1em",textTransform:"uppercase"}}>Sold 🏁</span>
            <span style={{background:"#818cf833",color:"#818cf8",borderRadius:"12px",fontSize:"11px",fontWeight:700,padding:"1px 8px"}}>{soldCars.length}</span>
            <span style={{fontSize:"11px",color:"#334155"}}>Auto-removes after 60 days</span>
          </div>
          <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
            {soldCars.map(car=>{
              const daysAgo = soldDaysAgo(car);
              const daysLeft = daysAgo!==null?60-daysAgo:null;
              return (
                <div key={car.id} onClick={()=>handleCardClick(car)}
                  style={{background:"#0f172a",border:"1px solid #1e293b",borderLeft:"3px solid #818cf8",borderRadius:"8px",padding:"10px",cursor:"pointer",width:"190px",transition:"background 0.12s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#1e293b"}
                  onMouseLeave={e=>e.currentTarget.style.background="#0f172a"}>
                  <div style={{fontSize:"13px",fontWeight:700,color:"#94a3b8",marginBottom:"2px",fontFamily:"'DM Sans',sans-serif"}}>{car.year} {car.make} {car.model}</div>
                  <div style={{fontSize:"11px",color:"#334155",marginBottom:"4px",fontFamily:"monospace"}}>#{car.stockNo}</div>
                  {car.acv&&<div style={{fontSize:"11px",color:"#fbbf2466",marginBottom:"3px"}}>ACV {car.acv}</div>}
                  <div style={{fontSize:"10px",color:"#4c1d95",fontWeight:700}}>{daysLeft!==null?`Purges in ${daysLeft}d`:"Sold"}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TABLE VIEW ───────────────────────────────────────────────────────────────
function TableView({ cars, onCarClick, dupVINs }) {
  const headers = ["Stock No","VIN","Year","Make","Model","Miles","ACV","R/W","Title","Keys","Issues","Payoff Sent","Title RCVD","Sent DMV","SPI Title","Reg Exp","SC Exp","In Svc","Svc Done","Body Shop","Detail","Photos","Frontline","Sold","T2L","Stage"];
  const dateFields = ["payoffSent","titleRcvd","sentDMV","spiTitle","regExp","scExp","inSvc","svcDone","bodyShop","detail","pics","frontline","soldDate"];
  const expiredFields = new Set(["regExp","scExp"]);
  const drag = useDragScroll();
  return (
    <div ref={drag.ref} onMouseDown={drag.onMouseDown} onMouseMove={drag.onMouseMove} onMouseUp={drag.onMouseUp} onMouseLeave={drag.onMouseLeave}
      style={{overflowX:"auto",WebkitOverflowScrolling:"touch",cursor:"grab",scrollbarWidth:"thin"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px",minWidth:"900px"}}>
        <thead>
          <tr>{headers.map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#475569",fontWeight:700,fontSize:"10px",letterSpacing:"0.08em",textTransform:"uppercase",borderBottom:"1px solid #1e293b",whiteSpace:"nowrap"}}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {cars.map((car,i)=>{
            const days  = daysSince(car.acquiredDate);
            const badge = t2lBadge(days);
            const s     = stageOf(car.stage);
            const isD   = !!(car.vin&&dupVINs.has(car.vin.toUpperCase()));
            const tags  = getIssueTags(car);
            return (
              <tr key={car.id} onClick={()=>{ if(!drag.moved.current) onCarClick(car); }}
                style={{cursor:"pointer",background:i%2===0?"#0a0f1a":"#0c1120",borderBottom:"1px solid #0f172a"}}
                onMouseEnter={e=>e.currentTarget.style.background="#1e293b"}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#0a0f1a":"#0c1120"}>
                <td style={{padding:"8px 10px",fontFamily:"monospace",color:"#94a3b8",whiteSpace:"nowrap"}}>{car.stockNo}</td>
                <td style={{padding:"8px 10px",fontFamily:"monospace",color:isD?"#ea580c":"#475569",whiteSpace:"nowrap",fontSize:"11px",fontWeight:isD?700:400,background:isD?"#431407":"transparent"}}>
                  {car.vin||"—"}{isD?" ⚠":""}
                </td>
                <td style={{padding:"8px 10px",color:"#cbd5e1"}}>{car.year}</td>
                <td style={{padding:"8px 10px",color:"#e2e8f0",fontWeight:600,whiteSpace:"nowrap"}}>{car.make}</td>
                <td style={{padding:"8px 10px",color:"#cbd5e1",whiteSpace:"nowrap"}}>{car.model}</td>
                <td style={{padding:"8px 10px",color:"#94a3b8",textAlign:"right"}}>{car.miles}</td>
                <td style={{padding:"8px 10px",color:"#fbbf24",fontWeight:600,whiteSpace:"nowrap"}}>{car.acv||"—"}</td>
                <td style={{padding:"8px 10px",color:car.rw==="R"?"#4ade80":"#fb923c",fontWeight:700}}>{car.rw}</td>
                <td style={{padding:"8px 10px",color:car.titleState==="ML"?"#f87171":"#94a3b8"}}>{car.titleState}</td>
                <td style={{padding:"8px 10px",color:"#94a3b8",textAlign:"center"}}>{car.keys}</td>
                <td style={{padding:"6px 10px"}}>
                  <div style={{display:"flex",flexWrap:"wrap",gap:"3px"}}>
                    {tags.map((t,idx)=>(
                      <span key={idx} style={{background:t.bg,color:t.color,fontSize:"9px",fontWeight:800,padding:"2px 5px",borderRadius:"3px",whiteSpace:"nowrap"}}>{t.label}</span>
                    ))}
                  </div>
                </td>
                {dateFields.map(k=>{
                  const expired = expiredFields.has(k)&&isExpired(car[k]);
                  return (
                    <td key={k} style={{padding:"8px 10px",color:expired?"#f87171":car[k]?"#60a5fa":"#1e293b",background:expired?"#3f0e0e":"transparent",fontFamily:"monospace",whiteSpace:"nowrap",fontWeight:expired?700:400}}>
                      {fmtDate(car[k])||"—"}{expired?" ⚠":""}
                    </td>
                  );
                })}
                <td style={{padding:"8px 10px"}}>
                  <span style={{background:badge.bg,color:badge.fg,fontSize:"10px",fontWeight:700,fontFamily:"monospace",padding:"2px 6px",borderRadius:"4px"}}>{badge.label}</span>
                </td>
                <td style={{padding:"8px 10px"}}>
                  <span style={{background:s.color+"33",color:s.accent,border:`1px solid ${s.color}`,fontSize:"10px",fontWeight:700,padding:"2px 8px",borderRadius:"3px",textTransform:"uppercase",whiteSpace:"nowrap"}}>{s.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function ReconDashboard() {
  const [cars, setCars]               = useState(MOCK);
  const [view, setView]               = useState("kanban");
  const [selected, setSelected]       = useState(null);
  const [adding, setAdding]           = useState(false);
  const [search, setSearch]           = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [rwFilter, setRwFilter]       = useState("all");
  const [notionMode, setNotionMode]   = useState(false);
  const [status, setStatus]           = useState("");
  const [loading, setLoading]         = useState(false);
  const [confetti, setConfetti]       = useState(false);

  const toast = msg => { setStatus(msg); setTimeout(()=>setStatus(""),4000); };

  const loadNotion = async () => {
    setLoading(true); toast("Fetching from Notion…");
    try {
      const data = await notionFetch(`/databases/${NOTION_DB_ID}/query`,"POST",{page_size:200});
      if (data.results) {
        const mapped = data.results.map(page=>{
          const p=page.properties, txt=k=>p[k]?.rich_text?.[0]?.plain_text||p[k]?.title?.[0]?.plain_text||"", dt=k=>p[k]?.date?.start||"";
          return {id:page.id,stockNo:txt("Stock No"),vin:txt("VIN"),year:txt("Year"),make:txt("Make"),model:txt("Model"),keys:p["Keys"]?.select?.name||"1",miles:txt("Miles"),acv:txt("ACV"),rw:p["R/W"]?.select?.name||"R",titleState:p["Title State"]?.select?.name||"HI",payoffBank:txt("Payoff Bank"),stage:p["Stage"]?.select?.name||"fresh",acquiredDate:dt("Acquired Date"),payoffSent:dt("Payoff Sent"),titleRcvd:dt("Title RCVD"),sentDMV:dt("Sent DMV"),spiTitle:dt("SPI Title RCVD"),regExp:dt("Reg Exp"),scExp:dt("SC Exp"),inSvc:dt("In Svc"),svcDone:dt("Svc Done"),bodyShop:dt("Body Shop"),detail:dt("Detail"),pics:dt("Pics"),frontline:dt("Frontline"),soldDate:dt("Sold Date"),notes:[]};
        });
        setCars(mapped); toast(`✓ Loaded ${mapped.length} vehicles`);
      }
    } catch(e) { toast(`❌ ${e.message}`); }
    setLoading(false);
  };

  const saveNotion = async car => {
    try {
      // Notion UUIDs contain dashes e.g. "abc123-de45-..." — timestamp IDs don't
      const isNotionId = car.id.includes("-");
      if(isNotionId) await notionFetch(`/pages/${car.id}`,"PATCH",{properties:carToNotion(car)});
      else await notionFetch("/pages","POST",{parent:{database_id:NOTION_DB_ID},properties:carToNotion(car)});
      toast("✓ Saved to Notion");
    } catch(e) { toast(`❌ Save failed: ${e.message}`); }
  };

  const handleSave = updated => {
    const prev = cars.find(c=>c.id===updated.id);
    // Fire confetti when moved to sold
    if (prev && prev.stage !== "sold" && updated.stage === "sold") setConfetti(true);
    setCars(cs=>cs.map(c=>c.id===updated.id?updated:c));
    if(notionMode) saveNotion(updated);
  };
  const handleAdd = async car => {
    setCars(cs=>[...cs,car]);
    if(notionMode) {
      try {
        // Create in Notion and get back the real UUID, then update local state
        const data = await notionFetch("/pages","POST",{parent:{database_id:NOTION_DB_ID},properties:carToNotion(car)});
        if(data.id) {
          const notionId = data.id;
          setCars(cs=>cs.map(c=>c.id===car.id?{...c,id:notionId}:c));
          toast("✓ Added to Notion");
        }
      } catch(e) { toast(`❌ Add failed: ${e.message}`); }
    }
  };
  const handleDelete = id   => {
    setCars(cs=>cs.filter(c=>c.id!==id));
    if(notionMode) notionFetch(`/pages/${id}`,"PATCH",{archived:true}).catch(()=>{});
  };

  const activeCars = cars.filter(c=>{
    if(c.stage!=="sold") return true;
    const d = soldDaysAgo(c); return d===null||d<60;
  });
  const dupVINs = getDupVINs(activeCars);
  const filtered = activeCars.filter(c=>{
    const q=search.toLowerCase();
    return (!q||[c.stockNo,c.make,c.model,c.vin].some(v=>(v||"").toLowerCase().includes(q)))
        &&(stageFilter==="all"||c.stage===stageFilter)
        &&(rwFilter==="all"||c.rw===rwFilter);
  });

  return (
    <div style={{minHeight:"100vh",background:"#060b14",color:"#e2e8f0",fontFamily:"'DM Mono','Fira Code','Courier New',monospace"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;600;800&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:#0f172a;}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:3px;}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.4);}
        select option{background:#1e293b;}
        @media(max-width:600px){
          .nav-title{display:none;}
          .controls-row{flex-direction:column!important;align-items:stretch!important;}
          .controls-row input,.controls-row select{width:100%!important;}
          .rw-btns{justify-content:stretch;}
          .rw-btns button{flex:1;}
          .view-btns button{flex:1;}
        }
      `}</style>

      <Confetti active={confetti} onDone={()=>setConfetti(false)}/>

      {/* NAV */}
      <div style={{background:"#0a0f1a",borderBottom:"1px solid #1e293b",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{width:"28px",height:"28px",background:"#dc2626",borderRadius:"6px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",fontWeight:900,color:"#fff",fontFamily:"'DM Sans',sans-serif",flexShrink:0}}>S</div>
          <span style={{fontSize:"15px",fontWeight:800,color:"#f1f5f9",fontFamily:"'DM Sans',sans-serif",letterSpacing:"-0.02em"}}>SERVCO</span>
          <span className="nav-title" style={{color:"#334155",fontSize:"13px"}}>/</span>
          <span className="nav-title" style={{fontSize:"12px",color:"#475569",fontFamily:"'DM Sans',sans-serif"}}>Recon Pipeline</span>
        </div>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          {status&&<span style={{fontSize:"11px",color:"#4ade80",padding:"3px 8px",background:"#14532d33",border:"1px solid #15803d",borderRadius:"6px",whiteSpace:"nowrap"}}>{status}</span>}
          <button onClick={()=>{setNotionMode(n=>!n);if(!notionMode)loadNotion();}} style={{...btn(notionMode?"#1a2744":"#1e293b",notionMode?"#3b82f6":"#334155"),fontSize:"11px",padding:"5px 10px"}}>
            {notionMode?"🔗 Live":"🔗 Notion"}
          </button>
          <button onClick={()=>setAdding(true)} style={{...btn("#14532d","#4ade80"),fontSize:"11px",padding:"5px 12px"}}>+ Add</button>
        </div>
      </div>

      {/* BODY */}
      <div style={{padding:"16px"}}>
        <StatsBar cars={cars}/>

        {/* CONTROLS */}
        <div className="controls-row" style={{display:"flex",gap:"8px",marginBottom:"14px",flexWrap:"wrap",alignItems:"center"}}>
          <input placeholder="Search stock #, VIN, make, model…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{...input({width:"240px"}),fontFamily:"'DM Sans',sans-serif"}}/>
          <select value={stageFilter} onChange={e=>setStageFilter(e.target.value)} style={input({width:"160px"})}>
            <option value="all">All Stages</option>
            {STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <div className="rw-btns" style={{display:"flex",gap:"4px"}}>
            {[["all","All"],["R","Retail"],["W","Wholesale"]].map(([val,label])=>(
              <button key={val} onClick={()=>setRwFilter(val)} style={{...btn(rwFilter===val?"#1e40af":"#1e293b",rwFilter===val?"#3b82f6":"#334155"),fontSize:"11px",padding:"5px 10px"}}>{label}</button>
            ))}
          </div>
          <div className="view-btns" style={{marginLeft:"auto",display:"flex",gap:"4px"}}>
            {["kanban","table"].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{...btn(view===v?"#1e40af":"#1e293b",view===v?"#3b82f6":"#334155"),fontSize:"11px",padding:"5px 12px"}}>
                {v==="kanban"?"⬜ Board":"☰ Table"}
              </button>
            ))}
          </div>
        </div>

        <div style={{fontSize:"11px",color:"#334155",marginBottom:"12px"}}>
          Showing <span style={{color:"#64748b",fontWeight:700}}>{filtered.length}</span> of {cars.length} vehicles
        </div>

        {dupVINs.size>0&&(
          <div style={{background:"#431407",border:"1px solid #ea580c",borderRadius:"8px",padding:"10px 14px",marginBottom:"12px",display:"flex",alignItems:"flex-start",gap:"8px"}}>
            <span style={{fontSize:"14px",flexShrink:0}}>⚠️</span>
            <div>
              <span style={{fontSize:"12px",fontWeight:800,color:"#fb923c",textTransform:"uppercase",letterSpacing:"0.06em"}}>Duplicate VIN — </span>
              <span style={{fontSize:"12px",color:"#fed7aa"}}>{[...dupVINs].join(", ")} appears more than once.</span>
            </div>
          </div>
        )}

        {loading
          ? <div style={{textAlign:"center",padding:"60px",color:"#334155",fontSize:"14px"}}>Loading from Notion…</div>
          : view==="kanban"
            ? <KanbanView cars={filtered} onCarClick={setSelected} dupVINs={dupVINs}/>
            : <TableView  cars={filtered} onCarClick={setSelected} dupVINs={dupVINs}/>
        }
      </div>

      {selected&&<CarModal car={selected} onClose={()=>setSelected(null)} onSave={handleSave} onDelete={handleDelete}/>}
      {adding&&<AddCarModal onClose={()=>setAdding(false)} onAdd={handleAdd} existingVINs={new Set(activeCars.filter(c=>c.vin).map(c=>c.vin.toUpperCase()))}/>}
    </div>
  );
}
