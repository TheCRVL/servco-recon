import { useState, useEffect, useRef, useCallback } from "react";

// ─── NOTION CONFIG ────────────────────────────────────────────────────────────
// Credentials live in Vercel environment variables — never hardcoded
const NOTION_TOKEN = import.meta.env.VITE_NOTION_TOKEN || "";
const NOTION_DB_ID = import.meta.env.VITE_NOTION_DB_ID || "";

// Routes through our own Vercel serverless function — no CORS issues

// ─── PIPELINE STAGES ─────────────────────────────────────────────────────────
const STAGES = [
  { id: "fresh",       label: "Fresh",        color: "#dbeafe", accent: "#1d4ed8", dark: "#1e3a5f", darkAccent: "#38bdf8" },
  { id: "title_work",  label: "Title Work",   color: "#ede9fe", accent: "#6d28d9", dark: "#6d28d9", darkAccent: "#a78bfa" },
  { id: "reg_safety",  label: "Reg / Safety", color: "#fef3c7", accent: "#b45309", dark: "#92400e", darkAccent: "#fbbf24" },
  { id: "service",     label: "In Service",   color: "#dbeafe", accent: "#1d4ed8", dark: "#1e40af", darkAccent: "#60a5fa" },
  { id: "body_shop",   label: "Body Shop",    color: "#cffafe", accent: "#0e7490", dark: "#0e7490", darkAccent: "#22d3ee" },
  { id: "detail",      label: "Detail",       color: "#d1fae5", accent: "#065f46", dark: "#065f46", darkAccent: "#34d399" },
  { id: "photos",      label: "Photos",       color: "#ecfdf5", accent: "#059669", dark: "#0f4c35", darkAccent: "#6ee7b7" },
  { id: "frontline",   label: "Frontline ✓",  color: "#dcfce7", accent: "#15803d", dark: "#14532d", darkAccent: "#4ade80" },
  { id: "sold",        label: "Sold 🏁",       color: "#ede9fe", accent: "#6d28d9", dark: "#1e1e2e", darkAccent: "#818cf8" },
];
const PIPELINE_STAGES = STAGES.filter(s => s.id !== "sold");

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = [
  { id:"1", stockNo:"GVA05952", vin:"1FTBR1C80RKA05952", year:"2024", make:"Ford",   model:"Transit",      keys:"2", miles:"8,923",  acv:"$24,500", rw:"R", titleState:"HI", payoffBank:"Ally", acquiredDate:"2026-01-28", payoffSent:"2026-02-01", titleRcvd:"2026-02-08", sentDMV:"2026-02-09", spiTitle:"2026-02-18", regExp:"2026-12-01", scExp:"2026-11-15", inSvc:"2026-02-10", svcDone:"2026-02-13", bodyShop:"",         detail:"2026-02-14", pics:"2026-02-15", frontline:"2026-02-16", soldDate:"", stage:"frontline",  notes:[{text:"Detail and photos done. Frontline ready.",author:"Kapono",date:"2026-02-15"}], stageTimes:{fresh:"2026-01-28",service:"2026-02-10",detail:"2026-02-14",photos:"2026-02-15",frontline:"2026-02-16"} },
  { id:"2", stockNo:"WKA305P",  vin:"1N6BA1F42RN305002", year:"2016", make:"Nissan", model:"NV Passenger", keys:"1", miles:"83,422", acv:"$8,200",  rw:"R", titleState:"HI", payoffBank:"",     acquiredDate:"2026-01-20", payoffSent:"",          titleRcvd:"",          sentDMV:"",          spiTitle:"",          regExp:"2026-03-10", scExp:"2026-02-10", inSvc:"2026-02-20", svcDone:"",          bodyShop:"",         detail:"",           pics:"",          frontline:"",           soldDate:"", stage:"service",    notes:[{text:"Going in next available on heavy duty rack.",author:"Conrad",date:"2026-02-28"},{text:"HVAC heaterhose ordered from dealer.",author:"Lyie B",date:"2025-12-15"}], stageTimes:{fresh:"2026-01-20",service:"2026-02-20"} },
  { id:"3", stockNo:"SFB53904", vin:"1C6JJTBG5NL153904", year:"2022", make:"Jeep",   model:"Gladiator",    keys:"2", miles:"62,088", acv:"$31,000", rw:"R", titleState:"ML", payoffBank:"Ally", acquiredDate:"2026-02-10", payoffSent:"2026-02-12", titleRcvd:"",          sentDMV:"",          spiTitle:"",          regExp:"2026-01-15", scExp:"",           inSvc:"",           svcDone:"",          bodyShop:"",         detail:"",           pics:"",          frontline:"",           soldDate:"", stage:"title_work", notes:[{text:"Mainland bank — Ally. Payoff check mailed 2/12.",author:"Michelle P",date:"2026-02-12"}], stageTimes:{fresh:"2026-02-10",title_work:"2026-02-10"} },
  { id:"4", stockNo:"TYA22101", vin:"2T1BURHE0NC022101", year:"2023", make:"Toyota", model:"Corolla",      keys:"1", miles:"24,500", acv:"$18,750", rw:"R", titleState:"HI", payoffBank:"",     acquiredDate:"2026-02-15", payoffSent:"",          titleRcvd:"2026-02-22", sentDMV:"",          spiTitle:"",          regExp:"",           scExp:"2026-02-01", inSvc:"",           svcDone:"",          bodyShop:"",         detail:"",           pics:"",          frontline:"",           soldDate:"", stage:"reg_safety", notes:[{text:"Failed safety check. Needs fresh SC before detail.",author:"Kapono",date:"2026-02-25"}], stageTimes:{fresh:"2026-02-15",reg_safety:"2026-02-22"} },
  { id:"5", stockNo:"HNA88231", vin:"5FNYF6H09NB088231", year:"2021", make:"Honda",  model:"Pilot",        keys:"2", miles:"41,200", acv:"$22,000", rw:"R", titleState:"HI", payoffBank:"",     acquiredDate:"2026-02-20", payoffSent:"",          titleRcvd:"",          sentDMV:"",          spiTitle:"",          regExp:"",           scExp:"",           inSvc:"2026-02-26", svcDone:"2026-03-01", bodyShop:"2026-03-01",detail:"",           pics:"",          frontline:"",           soldDate:"", stage:"body_shop",  notes:[{text:"Minor bumper repair. Sent to sublet body shop.",author:"Tony",date:"2026-03-01"}], stageTimes:{fresh:"2026-02-20",service:"2026-02-26",body_shop:"2026-03-01"} },
  { id:"6", stockNo:"MZA91045", vin:"JM3KFBCM1L0391045", year:"2020", make:"Mazda",  model:"CX-5",         keys:"1", miles:"55,100", acv:"$14,200", rw:"W", titleState:"HI", payoffBank:"",     acquiredDate:"2026-03-01", payoffSent:"",          titleRcvd:"",          sentDMV:"",          spiTitle:"",          regExp:"",           scExp:"",           inSvc:"",           svcDone:"",          bodyShop:"",         detail:"",           pics:"",          frontline:"",           soldDate:"", stage:"fresh",      notes:[{text:"Just acquired. Decide R or W by tomorrow.",author:"Kapono",date:"2026-03-01"}], stageTimes:{fresh:"2026-03-01"} },
  { id:"7", stockNo:"KIA77432",  vin:"5XXG14J27PG077432", year:"2023", make:"Kia",    model:"Sportage",     keys:"2", miles:"19,800", acv:"$26,500", rw:"R", titleState:"HI", payoffBank:"",     acquiredDate:"2026-01-10", payoffSent:"",          titleRcvd:"",          sentDMV:"",          spiTitle:"",          regExp:"",           scExp:"",           inSvc:"",           svcDone:"",          bodyShop:"",         detail:"",           pics:"",          frontline:"2026-02-01", soldDate:"2026-02-15", stage:"sold",       notes:[{text:"Sold 2/15. Deal funded.",author:"Kapono",date:"2026-02-15"}], stageTimes:{fresh:"2026-01-10",frontline:"2026-02-01",sold:"2026-02-15"} },
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
const t2lBadge = (days, dark=false) => {
  if(days===null) return dark ? {bg:"#1e293b",fg:"#64748b",label:"—"} : {bg:"#f1f5f9",fg:"#94a3b8",label:"—"};
  if(days<=7)     return dark ? {bg:"#14532d",fg:"#4ade80",label:`${days}d`} : {bg:"#dcfce7",fg:"#15803d",label:`${days}d`};
  if(days<=14)    return dark ? {bg:"#713f12",fg:"#fbbf24",label:`${days}d`} : {bg:"#fef9c3",fg:"#b45309",label:`${days}d`};
  if(days<=21)    return dark ? {bg:"#7c2d12",fg:"#fb923c",label:`${days}d`} : {bg:"#ffedd5",fg:"#c2410c",label:`${days}d`};
                  return dark ? {bg:"#7f1d1d",fg:"#f87171",label:`${days}d ⚠`} : {bg:"#fee2e2",fg:"#b91c1c",label:`${days}d ⚠`};
};

// ─── ISSUE TAGS ───────────────────────────────────────────────────────────────
function getIssueTags(car, dark=false) {
  const tags = [];
  if (dark) {
    if (!car.stockNo || car.stockNo.trim() === "") tags.push({ label:"NO STOCK #",     color:"#f59e0b", bg:"#2d1b00" });
    if (isExpired(car.regExp))          tags.push({ label:"REG EXP",        color:"#dc2626", bg:"#3f0e0e" });
    if (isExpired(car.scExp))           tags.push({ label:"SC EXP",         color:"#dc2626", bg:"#3f0e0e" });
    if (!car.titleRcvd)                 tags.push({ label:"NO TITLE RCVD",  color:"#d97706", bg:"#2d1b00" });
    if (!car.sentDMV && car.titleRcvd)  tags.push({ label:"DMV PENDING",    color:"#b45309", bg:"#2d1b00" });
    if (!car.spiTitle && car.sentDMV)   tags.push({ label:"SPI PENDING",    color:"#7c3aed", bg:"#1e0a3c" });
    if (car.keys === "1")               tags.push({ label:"1 KEY",          color:"#0369a1", bg:"#0c2340" });
    if (daysSince(car.acquiredDate) > 21 && !["frontline","sold"].includes(car.stage))
                                        tags.push({ label:"21d+ IN RECON",  color:"#b91c1c", bg:"#3f0e0e" });
  } else {
    if (!car.stockNo || car.stockNo.trim() === "") tags.push({ label:"NO STOCK #",     color:"#ffffff", bg:"#d97706" });
    if (isExpired(car.regExp))          tags.push({ label:"REG EXP",        color:"#ffffff", bg:"#dc2626" });
    if (isExpired(car.scExp))           tags.push({ label:"SC EXP",         color:"#ffffff", bg:"#dc2626" });
    if (!car.titleRcvd)                 tags.push({ label:"NO TITLE RCVD",  color:"#ffffff", bg:"#d97706" });
    if (!car.sentDMV && car.titleRcvd)  tags.push({ label:"DMV PENDING",    color:"#ffffff", bg:"#b45309" });
    if (!car.spiTitle && car.sentDMV)   tags.push({ label:"SPI PENDING",    color:"#ffffff", bg:"#7c3aed" });
    if (car.keys === "1")               tags.push({ label:"1 KEY",          color:"#ffffff", bg:"#0369a1" });
    if (daysSince(car.acquiredDate) > 21 && !["frontline","sold"].includes(car.stage))
                                        tags.push({ label:"21d+ IN RECON",  color:"#ffffff", bg:"#dc2626" });
  }
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

const input = (extra={}, dark=false) => ({
  background: dark ? "#1e293b" : "#f8fafc",
  border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
  borderRadius:"6px",
  color: dark ? "#e2e8f0" : "#1e293b",
  padding:"7px 10px", fontSize:"13px",
  outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit", ...extra
});
const btn = (bg, border, dark=false) => {
  if (dark) return {
    background:bg, border:`1px solid ${border}`,
    color:"#e2e8f0",
    borderRadius:"8px", padding:"8px 16px", cursor:"pointer",
    fontSize:"13px", fontWeight:600, fontFamily:"inherit"
  };
  // Light mode: map dark bg/border values to light equivalents
  const bgMap={"#14532d":"#15803d","#1e40af":"#2563eb","#1a2744":"#dbeafe",
    "#1e293b":"#ffffff","#7f1d1d":"#fef2f2","#92400e":"#fffbeb","#15803d":"#15803d"};
  const borderMap={"#334155":"#d1d5db","#4ade80":"#16a34a","#3b82f6":"#3b82f6",
    "#dc2626":"#dc2626","#fbbf24":"#d97706"};
  const mb=bgMap[bg]||bg, mbo=borderMap[border]||border;
  const lightBgs=new Set(["#ffffff","#f8fafc","#fef2f2","#fffbeb","#dbeafe"]);
  return {
    background:mb, border:`1px solid ${mbo}`,
    color: lightBgs.has(mb) ? "#1e293b" : "#ffffff",
    borderRadius:"8px", padding:"8px 16px", cursor:"pointer",
    fontSize:"13px", fontWeight:600, fontFamily:"inherit"
  };
};

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
// ─── STAGE TIMER HELPERS ─────────────────────────────────────────────────────
function getStageDays(car) {
  const entry = car.stageTimes && car.stageTimes[car.stage];
  if (!entry) return null;
  return daysSince(entry);
}
function stageTimeBadge(days, dark=false) {
  if (days === null || days === undefined) return null;
  if (dark) {
    if (days < 7)  return { bg:"#14532d", fg:"#4ade80", label:days+"d" };
    if (days < 15) return { bg:"#713f12", fg:"#fbbf24", label:days+"d" };
    return              { bg:"#450a0a", fg:"#f87171", label:days+"d ⚠" };
  }
  if (days < 7)  return { bg:"#dcfce7", fg:"#15803d", label:days+"d" };
  if (days < 15) return { bg:"#fef9c3", fg:"#b45309", label:days+"d" };
  return              { bg:"#fee2e2", fg:"#b91c1c", label:days+"d ⚠" };
}
function initStageTimes(car) {
  const t = {};
  const fill = (stage, date) => { if (!t[stage] && date) t[stage] = date; };
  fill("fresh",      car.acquiredDate);
  fill("title_work", car.acquiredDate);
  fill("reg_safety", car.acquiredDate);
  fill("service",    car.inSvc || car.acquiredDate);
  fill("body_shop",  car.bodyShop || car.acquiredDate);
  fill("detail",     car.detail || car.acquiredDate);
  fill("photos",     car.pics || car.acquiredDate);
  fill("frontline",  car.frontline || car.acquiredDate);
  fill("sold",       car.soldDate || car.acquiredDate);
  return t;
}

function StatsBar({ cars, dark=false }) {
  const activeCarsNoSold = cars.filter(c=>c.stage!=="sold");
  const frontline  = cars.filter(c=>c.stage==="frontline").length;
  const stuck      = cars.filter(c=>daysSince(c.acquiredDate)>21&&![\"frontline\",\"sold\"].includes(c.stage)).length;
  const inProgress = cars.filter(c=>![\"frontline\",\"fresh\",\"sold\"].includes(c.stage)).length;
  const doneCars   = cars.filter(c=>c.frontline&&c.acquiredDate);
  const avgT2L     = doneCars.length ? Math.round(doneCars.reduce((s,c)=>s+daysSince(c.acquiredDate),0)/doneCars.length) : null;
  const Stat = ({label,value,color}) => (
    <div style={{textAlign:"center",padding:"0 20px"}}>
      <div style={{fontSize:"28px",fontWeight:900,color,fontFamily:"'DM Mono',monospace"}}>{value}</div>
      <div style={{fontSize:"10px",color:dark?"#475569":"#94a3b8",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginTop:"3px"}}>{label}</div>
    </div>
  );
  const divColor = dark ? "#1e293b" : "#e2e8f0";
  return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",background:dark?"#0a0f1a":"#ffffff",border:`1px solid ${divColor}`,borderRadius:"12px",padding:"16px",marginBottom:"20px",flexWrap:"wrap",gap:"4px",boxShadow:dark?"none":"0 1px 3px rgba(0,0,0,0.06)"}}>
      <Stat label="Total"         value={activeCarsNoSold.length}      color={dark?"#94a3b8":"#64748b"}/>
      <div style={{width:"1px",height:"36px",background:divColor}}/>
      <Stat label="Frontline"     value={frontline}                color={dark?"#4ade80":"#15803d"}/>
      <div style={{width:"1px",height:"36px",background:divColor}}/>
      <Stat label="In Progress"   value={inProgress}               color={dark?"#60a5fa":"#1d4ed8"}/>
      <div style={{width:"1px",height:"36px",background:divColor}}/>
      <Stat label="Stuck 21d+"    value={stuck}                    color={dark?"#f87171":"#dc2626"}/>
      <div style={{width:"1px",height:"36px",background:divColor}}/>
      <Stat label="Avg T2L"       value={avgT2L?`${avgT2L}d`:"—"} color={dark?"#fbbf24":"#b45309"}/>
    </div>
  );
}

// ─── NOTE THREAD ─────────────────────────────────────────────────────────────
function NoteThread({ notes, onAdd, dark=false }) {
  const [text,setText]     = useState("");
  const [author,setAuthor] = useState("");
  const bg = dark ? "#060b14" : "#f8fafc";
  const border = dark ? "#1e293b" : "#e2e8f0";
  const labelColor = dark ? "#64748b" : "#94a3b8";
  const textColor = dark ? "#cbd5e1" : "#334155";
  const authorColor = dark ? "#e2e8f0" : "#1e293b";
  const emptyColor = dark ? "#334155" : "#cbd5e1";
  return (
    <div style={{marginTop:"12px"}}>
      <div style={{fontSize:"10px",fontWeight:700,color:dark?"#64748b":"#94a3b8",letterSpacing:"0.1em",marginBottom:"8px"}}>NOTES LOG</div>
      <div style={{display:"flex",flexDirection:"column",gap:"6px",maxHeight:"140px",overflowY:"auto",marginBottom:"10px"}}>
        {notes.length===0 && <div style={{color:emptyColor,fontSize:"12px",fontStyle:"italic"}}>No notes yet.</div>}
        {notes.map((n,i)=>(
          <div key={i} style={{background:bg,border:`1px solid ${border}`,borderRadius:"6px",padding:"8px 10px"}}>
            <div style={{fontSize:"11px",color:labelColor,marginBottom:"3px"}}>
              <span style={{color:authorColor,fontWeight:600}}>{n.author}</span> · {fmtDate(n.date)}
            </div>
            <div style={{fontSize:"13px",color:textColor,lineHeight:"1.5"}}>{n.text}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
        <input placeholder="Name" value={author} onChange={e=>setAuthor(e.target.value)} style={input({width:"90px",minWidth:"80px",flex:"0 0 90px"},dark)}/>
        <input placeholder="Add a note…" value={text} onChange={e=>setText(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&text&&author){onAdd({text,author,date:new Date().toISOString().split("T")[0]});setText("");}}}
          style={input({flex:"1",minWidth:"120px"},dark)}/>
        <button onClick={()=>{if(text&&author){onAdd({text,author,date:new Date().toISOString().split("T")[0]});setText("");}}} style={{background:"#1e40af",border:"1px solid #3b82f6",color:"#fff",borderRadius:"8px",padding:"8px 16px",cursor:"pointer",fontSize:"13px",fontWeight:600,fontFamily:"inherit"}}>Add</button>
      </div>
    </div>
  );
}

// ─── MODAL FIELD COMPONENTS (defined outside modal to prevent focus loss) ────
function ModalField({label, fkey, type="text", form, set, dark=false}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
      <label style={{fontSize:"10px",color:dark?"#64748b":"#94a3b8",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</label>
      <input type={type} value={form[fkey]||""} onChange={e=>set(fkey,e.target.value)} style={input({},dark)}/>
    </div>
  );
}
function ModalSelect({label, fkey, options, form, set, dark=false}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
      <label style={{fontSize:"10px",color:dark?"#64748b":"#94a3b8",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</label>
      <select value={form[fkey]||""} onChange={e=>set(fkey,e.target.value)} style={input({},dark)}>
        {options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
function ModalExpField({label, fkey, form, set, dark=false}) {
  const expired = isExpired(form[fkey]);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
      <label style={{fontSize:"10px",color:expired?"#dc2626":dark?"#64748b":"#94a3b8",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>
        {label}{expired?" ⚠ EXPIRED":""}
      </label>
      <input type="date" value={form[fkey]||""} onChange={e=>set(fkey,e.target.value)}
        style={{...input({},dark),
          border:expired?"1px solid #dc2626":dark?"1px solid #334155":"1px solid #e2e8f0",
          color:expired?"#dc2626":dark?"#e2e8f0":"#1e293b",
          background:expired?(dark?"#3f0e0e":"#fee2e2"):dark?"#1e293b":"#f8fafc"
        }}/>
    </div>
  );
}

// ─── CAR DETAIL MODAL ────────────────────────────────────────────────────────
function CarModal({ car, onClose, onSave, onDelete, onSold, dark=false }) {
  const [form, setForm]                   = useState({...car});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [regSafetyWarn, setRegSafetyWarn] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Track dirty state — compare current form against original car
  const isDirty = JSON.stringify(form) !== JSON.stringify(car);

  const handleClose = () => {
    if (isDirty) { setConfirmDiscard(true); return; }
    onClose();
  };

  // Auto-stage logic: when certain date fields are set, advance the stage intelligently
  const autoStage = (key, val, currentForm) => {
    const f = {...currentForm, [key]: val};
    // Only auto-advance — never auto-retreat from a later stage
    const stageOrder = ["fresh","title_work","reg_safety","service","body_shop","detail","photos","frontline","sold"];
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
  const badge = t2lBadge(days, dark);
  const tags  = getIssueTags(form, dark);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:1000,padding:"12px",overflowY:"auto"}}
      onClick={e=>e.target===e.currentTarget&&handleClose()}>
      <div style={{background:dark?"#0f172a":"#ffffff",border:`1px solid ${dark?"#1e293b":"#e2e8f0"}`,borderRadius:"12px",width:"100%",maxWidth:"740px",padding:"20px",boxShadow:dark?"0 30px 80px rgba(0,0,0,0.9)":"0 20px 60px rgba(0,0,0,0.15)",margin:"auto"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px",gap:"10px"}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:"20px",fontWeight:800,color:dark?"#f1f5f9":"#1e293b",fontFamily:"'DM Sans',sans-serif",lineHeight:"1.2",textTransform:"uppercase"}}>{form.year} {form.make} {form.model}</div>
            <div style={{fontSize:"11px",color:dark?"#64748b":"#94a3b8",marginTop:"3px",fontFamily:"monospace",wordBreak:"break-all"}}>#{form.stockNo}{form.vin?` · ${form.vin}`:""} · {form.miles} mi</div>
          </div>
          <div style={{display:"flex",gap:"6px",alignItems:"center",flexShrink:0}}>
            <span style={{background:badge.bg,color:badge.fg,fontSize:"11px",fontWeight:700,fontFamily:"monospace",padding:"3px 8px",borderRadius:"5px",whiteSpace:"nowrap"}}>T2L {badge.label}</span>
            <button onClick={handleClose} style={{background:"none",border:"1px solid #334155",color:"#94a3b8",borderRadius:"6px",padding:"6px 10px",cursor:"pointer",fontSize:"13px"}}>✕</button>
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
          <div style={{fontSize:"10px",color:dark?"#64748b":"#94a3b8",fontWeight:700,letterSpacing:"0.08em",marginBottom:"8px"}}>STAGE</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
            {STAGES.map(st=>(
              <button key={st.id} onClick={()=>handleStageClick(st.id)} style={{
                background:form.stage===st.id?st.color:(dark?"#1e293b":"#f1f5f9"),
                color:form.stage===st.id?(dark?"#fff":st.accent):(dark?"#64748b":"#475569"),
                border:`1px solid ${form.stage===st.id?st.accent:(dark?"#334155":"#e2e8f0")}`,
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
            <label style={{fontSize:"10px",color:"#f87171",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>VIN <span style={{color:"#f87171"}}>*</span></label>
            <input value={form.vin||""} onChange={e=>set("vin",e.target.value)}
              style={{...input(),borderColor:(!form.vin||form.vin.length===0)?"#dc2626":form.vin.length!==17?"#ea580c":"#334155"}}/>
            {(!form.vin||form.vin.length===0)&&(
              <div style={{fontSize:"11px",color:"#f87171",fontWeight:700}}>⚠ VIN is required</div>
            )}
            {form.vin&&form.vin.length>0&&form.vin.length<17&&(
              <div style={{fontSize:"11px",color:"#fb923c",fontWeight:700}}>⚠ {form.vin.length}/17 characters</div>
            )}
            {form.vin&&form.vin.length>17&&(
              <div style={{fontSize:"11px",color:"#f87171",fontWeight:700}}>⚠ VIN cannot exceed 17 characters — currently {form.vin.length}/17</div>
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
        <div style={{borderTop:`1px solid ${dark?"#1e293b":"#e2e8f0"}`,paddingTop:"14px",marginBottom:"14px"}}>
          <div style={{fontSize:"10px",color:dark?"#64748b":"#94a3b8",fontWeight:700,letterSpacing:"0.1em",marginBottom:"10px"}}>TIMELINE</div>
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
        <div style={{borderTop:`1px solid ${dark?"#1e293b":"#e2e8f0"}`,paddingTop:"14px"}}>
          <NoteThread notes={form.notes||[]} onAdd={note=>setForm(f=>({...f,notes:[...(f.notes||[]),note]}))} dark={dark}/></div>

        {/* Actions */}
        {confirmDelete ? (
          <div style={{marginTop:"16px",background:dark?"#3f0e0e":"#fef2f2",border:`1px solid ${dark?"#dc2626":"#fca5a5"}`,borderRadius:"8px",padding:"12px 14px"}}>
            <div style={{fontSize:"13px",color:dark?"#fca5a5":"#b91c1c",fontWeight:600,marginBottom:"10px"}}>Delete <strong>{form.year} {form.make} {form.model}</strong> (#{form.stockNo})? This cannot be undone.</div>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
              <button onClick={()=>setConfirmDelete(false)} style={btn("#1e293b","#334155",dark)}>Cancel</button>
              <button onClick={()=>{onDelete(form.id);onClose();}} style={dark?{...btn("#7f1d1d","#dc2626",dark),color:"#fca5a5"}:{...btn("#7f1d1d","#dc2626",dark),background:"#dc2626",color:"#fff",border:"1px solid #dc2626"}}>Yes, Delete</button>
            </div>
          </div>
        ) : confirmDiscard ? (
          <div style={{marginTop:"16px",background:dark?"#1c1600":"#fffbeb",border:`1px solid ${dark?"#fbbf24":"#f59e0b"}`,borderRadius:"8px",padding:"12px 14px"}}>
            <div style={{fontSize:"13px",color:dark?"#fde68a":"#92400e",fontWeight:600,marginBottom:"10px"}}>⚠ You have unsaved changes. Discard them?</div>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
              <button onClick={()=>setConfirmDiscard(false)} style={btn("#1e293b","#334155",dark)}>← Keep Editing</button>
              <button onClick={onClose} style={{...btn("#7f1d1d","#dc2626",dark),background:dark?"#7f1d1d":"#dc2626",color:dark?"#fca5a5":"#fff",border:"1px solid #dc2626"}}>Discard Changes</button>
            </div>
          </div>
        ) : (
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"16px",flexWrap:"wrap",gap:"8px"}}>
            <button onClick={()=>setConfirmDelete(true)} style={{...btn("#1e293b","#334155",dark),color:dark?"#f87171":"#dc2626",fontSize:"12px"}}>🗑 Delete</button>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
              <button onClick={handleClose} style={btn("#1e293b","#334155",dark)}>Cancel</button>
              <button onClick={()=>{onSave(form);onClose();}} style={btn("#15803d","#4ade80",dark)}>Save Changes</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ADD CAR MODAL ────────────────────────────────────────────────────────────
function AddCarModal({ onClose, onAdd, existingVINs, dark=false }) {
  const blank = {id:Date.now().toString(),stockNo:"",vin:"",year:"",make:"",model:"",keys:"1",miles:"",acv:"",rw:"R",titleState:"HI",payoffBank:"",acquiredDate:new Date().toISOString().split("T")[0],stage:"fresh",notes:[],payoffSent:"",titleRcvd:"",sentDMV:"",spiTitle:"",regExp:"",scExp:"",inSvc:"",svcDone:"",bodyShop:"",detail:"",pics:"",frontline:"",soldDate:""};
  const [form,setForm] = useState(blank);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const vinDup = form.vin&&form.vin.length>5&&existingVINs.has(form.vin.toUpperCase());
  const labelColor = dark?"#64748b":"#94a3b8";
  const bg = dark?"#0f172a":"#ffffff";
  const border = dark?"#1e293b":"#e2e8f0";
  const titleColor = dark?"#f1f5f9":"#1e293b";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:1000,padding:"12px",overflowY:"auto"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:bg,border:`1px solid ${border}`,borderRadius:"12px",width:"100%",maxWidth:"540px",padding:"20px",boxShadow:dark?"0 30px 80px rgba(0,0,0,0.9)":"0 20px 60px rgba(0,0,0,0.15)",margin:"auto"}}>
        <div style={{fontSize:"20px",fontWeight:800,color:titleColor,fontFamily:"'DM Sans',sans-serif",marginBottom:"16px"}}>Add New Vehicle</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"10px",marginBottom:"14px"}}>
          {/* Static fields — avoids re-render focus loss caused by .map() creating new components */}
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:labelColor,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Stock No</label>
            <input value={form.stockNo||""} onChange={e=>set("stockNo",e.target.value)} style={input({},dark)}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:labelColor,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Year</label>
            <input value={form.year||""} onChange={e=>set("year",e.target.value)} style={input({},dark)}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:labelColor,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Make</label>
            <input value={form.make||""} onChange={e=>set("make",e.target.value)} style={input({},dark)}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:labelColor,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Model</label>
            <input value={form.model||""} onChange={e=>set("model",e.target.value)} style={input({},dark)}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:labelColor,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Miles</label>
            <input value={form.miles||""} onChange={e=>set("miles",e.target.value)} style={input({},dark)}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:labelColor,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>ACV</label>
            <input value={form.acv||""} onChange={e=>set("acv",e.target.value)} style={input({},dark)}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px",gridColumn:"1 / -1"}}>
            <label style={{fontSize:"10px",color:"#f87171",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>VIN <span style={{color:"#f87171"}}>*</span></label>
            <input value={form.vin||""} onChange={e=>set("vin",e.target.value)}
              style={{...input({},dark),borderColor:(!form.vin||form.vin.length===0)?"#dc2626":form.vin.length!==17?"#ea580c":dark?"#334155":"#e2e8f0"}}
              placeholder="17-character VIN (required)"/>
            {(!form.vin||form.vin.length===0)&&(
              <div style={{fontSize:"11px",color:"#f87171",fontWeight:700,marginTop:"2px"}}>⚠ VIN is required</div>
            )}
            {form.vin&&form.vin.length>0&&form.vin.length<17&&(
              <div style={{fontSize:"11px",color:"#fb923c",fontWeight:700,marginTop:"2px"}}>⚠ VIN must be 17 characters — currently {form.vin.length}/17</div>
            )}
            {form.vin&&form.vin.length>17&&(
              <div style={{fontSize:"11px",color:"#f87171",fontWeight:700,marginTop:"2px"}}>⚠ VIN cannot exceed 17 characters — currently {form.vin.length}/17</div>
            )}
            {form.vin&&form.vin.length===17&&vinDup&&(
              <div style={{fontSize:"11px",color:"#fb923c",fontWeight:700,marginTop:"2px"}}>⚠ This VIN already exists in inventory — possible duplicate or re-acquired vehicle.</div>
            )}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:labelColor,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Acquired</label>
            <input type="date" value={form.acquiredDate} onChange={e=>set("acquiredDate",e.target.value)} style={input({},dark)}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:labelColor,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Title State</label>
            <select value={form.titleState} onChange={e=>set("titleState",e.target.value)} style={input({},dark)}>
              <option value="HI">Hawaii (HI)</option><option value="ML">Mainland (ML)</option>
            </select>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:labelColor,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Keys</label>
            <select value={form.keys} onChange={e=>set("keys",e.target.value)} style={input({},dark)}>
              <option value="1">1 Key</option><option value="2">2 Keys</option>
            </select>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:labelColor,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Retail / Whsl</label>
            <select value={form.rw} onChange={e=>set("rw",e.target.value)} style={input({},dark)}>
              <option value="R">Retail</option><option value="W">Wholesale</option>
            </select>
          </div>
        </div>
        <div style={{marginBottom:"14px"}}>
          <div style={{fontSize:"10px",color:dark?"#64748b":"#94a3b8",fontWeight:700,letterSpacing:"0.08em",marginBottom:"8px"}}>INITIAL STAGE</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
            {STAGES.map(s=>(
              <button key={s.id} onClick={()=>set("stage",s.id)} style={{
                background:form.stage===s.id?s.color:(dark?"#1e293b":"#f1f5f9"),
                color:form.stage===s.id?(dark?"#fff":s.accent):(dark?"#64748b":"#475569"),
                border:`1px solid ${form.stage===s.id?s.accent:(dark?"#334155":"#e2e8f0")}`,
                borderRadius:"6px",padding:"5px 10px",cursor:"pointer",fontSize:"11px",fontWeight:600}}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:"8px",flexWrap:"wrap"}}>
          <button onClick={onClose} style={btn("#1e293b","#334155",dark)}>Cancel</button>
          <button onClick={()=>{if(form.vin&&form.vin.length===17){onAdd(form);onClose();}}} disabled={!form.vin||form.vin.length!==17} style={{...btn("#15803d","#4ade80",dark),opacity:(!form.vin||form.vin.length!==17)?0.4:1,cursor:(!form.vin||form.vin.length!==17)?"not-allowed":"pointer"}}>Add Vehicle</button>
        </div>
      </div>
    </div>
  );
}

// ─── KANBAN CARD ─────────────────────────────────────────────────────────────
function KanbanCard({ car, stage, onCarClick, isDupVIN, onDragStart, isDragging, isGhost, dark=false }) {
  const days       = daysSince(car.acquiredDate);
  const badge      = t2lBadge(days, dark);
  const tags       = getIssueTags(car, dark);
  const stageDays  = getStageDays(car);
  const stageBadge = stageTimeBadge(stageDays, dark);
  const cardBg     = dark ? "#0f172a" : "#ffffff";
  const cardHover  = dark ? "#1e293b" : "#f8fafc";
  if (isGhost) return (
    <div style={{height:"60px",borderRadius:"8px",border:`2px dashed ${dark?"#334155":"#cbd5e1"}`,background:dark?"#0a0f1a":"#f1f5f9",opacity:0.5}}/>
  );
  return (
    <div
      draggable
      onDragStart={e => { onDragStart(e, car); }}
      onClick={()=>{ if(!isDragging) onCarClick(car); }}
      style={{
        background: cardBg,
        border: isDupVIN ? "1px solid #ea580c" : `1px solid ${dark?"#1e293b":"#e2e8f0"}`,
        borderLeft:`3px solid ${isDupVIN?"#ea580c":stage.accent}`,
        borderRadius:"8px",padding:"10px",
        cursor:"grab",
        opacity: isDragging ? 0.35 : 1,
        transform: isDragging ? "scale(0.97)" : "scale(1)",
        transition:"background 0.12s, opacity 0.15s, transform 0.15s",
        boxShadow: isDragging ? "none" : (dark ? "none" : "0 1px 3px rgba(0,0,0,0.06)"),
      }}
      onMouseEnter={e=>{ if(!isDragging) e.currentTarget.style.background=cardHover; }}
      onMouseLeave={e=>e.currentTarget.style.background=cardBg}>
      <div style={{fontSize:"13px",fontWeight:700,color:dark?"#f1f5f9":"#1e293b",marginBottom:"2px",fontFamily:"'DM Sans',sans-serif",lineHeight:"1.2",textTransform:"uppercase"}}>{car.year} {car.make} {car.model}</div>
      <div style={{fontSize:"11px",color:dark?"#475569":"#94a3b8",marginBottom:"4px",fontFamily:"monospace"}}>#{car.stockNo}</div>
      {car.acv&&<div style={{fontSize:"11px",color:dark?"#fbbf24":"#b45309",marginBottom:"4px",fontWeight:700}}>ACV {car.acv}</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom: tags.length>0?"6px":"0"}}>
        <span style={{fontSize:"11px",color:isDupVIN?"#ea580c":(dark?"#475569":"#94a3b8"),fontFamily:"monospace",fontWeight:isDupVIN?700:400}}>
          {car.vin?car.vin.slice(-6):"—"}{isDupVIN?" ⚠ DUP":""}
        </span>
        <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
          {stageBadge&&<span title={"In this stage: "+stageDays+"d"} style={{background:stageBadge.bg,color:stageBadge.fg,fontSize:"9px",fontWeight:800,fontFamily:"monospace",padding:"2px 5px",borderRadius:"4px"}}>⏱ {stageBadge.label}</span>}
          <span style={{background:badge.bg,color:badge.fg,fontSize:"10px",fontWeight:700,fontFamily:"monospace",padding:"2px 6px",borderRadius:"4px"}}>{badge.label}</span>
        </div>
      </div>
      {tags.length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:"3px",marginTop:"4px"}}>
          {tags.map((t,i)=>(
            <span key={i} style={{background:t.bg,color:t.color,fontSize:"9px",fontWeight:800,padding:"2px 5px",borderRadius:"3px",letterSpacing:"0.04em"}}>{t.label}</span>
          ))}
        </div>
      )}
      {car.notes?.length>0&&(
        <div style={{marginTop:"6px",fontSize:"11px",color:dark?"#334155":"#94a3b8",borderTop:`1px solid ${dark?"#1e293b":"#e2e8f0"}`,paddingTop:"5px",fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
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
function KanbanView({ cars, onCarClick, dupVINs, onStageChange, dark=false }) {
  const soldCars     = cars.filter(c=>c.stage==="sold");
  const pipelineCars = cars.filter(c=>c.stage!=="sold");
  const drag = useDragScroll();

  const [draggingId, setDraggingId]   = useState(null);
  const [overStage,  setOverStage]    = useState(null);

  const handleDragStart = (e, car) => {
    setDraggingId(car.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("carId", car.id);
    // Transparent drag image so we use our own visual
    const ghost = document.createElement("div");
    ghost.style.cssText = "position:fixed;top:-999px;left:-999px;width:180px;padding:10px;background:#1e293b;border-radius:8px;color:#f1f5f9;font-size:12px;font-weight:700;";
    ghost.textContent = `${car.year} ${car.make} ${car.model}`;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 90, 20);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };
  const handleDragEnd = () => {
    setDraggingId(null);
    setOverStage(null);
  };
  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverStage(stageId);
  };
  const handleDrop = (e, stageId) => {
    e.preventDefault();
    const carId = e.dataTransfer.getData("carId");
    if (carId) onStageChange(carId, stageId);
    setDraggingId(null);
    setOverStage(null);
  };

  return (
    <div>
      <div ref={drag.ref} onMouseDown={drag.onMouseDown} onMouseMove={drag.onMouseMove} onMouseUp={drag.onMouseUp} onMouseLeave={drag.onMouseLeave}
        style={{display:"flex",gap:"10px",overflowX:"auto",padding:"4px 0 16px",minHeight:"400px",cursor:draggingId?"default":"grab",scrollbarWidth:"thin"}}>
        {PIPELINE_STAGES.map(stage=>{
          const col = pipelineCars.filter(c=>c.stage===stage.id);
          const isOver = overStage===stage.id;
          return (
            <div key={stage.id} style={{minWidth:"190px",width:"190px",flexShrink:0,transition:"transform 0.15s"}}
              onDragOver={e=>handleDragOver(e,stage.id)}
              onDragLeave={()=>setOverStage(null)}
              onDrop={e=>handleDrop(e,stage.id)}>
              <div style={{
                display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"7px 10px",
                background: isOver ? stage.color+"dd" : (dark ? stage.color+"44" : stage.color+"bb"),
                borderRadius:"8px 8px 0 0",
                borderBottom:`2px solid ${stage.accent}`,
                marginBottom:"8px",
                transition:"background 0.15s",
                boxShadow: isOver ? `0 0 0 2px ${stage.accent}` : "none",
              }}>
                <span style={{fontSize:"10px",fontWeight:800,color:stage.accent,letterSpacing:"0.08em",textTransform:"uppercase"}}>{stage.label}</span>
                <span style={{background:stage.accent+"33",color:stage.accent,borderRadius:"12px",fontSize:"11px",fontWeight:700,padding:"1px 6px"}}>{col.length}</span>
              </div>
              <div style={{
                display:"flex",flexDirection:"column",gap:"7px",
                minHeight:"60px",
                borderRadius:"0 0 8px 8px",
                padding: isOver ? "6px" : "0",
                background: isOver ? stage.color+"22" : "transparent",
                border: isOver ? `1px dashed ${stage.accent}88` : "1px solid transparent",
                transition:"all 0.15s",
              }}>
                {col.map(car=>(
                  <KanbanCard key={car.id} car={car} stage={stage}
                    onCarClick={car=>{ if(!draggingId) onCarClick(car); }}
                    isDupVIN={!!(car.vin&&dupVINs.has(car.vin.toUpperCase()))}
                    onDragStart={handleDragStart}
                    isDragging={draggingId===car.id}
                    isGhost={false}
                    dark={dark}
                  />
                ))}
                {isOver && draggingId && <KanbanCard isGhost={true} car={{}} stage={stage} onCarClick={()=>{}} isDupVIN={false} onDragStart={()=>{}} isDragging={false} dark={dark}/>}
                {col.length===0&&!isOver&&<div style={{textAlign:"center",color:dark?"#1e293b":"#cbd5e1",fontSize:"12px",padding:"20px 0"}}>—</div>}
              </div>
            </div>
          );
        })}
      </div>
      <style>{`[draggable]{-webkit-user-drag:element;} .drag-over{outline:2px solid #4ade80;}`}</style>
      {soldCars.length>0&&(
        <div style={{marginTop:"20px",borderTop:`1px solid ${dark?"#1e293b":"#e2e8f0"}`,paddingTop:"16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"12px"}}>
            <span style={{fontSize:"12px",fontWeight:800,color:"#818cf8",letterSpacing:"0.1em",textTransform:"uppercase"}}>Sold 🏁</span>
            <span style={{background:"#818cf833",color:"#818cf8",borderRadius:"12px",fontSize:"11px",fontWeight:700,padding:"1px 8px"}}>{soldCars.length}</span>
            <span style={{fontSize:"11px",color:dark?"#334155":"#94a3b8"}}>Auto-removes after 10 days</span>
          </div>
          <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
            {soldCars.map(car=>{
              const daysAgo = soldDaysAgo(car);
              const daysLeft = daysAgo!==null?10-daysAgo:null;
              return (
                <div key={car.id} onClick={()=>onCarClick(car)}
                  style={{background:dark?"#0f172a":"#ffffff",border:`1px solid ${dark?"#1e293b":"#e2e8f0"}`,borderLeft:"3px solid #818cf8",borderRadius:"8px",padding:"10px",cursor:"pointer",width:"190px",transition:"background 0.12s",boxShadow:dark?"none":"0 1px 3px rgba(0,0,0,0.05)"}}
                  onMouseEnter={e=>e.currentTarget.style.background=dark?"#1e293b":"#f8fafc"}
                  onMouseLeave={e=>e.currentTarget.style.background=dark?"#0f172a":"#ffffff"}>
                  <div style={{fontSize:"13px",fontWeight:700,color:dark?"#94a3b8":"#64748b",marginBottom:"2px",fontFamily:"'DM Sans',sans-serif",textTransform:"uppercase"}}>{car.year} {car.make} {car.model}</div>
                  <div style={{fontSize:"11px",color:dark?"#334155":"#94a3b8",marginBottom:"4px",fontFamily:"monospace"}}>#{car.stockNo}</div>
                  {car.acv&&<div style={{fontSize:"11px",color:dark?"#fbbf2466":"#d97706",marginBottom:"3px"}}>ACV {car.acv}</div>}
                  <div style={{fontSize:"10px",color:dark?"#4c1d95":"#7c3aed",fontWeight:700}}>{daysLeft!==null?`Purges in ${daysLeft}d`:"Sold"}</div>
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
function TableView({ cars, onCarClick, dupVINs, dark=false }) {
  const headers = ["Stock No","VIN","Year","Make","Model","Miles","ACV","R/W","Title","Keys","Issues","Payoff Sent","Title RCVD","Sent DMV","SPI Title","Reg Exp","SC Exp","In Svc","Svc Done","Body Shop","Detail","Photos","Frontline","Sold","T2L","Stage"];
  const dateFields = ["payoffSent","titleRcvd","sentDMV","spiTitle","regExp","scExp","inSvc","svcDone","bodyShop","detail","pics","frontline","soldDate"];
  const expiredFields = new Set(["regExp","scExp"]);
  const drag = useDragScroll();
  return (
    <div ref={drag.ref} onMouseDown={drag.onMouseDown} onMouseMove={drag.onMouseMove} onMouseUp={drag.onMouseUp} onMouseLeave={drag.onMouseLeave}
      style={{overflowX:"auto",WebkitOverflowScrolling:"touch",cursor:"grab",scrollbarWidth:"thin",background:dark?"transparent":"#ffffff",borderRadius:"8px",border:dark?"none":"1px solid #e2e8f0"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px",minWidth:"900px"}}>
        <thead>
          <tr>{headers.map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",color:dark?"#475569":"#64748b",fontWeight:700,fontSize:"10px",letterSpacing:"0.08em",textTransform:"uppercase",borderBottom:`1px solid ${dark?"#1e293b":"#e2e8f0"}`,whiteSpace:"nowrap",background:dark?"#060b14":"#f8fafc"}}>{h}</th>)}</tr>
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
                style={{cursor:"pointer",background:dark?(i%2===0?"#0a0f1a":"#0c1120"):(i%2===0?"#ffffff":"#f8fafc"),borderBottom:`1px solid ${dark?"#0f172a":"#f1f5f9"}`}}
                onMouseEnter={e=>e.currentTarget.style.background=dark?"#1e293b":"#eff6ff"}
                onMouseLeave={e=>e.currentTarget.style.background=dark?(i%2===0?"#0a0f1a":"#0c1120"):(i%2===0?"#ffffff":"#f8fafc")}>
                <td style={{padding:"8px 10px",fontFamily:"monospace",color:dark?"#94a3b8":"#475569",whiteSpace:"nowrap"}}>{car.stockNo}</td>
                <td style={{padding:"8px 10px",fontFamily:"monospace",color:isD?"#ea580c":"#475569",whiteSpace:"nowrap",fontSize:"11px",fontWeight:isD?700:400,background:isD?"#431407":"transparent"}}>
                  {car.vin||"—"}{isD?" ⚠":""}
                </td>
                <td style={{padding:"8px 10px",color:dark?"#cbd5e1":"#475569"}}>{car.year}</td>
                <td style={{padding:"8px 10px",color:dark?"#e2e8f0":"#1e293b",fontWeight:600,whiteSpace:"nowrap"}}>{car.make}</td>
                <td style={{padding:"8px 10px",color:dark?"#cbd5e1":"#475569",whiteSpace:"nowrap"}}>{car.model}</td>
                <td style={{padding:"8px 10px",color:dark?"#94a3b8":"#64748b",textAlign:"right"}}>{car.miles}</td>
                <td style={{padding:"8px 10px",color:dark?"#fbbf24":"#b45309",fontWeight:600,whiteSpace:"nowrap"}}>{car.acv||"—"}</td>
                <td style={{padding:"8px 10px",color:car.rw==="R"?"#4ade80":"#fb923c",fontWeight:700}}>{car.rw}</td>
                <td style={{padding:"8px 10px",color:car.titleState==="ML"?"#f87171":(dark?"#94a3b8":"#64748b")}}>{car.titleState}</td>
                <td style={{padding:"8px 10px",color:dark?"#94a3b8":"#64748b",textAlign:"center"}}>{car.keys}</td>
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
                    <td key={k} style={{padding:"8px 10px",color:expired?"#f87171":car[k]?(dark?"#60a5fa":"#2563eb"):(dark?"#1e293b":"#cbd5e1"),background:expired?(dark?"#3f0e0e":"#fff1f2"):"transparent",fontFamily:"monospace",whiteSpace:"nowrap",fontWeight:expired?700:400}}>
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


// ─── SETTINGS PANEL ──────────────────────────────────────────────────────────
function SettingsPanel({ dark, setDark, fontSize, setFontSize, highContrast, setHighContrast, onClose }) {
  const bg     = dark ? "#0f172a" : "#ffffff";
  const border = dark ? "#1e293b" : "#e2e8f0";
  const text   = dark ? "#e2e8f0" : "#1e293b";
  const sub    = dark ? "#64748b" : "#94a3b8";
  return (
    <div style={{position:"fixed",bottom:"72px",right:"20px",zIndex:9999,background:bg,border:`1px solid ${border}`,borderRadius:"14px",padding:"20px",width:"260px",boxShadow:dark?"0 8px 40px rgba(0,0,0,0.6)":"0 8px 40px rgba(0,0,0,0.15)",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
        <span style={{fontSize:"13px",fontWeight:800,color:text,letterSpacing:"0.04em",textTransform:"uppercase"}}>⚙ Settings</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:sub,cursor:"pointer",fontSize:"16px",padding:"0",lineHeight:1}}>✕</button>
      </div>
      {/* Dark Mode */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
        <div>
          <div style={{fontSize:"13px",fontWeight:600,color:text}}>Dark Mode</div>
          <div style={{fontSize:"11px",color:sub}}>Switch to dark theme</div>
        </div>
        <div onClick={()=>setDark(d=>!d)} style={{width:"42px",height:"24px",borderRadius:"12px",background:dark?"#3b82f6":"#e2e8f0",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
          <div style={{position:"absolute",top:"3px",left:dark?"21px":"3px",width:"18px",height:"18px",borderRadius:"50%",background:"#ffffff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
        </div>
      </div>
      {/* High Contrast */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
        <div>
          <div style={{fontSize:"13px",fontWeight:600,color:text}}>High Contrast</div>
          <div style={{fontSize:"11px",color:sub}}>Bolder colors & borders</div>
        </div>
        <div onClick={()=>setHighContrast(h=>!h)} style={{width:"42px",height:"24px",borderRadius:"12px",background:highContrast?"#f59e0b":"#e2e8f0",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
          <div style={{position:"absolute",top:"3px",left:highContrast?"21px":"3px",width:"18px",height:"18px",borderRadius:"50%",background:"#ffffff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
        </div>
      </div>
      {/* Font Size */}
      <div>
        <div style={{fontSize:"13px",fontWeight:600,color:text,marginBottom:"6px"}}>Font Size</div>
        <div style={{display:"flex",gap:"6px"}}>
          {[["S","12px"],["M","14px"],["L","16px"]].map(([label,size])=>(
            <button key={label} onClick={()=>setFontSize(size)} style={{flex:1,padding:"6px",borderRadius:"8px",border:`1px solid ${fontSize===size?(dark?"#3b82f6":"#2563eb"):border}`,background:fontSize===size?(dark?"#1e3a5f":"#eff6ff"):(dark?"#0f172a":"#f8fafc"),color:fontSize===size?(dark?"#93c5fd":"#2563eb"):text,fontWeight:700,fontSize:"12px",cursor:"pointer",transition:"all 0.15s",fontFamily:"'DM Sans',sans-serif"}}>{label}</button>
          ))}
        </div>
      </div>
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
  const searchRef                     = useRef(null);
  const [stageFilter, setStageFilter] = useState("all");
  const [rwFilter, setRwFilter]       = useState("all");
  const [notionMode, setNotionMode]   = useState(false);
  const [status, setStatus]           = useState("");
  const [loading, setLoading]         = useState(false);
  const [confetti, setConfetti]       = useState(false);
  const [splash, setSplash]           = useState(true);
  const [pwInput, setPwInput]         = useState("");
  const [pwError, setPwError]         = useState(false);
  const [pwUnlocked, setPwUnlocked]   = useState(false);
  const [connecting, setConnecting]   = useState(false);
  const [lastSynced, setLastSynced]   = useState(null);
  const [syncAgo, setSyncAgo]         = useState("");
  const [dark, setDark]               = useState(false);
  const [fontSize, setFontSize]       = useState("13px");
  const [highContrast, setHighContrast] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const toast = msg => { setStatus(msg); setTimeout(()=>setStatus(""),4000); };

  // ── Silent background poll every 30s when Notion mode is on ────────────────
  const silentPoll = useCallback(async () => {
    try {
      const data = await notionFetch(`/databases/${NOTION_DB_ID}/query`,"POST",{page_size:200});
      if (data.results) {
        const fresh = data.results.map(page=>{
          const p=page.properties, txt=k=>p[k]?.rich_text?.[0]?.plain_text||p[k]?.title?.[0]?.plain_text||"", dt=k=>p[k]?.date?.start||"";
          const mc={id:page.id,stockNo:txt("Stock No"),vin:txt("VIN"),year:txt("Year"),make:txt("Make"),model:txt("Model"),keys:p["Keys"]?.select?.name||"1",miles:txt("Miles"),acv:txt("ACV"),rw:p["R/W"]?.select?.name||"R",titleState:p["Title State"]?.select?.name||"HI",payoffBank:txt("Payoff Bank"),stage:p["Stage"]?.select?.name||"fresh",acquiredDate:dt("Acquired Date"),payoffSent:dt("Payoff Sent"),titleRcvd:dt("Title RCVD"),sentDMV:dt("Sent DMV"),spiTitle:dt("SPI Title RCVD"),regExp:dt("Reg Exp"),scExp:dt("SC Exp"),inSvc:dt("In Svc"),svcDone:dt("Svc Done"),bodyShop:dt("Body Shop"),detail:dt("Detail"),pics:dt("Pics"),frontline:dt("Frontline"),soldDate:dt("Sold Date"),notes:[]};
          mc.stageTimes=initStageTimes(mc);
          return mc;
        });
        // Merge remote data with local notes & stageTimes (preserve local overrides)
        setCars(prev => fresh.map(f => {
          const loc = prev.find(p=>p.id===f.id);
          return loc ? {...f, notes:loc.notes, stageTimes:loc.stageTimes||f.stageTimes} : f;
        }));
        setLastSynced(Date.now());
      }
    } catch(_) { /* silent — don't alert user on background errors */ }
  }, []);

  // Start/stop the 30-second interval when Notion mode toggles
  useEffect(() => {
    if (!notionMode) return;
    const id = setInterval(silentPoll, 30000);
    return () => clearInterval(id);
  }, [notionMode, silentPoll]);

  // Shift+S → focus search bar and paste clipboard VIN
  useEffect(() => {
    const handler = async e => {
      if (e.key === "S" && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Don't fire if user is typing in an input/textarea
        if (["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)) return;
        e.preventDefault();
        let clip = "";
        try { clip = (await navigator.clipboard.readText()).trim(); } catch {}
        setSearch(clip);
        setTimeout(() => { searchRef.current?.focus(); searchRef.current?.select(); }, 50);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Tick the "synced X ago" label every 5 seconds
  useEffect(() => {
    const id = setInterval(() => {
      if (!lastSynced) { setSyncAgo(""); return; }
      const sec = Math.floor((Date.now()-lastSynced)/1000);
      if (sec < 10)  setSyncAgo("just now");
      else if (sec < 60) setSyncAgo(sec+"s ago");
      else           setSyncAgo(Math.floor(sec/60)+"m ago");
    }, 5000);
    return () => clearInterval(id);
  }, [lastSynced]);

  const loadNotion = async () => {
    setLoading(true); toast("Fetching from Notion…");
    try {
      const data = await notionFetch(`/databases/${NOTION_DB_ID}/query`,"POST",{page_size:200});
      if (data.results) {
        const mapped = data.results.map(page=>{
          const p=page.properties, txt=k=>p[k]?.rich_text?.[0]?.plain_text||p[k]?.title?.[0]?.plain_text||"", dt=k=>p[k]?.date?.start||"";
          const mc={id:page.id,stockNo:txt("Stock No"),vin:txt("VIN"),year:txt("Year"),make:txt("Make"),model:txt("Model"),keys:p["Keys"]?.select?.name||"1",miles:txt("Miles"),acv:txt("ACV"),rw:p["R/W"]?.select?.name||"R",titleState:p["Title State"]?.select?.name||"HI",payoffBank:txt("Payoff Bank"),stage:p["Stage"]?.select?.name||"fresh",acquiredDate:dt("Acquired Date"),payoffSent:dt("Payoff Sent"),titleRcvd:dt("Title RCVD"),sentDMV:dt("Sent DMV"),spiTitle:dt("SPI Title RCVD"),regExp:dt("Reg Exp"),scExp:dt("SC Exp"),inSvc:dt("In Svc"),svcDone:dt("Svc Done"),bodyShop:dt("Body Shop"),detail:dt("Detail"),pics:dt("Pics"),frontline:dt("Frontline"),soldDate:dt("Sold Date"),notes:[]};
          mc.stageTimes=initStageTimes(mc);
          return mc;
        });
        setCars(mapped); setLastSynced(Date.now()); toast(`✓ Loaded ${mapped.length} vehicles`);
        setNotionMode(true); setSplash(false); setConnecting(false);

        // Auto-delete sold vehicles older than 20 days from Notion
        const toDelete = mapped.filter(c => c.stage === "sold" && soldDaysAgo(c) !== null && soldDaysAgo(c) >= 20 && c.id.includes("-"));
        for (const c of toDelete) {
          try { await notionFetch(`/pages/${c.id}`, "PATCH", { archived: true }); } catch {}
        }
        if (toDelete.length) toast(`🗑 Auto-archived ${toDelete.length} sold vehicle(s) from Notion (20+ days)`);
      }
    } catch(e) { toast(`❌ ${e.message}`); setConnecting(false); }
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
    // Track stage entry time if stage changed
    if (prev && prev.stage !== updated.stage) {
      const today = new Date().toISOString().split("T")[0];
      const st = {...(updated.stageTimes||prev.stageTimes||{})};
      if (!st[updated.stage]) st[updated.stage] = today;
      updated = {...updated, stageTimes:st};
    }
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
  const handleStageChange = (carId, newStage) => {
    setCars(cs=>cs.map(c=>{
      if(c.id!==carId) return c;
      const today = new Date().toISOString().split("T")[0];
      const st = {...(c.stageTimes||{})};
      if (!st[newStage]) st[newStage] = today;
      const updated = {...c, stage:newStage, stageTimes:st};
      if(newStage==="sold" && !updated.soldDate) updated.soldDate = today;
      if(notionMode) saveNotion(updated);
      // Fire confetti on sold
      if(c.stage!=="sold" && newStage==="sold") setTimeout(()=>setConfetti(true),50);
      return updated;
    }));
  };

  const activeCars = cars.filter(c=>{
    if(c.stage!=="sold") return true;
    const d = soldDaysAgo(c); return d===null||d<10;
  });
  const dupVINs = getDupVINs(activeCars);
  const filtered = activeCars.filter(c=>{
    const q=search.toLowerCase();
    return (!q||[c.stockNo,c.make,c.model,c.vin].some(v=>(v||"").toLowerCase().includes(q)))
        &&(stageFilter==="all"||c.stage===stageFilter)
        &&(rwFilter==="all"||c.rw===rwFilter);
  });


  // ─── SPLASH SCREEN ──────────────────────────────────────────────────────────
  if (splash) return (
    <div style={{minHeight:"100vh",background:"#060b14",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans','DM Mono',sans-serif",padding:"24px"}}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;600;800&display=swap');*{box-sizing:border-box;}"}</style>

      {/* Logo */}
      <img src="data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAQ4B4ADASIAAhEBAxEB/8QAHQABAAICAwEBAAAAAAAAAAAAAAcIBgkBAgUEA//EAGkQAQABAwMBAwUEDxMJBAkCBwABAgMEBQYRBwgSIRMxQVFhFCJxgQkVFhcYMjdWdZGTlLHR0iM2OEJSU1RydHaCkpWhsrO0wdMzNVVXYnOEosJDg8PhJCU0REVGY4Wj4ybiJ2VHZPDx/8QAHAEBAQEAAwEBAQAAAAAAAAAAAAECAwQFBgcI/8QAQREBAAECAgUHCgYBBAEFAQAAAAECEQMEBRIhMVEGExQVQVKRFjM1YYGCobHB0QciMlRx8OEjQlNicjSSorLS8f/aAAwDAQACEQMRAD8ApkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH//2Q=="
        alt="Servco Leeward"
        style={{
          width:"min(520px, 85vw)",
          marginBottom:"36px",
          opacity: 0.95,
        }}
      />

      {/* Title */}
      <div style={{
        fontSize:"clamp(15px,2.2vw,22px)",
        fontWeight:700,
        color:"#94a3b8",
        letterSpacing:"0.18em",
        textTransform:"uppercase",
        marginBottom:"10px",
        textAlign:"center",
      }}>
        Servco Leeward's Preowned
      </div>
      <div style={{
        fontSize:"clamp(22px,4vw,42px)",
        fontWeight:800,
        color:"#f1f5f9",
        letterSpacing:"0.04em",
        marginBottom:"6px",
        textAlign:"center",
        fontFamily:"'DM Sans',sans-serif",
      }}>
        Recon Pipeline
      </div>
      <div style={{
        fontSize:"12px",
        color:"#334155",
        fontWeight:700,
        letterSpacing:"0.2em",
        textTransform:"uppercase",
        marginBottom:"52px",
      }}>
        V 1 . 0
      </div>

      {/* Password gate */}
      {!pwUnlocked ? (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px",width:"100%",maxWidth:"320px"}}>
          <input
            type="password"
            placeholder="Enter password"
            value={pwInput}
            onChange={e=>{ setPwInput(e.target.value); setPwError(false); }}
            onKeyDown={e=>{
              if(e.key==="Enter"){
                if(pwInput==="vercel13"){ setPwUnlocked(true); setPwError(false); }
                else { setPwError(true); setPwInput(""); }
              }
            }}
            style={{
              width:"100%",
              background:"#0f172a",
              border:`1px solid ${pwError?"#dc2626":"#1e3a5f"}`,
              borderRadius:"10px",
              padding:"14px 18px",
              fontSize:"15px",
              color:"#e2e8f0",
              fontFamily:"'DM Mono',monospace",
              fontWeight:500,
              outline:"none",
              letterSpacing:"0.15em",
              textAlign:"center",
              boxShadow: pwError ? "0 0 0 3px rgba(220,38,38,0.2)" : "none",
              transition:"border 0.2s, box-shadow 0.2s",
            }}
          />
          {pwError && (
            <div style={{fontSize:"11px",color:"#f87171",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>
              ✕ Incorrect password
            </div>
          )}
          <button
            onClick={()=>{
              if(pwInput==="vercel13"){ setPwUnlocked(true); setPwError(false); }
              else { setPwError(true); setPwInput(""); }
            }}
            style={{
              background:"linear-gradient(135deg,#0ea5e9,#38bdf8)",
              color:"#fff",
              border:"none",
              borderRadius:"10px",
              padding:"14px 48px",
              fontSize:"15px",
              fontWeight:800,
              letterSpacing:"0.08em",
              textTransform:"uppercase",
              cursor:"pointer",
              boxShadow:"0 0 30px rgba(14,165,233,0.35)",
              transition:"all 0.2s",
              width:"100%",
            }}
          >
            Unlock
          </button>
        </div>
      ) : (
        /* Connect button — shown after password is correct */
        <button
          disabled={connecting}
          onClick={async () => {
            setConnecting(true);
            await loadNotion();
          }}
          style={{
            background: connecting ? "#0f172a" : "linear-gradient(135deg,#0ea5e9,#38bdf8)",
            color: connecting ? "#475569" : "#fff",
            border: connecting ? "1px solid #1e293b" : "none",
            borderRadius:"12px",
            padding:"16px 48px",
            fontSize:"16px",
            fontWeight:800,
            letterSpacing:"0.08em",
            textTransform:"uppercase",
            cursor: connecting ? "not-allowed" : "pointer",
            transition:"all 0.2s",
            boxShadow: connecting ? "none" : "0 0 40px rgba(14,165,233,0.4), 0 4px 20px rgba(0,0,0,0.4)",
            transform: connecting ? "scale(0.97)" : "scale(1)",
            minWidth:"200px",
          }}
        >
          {connecting ? "Connecting…" : "Connect"}
        </button>
      )}

      {/* Subtle footer */}
      <div style={{
        position:"absolute", bottom:"24px",
        fontSize:"10px", color:"#1e293b",
        letterSpacing:"0.1em", textTransform:"uppercase",
        fontWeight:700,
      }}>
        Powered by Notion
      </div>

      {status && (
        <div style={{
          position:"fixed", bottom:"60px",
          background: status.startsWith("❌") ? "#3f0e0e" : "#0f2a1a",
          border:`1px solid ${status.startsWith("❌")?"#dc2626":"#16a34a"}`,
          color: status.startsWith("❌") ? "#f87171" : "#4ade80",
          padding:"10px 20px", borderRadius:"8px",
          fontSize:"13px", fontWeight:700,
        }}>
          {status}
        </div>
      )}
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:dark?"#060b14":"#f1f5f9",color:dark?"#e2e8f0":"#1e293b",fontFamily:"'DM Mono','Fira Code','Courier New',monospace",fontSize:fontSize,filter:highContrast?"contrast(1.12)":"none"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;600;800&display=swap');
        *{box-sizing:border-box;}
        html,body,#root{margin:0;padding:0;background:${dark?"#060b14":"#f1f5f9"};}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:${dark?"#0f172a":"#e2e8f0"};}
        ::-webkit-scrollbar-thumb{background:${dark?"#334155":"#94a3b8"};border-radius:3px;}
        input[type=date]::-webkit-calendar-picker-indicator{filter:${dark?"invert(0.4)":"invert(0.6)"};}
        select option{background:${dark?"#1e293b":"#ffffff"};}
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
      <div style={{background:dark?"#0a0f1a":"#ffffff",borderBottom:`1px solid ${dark?"#1e293b":"#e2e8f0"}`,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100,boxShadow:dark?"none":"0 1px 3px rgba(0,0,0,0.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{width:"28px",height:"28px",background:"#dc2626",borderRadius:"6px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px",fontWeight:900,color:"#fff",fontFamily:"'DM Sans',sans-serif",flexShrink:0}}>S</div>
          <span style={{fontSize:"15px",fontWeight:800,color:dark?"#f1f5f9":"#1e293b",fontFamily:"'DM Sans',sans-serif",letterSpacing:"-0.02em"}}>SERVCO</span>
          <span className="nav-title" style={{color:"#334155",fontSize:"13px"}}>/</span>
          <span className="nav-title" style={{fontSize:"12px",color:dark?"#475569":"#64748b",fontFamily:"'DM Sans',sans-serif"}}>Recon Pipeline</span>
        </div>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          {notionMode&&!status&&syncAgo&&(
            <span style={{fontSize:"10px",color:"#475569",padding:"3px 8px",background:"#0f172a",border:"1px solid #1e293b",borderRadius:"6px",whiteSpace:"nowrap",fontFamily:"monospace"}}>
              ↻ {syncAgo}
            </span>
          )}
          {status&&<span style={{fontSize:"11px",color:"#4ade80",padding:"3px 8px",background:"#14532d33",border:"1px solid #15803d",borderRadius:"6px",whiteSpace:"nowrap"}}>{status}</span>}
          <button onClick={()=>{setNotionMode(n=>!n);if(!notionMode)loadNotion();}} style={{...btn(notionMode?"#1a2744":"#1e293b",notionMode?"#3b82f6":"#334155"),fontSize:"11px",padding:"5px 10px"}}>
            {notionMode?"🔗 Live":"🔗 Notion"}
          </button>
          <button onClick={()=>setShowSettings(s=>!s)} style={{...btn(dark?"#1e293b":"#f1f5f9",dark?"#334155":"#e2e8f0"),fontSize:"14px",padding:"5px 8px",color:dark?"#94a3b8":"#64748b"}} title="Settings">⚙</button>
          <button onClick={()=>setAdding(true)} style={{...btn("#14532d","#4ade80"),fontSize:"11px",padding:"5px 12px"}}>+ Add</button>
        </div>
      </div>

      {/* BODY */}
      <div style={{padding:"16px"}}>
        <StatsBar cars={cars}/>

        {/* CONTROLS */}
        <div className="controls-row" style={{display:"flex",gap:"8px",marginBottom:"14px",flexWrap:"wrap",alignItems:"center"}}>
          <input ref={searchRef} placeholder="Search stock #, VIN, make, model…" value={search} onChange={e=>setSearch(e.target.value)}
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

        <div style={{fontSize:"11px",color:dark?"#334155":"#94a3b8",marginBottom:"12px"}}>
          Showing <span style={{color:dark?"#64748b":"#475569",fontWeight:700}}>{filtered.length}</span> of {cars.length} vehicles
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
          ? <div style={{textAlign:"center",padding:"60px",color:dark?"#334155":"#94a3b8",fontSize:"14px"}}>Loading from Notion…</div>
          : view==="kanban"
            ? <KanbanView cars={filtered} onCarClick={setSelected} dupVINs={dupVINs} onStageChange={handleStageChange} dark={dark}/>
            : <TableView  cars={filtered} onCarClick={setSelected} dupVINs={dupVINs} dark={dark}/>
        }
      </div>

      {selected&&<CarModal car={selected} onClose={()=>setSelected(null)} onSave={handleSave} onDelete={handleDelete} dark={dark}/>}
      {adding&&<AddCarModal onClose={()=>setAdding(false)} onAdd={handleAdd} existingVINs={new Set(activeCars.filter(c=>c.vin).map(c=>c.vin.toUpperCase()))} dark={dark}/>}
      {showSettings&&<SettingsPanel dark={dark} setDark={setDark} fontSize={fontSize} setFontSize={setFontSize} highContrast={highContrast} setHighContrast={setHighContrast} onClose={()=>setShowSettings(false)}/>}
    </div>
  );
}
