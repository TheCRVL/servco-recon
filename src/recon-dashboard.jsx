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
  { id:"1", stockNo:"GVA05952", vin:"1FTBR1C80RKA05952", year:"2024", make:"Ford",   model:"Transit",      keys:"2", miles:"8,923",  acv:"$24,500", rw:"R", titleState:"HI", payoffBank:"Ally", acquiredDate:"2026-01-28", payoffSent:"2026-02-01", titleRcvd:"2026-02-08", sentDMV:"2026-02-09", spiTitle:"2026-02-18", regExp:"2026-12-01", scExp:"2026-11-15", inSvc:"2026-02-10", svcDone:"2026-02-13", bodyShop:"",         detail:"2026-02-14", pics:"2026-02-15", frontline:"2026-02-16", soldDate:"", stage:"frontline",  notes:[{text:"Detail and photos done. Frontline ready.",author:"Kapono",date:"2026-02-15"}], stageTimes:{fresh:"2026-01-28",service:"2026-02-10",detail:"2026-02-14",photos:"2026-02-15",frontline:"2026-02-16"}, partsHold:false,needsBodyWork:false,upForSale:false },
  { id:"2", stockNo:"WKA305P",  vin:"1N6BA1F42RN305002", year:"2016", make:"Nissan", model:"NV Passenger", keys:"1", miles:"83,422", acv:"$8,200",  rw:"R", titleState:"HI", payoffBank:"",     acquiredDate:"2026-01-20", payoffSent:"",          titleRcvd:"",          sentDMV:"",          spiTitle:"",          regExp:"2026-03-10", scExp:"2026-02-10", inSvc:"2026-02-20", svcDone:"",          bodyShop:"",         detail:"",           pics:"",          frontline:"",           soldDate:"", stage:"service",    notes:[{text:"Going in next available on heavy duty rack.",author:"Conrad",date:"2026-02-28"},{text:"HVAC heaterhose ordered from dealer.",author:"Lyie B",date:"2025-12-15"}], partsHold:false,needsBodyWork:false,upForSale:false, stageTimes:{fresh:"2026-01-20",service:"2026-02-20"} },
  { id:"3", stockNo:"SFB53904", vin:"1C6JJTBG5NL153904", year:"2022", make:"Jeep",   model:"Gladiator",    keys:"2", miles:"62,088", acv:"$31,000", rw:"R", titleState:"ML", payoffBank:"Ally", acquiredDate:"2026-02-10", payoffSent:"2026-02-12", titleRcvd:"",          sentDMV:"",          spiTitle:"",          regExp:"2026-01-15", scExp:"",           inSvc:"",           svcDone:"",          bodyShop:"",         detail:"",           pics:"",          frontline:"",           soldDate:"", stage:"title_work", notes:[{text:"Mainland bank — Ally. Payoff check mailed 2/12.",author:"Michelle P",date:"2026-02-12"}], partsHold:false,needsBodyWork:false,upForSale:false, stageTimes:{fresh:"2026-02-10",title_work:"2026-02-10"} },
  { id:"4", stockNo:"TYA22101", vin:"2T1BURHE0NC022101", year:"2023", make:"Toyota", model:"Corolla",      keys:"1", miles:"24,500", acv:"$18,750", rw:"R", titleState:"HI", payoffBank:"",     acquiredDate:"2026-02-15", payoffSent:"",          titleRcvd:"2026-02-22", sentDMV:"",          spiTitle:"",          regExp:"",           scExp:"2026-02-01", inSvc:"",           svcDone:"",          bodyShop:"",         detail:"",           pics:"",          frontline:"",           soldDate:"", stage:"reg_safety", notes:[{text:"Failed safety check. Needs fresh SC before detail.",author:"Kapono",date:"2026-02-25"}], partsHold:false,needsBodyWork:false,upForSale:false, stageTimes:{fresh:"2026-02-15",reg_safety:"2026-02-22"} },
  { id:"5", stockNo:"HNA88231", vin:"5FNYF6H09NB088231", year:"2021", make:"Honda",  model:"Pilot",        keys:"2", miles:"41,200", acv:"$22,000", rw:"R", titleState:"HI", payoffBank:"",     acquiredDate:"2026-02-20", payoffSent:"",          titleRcvd:"",          sentDMV:"",          spiTitle:"",          regExp:"",           scExp:"",           inSvc:"2026-02-26", svcDone:"2026-03-01", bodyShop:"2026-03-01",detail:"",           pics:"",          frontline:"",           soldDate:"", stage:"body_shop",  notes:[{text:"Minor bumper repair. Sent to sublet body shop.",author:"Tony",date:"2026-03-01"}], partsHold:false,needsBodyWork:false,upForSale:false, stageTimes:{fresh:"2026-02-20",service:"2026-02-26",body_shop:"2026-03-01"} },
  { id:"6", stockNo:"MZA91045", vin:"JM3KFBCM1L0391045", year:"2020", make:"Mazda",  model:"CX-5",         keys:"1", miles:"55,100", acv:"$14,200", rw:"W", titleState:"HI", payoffBank:"",     acquiredDate:"2026-03-01", payoffSent:"",          titleRcvd:"",          sentDMV:"",          spiTitle:"",          regExp:"",           scExp:"",           inSvc:"",           svcDone:"",          bodyShop:"",         detail:"",           pics:"",          frontline:"",           soldDate:"", stage:"fresh",      notes:[{text:"Just acquired. Decide R or W by tomorrow.",author:"Kapono",date:"2026-03-01"}], partsHold:false,needsBodyWork:false,upForSale:false, stageTimes:{fresh:"2026-03-01"} },
  { id:"7", stockNo:"KIA77432",  vin:"5XXG14J27PG077432", year:"2023", make:"Kia",    model:"Sportage",     keys:"2", miles:"19,800", acv:"$26,500", rw:"R", titleState:"HI", payoffBank:"",     acquiredDate:"2026-01-10", payoffSent:"",          titleRcvd:"",          sentDMV:"",          spiTitle:"",          regExp:"",           scExp:"",           inSvc:"",           svcDone:"",          bodyShop:"",         detail:"",           pics:"",          frontline:"2026-02-01", soldDate:"2026-02-15", stage:"sold",       notes:[{text:"Sold 2/15. Deal funded.",author:"Kapono",date:"2026-02-15"}], partsHold:false,needsBodyWork:false,upForSale:false, stageTimes:{fresh:"2026-01-10",frontline:"2026-02-01",sold:"2026-02-15"} },
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
    if (car.partsHold)                  tags.push({ label:"PARTS HOLD",     color:"#f59e0b", bg:"#2d1b00" });
    if (car.needsBodyWork)              tags.push({ label:"NEEDS BODY WORK", color:"#22d3ee", bg:"#0a2030" });
    if (car.upForSale)                  tags.push({ label:"UP FOR SALE",     color:"#4ade80", bg:"#052e16" });
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
    if (car.partsHold)                  tags.push({ label:"PARTS HOLD",     color:"#ffffff", bg:"#d97706" });
    if (car.needsBodyWork)              tags.push({ label:"NEEDS BODY WORK", color:"#ffffff", bg:"#0891b2" });
    if (car.upForSale)                  tags.push({ label:"UP FOR SALE",     color:"#ffffff", bg:"#16a34a" });
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
    "Parts Hold":    {checkbox: !!car.partsHold},
    "Needs Body Work":{checkbox: !!car.needsBodyWork},
    "Up For Sale":   {checkbox: !!car.upForSale},
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
  const stuck      = cars.filter(c=>daysSince(c.acquiredDate)>21&&!["frontline","sold"].includes(c.stage)).length;
  const inProgress = cars.filter(c=>!["frontline","fresh","sold"].includes(c.stage)).length;
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
  // Convert YYYY-MM-DD → MM/YY for display
  const toMMYY = d => {
    if (!d) return "";
    const m = d.match(/^(\d{4})-(\d{2})/);
    return m ? `${m[2]}/${m[1].slice(2)}` : "";
  };
  // Convert MM/YY → YYYY-MM-DD (last day of that month)
  const fromMMYY = s => {
    const m = s.match(/^(\d{2})\/(\d{2})$/);
    if (!m) return "";
    const month = m[1], year = "20" + m[2];
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    return `${year}-${month}-${String(lastDay).padStart(2,"0")}`;
  };
  const [raw, setRaw] = useState(toMMYY(form[fkey]));
  // Sync if external form value changes (e.g. car switch)
  const prevKey = useRef(fkey + form[fkey]);
  if (prevKey.current !== fkey + form[fkey]) {
    prevKey.current = fkey + form[fkey];
    const synced = toMMYY(form[fkey]);
    if (synced !== raw) setRaw(synced);
  }
  const expired = isExpired(form[fkey]);
  const handleChange = e => {
    let v = e.target.value.replace(/[^0-9/]/g,"");
    // Auto-insert slash: if user typed 2nd digit without slash, insert it
    if (v.length === 2 && raw.length === 1) v = v + "/";
    if (v.length > 5) return;
    setRaw(v);
    const converted = fromMMYY(v);
    if (converted) set(fkey, converted);
    else if (v === "") set(fkey, "");
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
      <label style={{fontSize:"10px",color:expired?"#dc2626":dark?"#64748b":"#94a3b8",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>
        {label}{expired?" ⚠ EXPIRED":""}
      </label>
      <input
        type="text"
        placeholder="MM/YY"
        maxLength={5}
        value={raw}
        onChange={handleChange}
        style={{...input({},dark),
          border:expired?"1px solid #dc2626":dark?"1px solid #334155":"1px solid #e2e8f0",
          color:expired?"#dc2626":dark?"#e2e8f0":"#1e293b",
          background:expired?(dark?"#3f0e0e":"#fee2e2"):dark?"#1e293b":"#f8fafc",
          letterSpacing:"0.08em", textAlign:"center",
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
  const [modalTab, setModalTab]           = useState("main");

  // Freeze the original car snapshot on first render — compare against this
  // rather than the car prop (which may drift if parent re-renders)
  const originalSnapshot = useRef(JSON.stringify(car));
  const isDirty = JSON.stringify(form) !== originalSnapshot.current;

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

        {/* Tab bar */}
        <div style={{display:"flex",gap:"4px",marginBottom:"16px",borderBottom:`1px solid ${dark?"#1e293b":"#e2e8f0"}`,paddingBottom:"0"}}>
          {["main","toggles"].map(tab=>(
            <button key={tab} onClick={()=>setModalTab(tab)} style={{
              background:"none",border:"none",borderBottom:`2px solid ${modalTab===tab?(dark?"#38bdf8":"#2563eb"):"transparent"}`,
              color:modalTab===tab?(dark?"#38bdf8":"#2563eb"):(dark?"#64748b":"#94a3b8"),
              fontWeight:700,fontSize:"11px",letterSpacing:"0.08em",textTransform:"uppercase",
              padding:"8px 14px",cursor:"pointer",transition:"all 0.15s",fontFamily:"inherit",
              marginBottom:"-1px",
            }}>
              {tab==="main"?"Details":"⚙ Toggles"}
            </button>
          ))}
        </div>

        {modalTab==="toggles" ? (
          /* ── TOGGLES TAB ── */
          <div style={{display:"flex",flexDirection:"column",gap:"12px",paddingBottom:"16px"}}>
            <div style={{fontSize:"10px",color:dark?"#64748b":"#94a3b8",fontWeight:700,letterSpacing:"0.1em",marginBottom:"4px"}}>MANUAL FLAGS — no automatic pipeline trigger</div>
            {[
              {key:"partsHold",     label:"Parts Hold",      desc:"Waiting on a part before recon can continue",  color:"#f59e0b"},
              {key:"needsBodyWork", label:"Needs Body Work",  desc:"Requires body repair — route to body shop",     color:"#22d3ee"},
              {key:"upForSale",     label:"Up For Sale",      desc:"Actively listed / available for purchase",      color:"#4ade80"},
            ].map(({key,label,desc,color})=>(
              <div key={key}
                onClick={()=>set(key,!form[key])}
                style={{
                  display:"flex",alignItems:"center",justifyContent:"space-between",
                  background:form[key]?(dark?color+"22":color+"18"):(dark?"#0f172a":"#f8fafc"),
                  border:`1px solid ${form[key]?color:(dark?"#1e293b":"#e2e8f0")}`,
                  borderRadius:"10px",padding:"12px 14px",cursor:"pointer",transition:"all 0.15s",
                  userSelect:"none",
                }}>
                <div>
                  <div style={{fontWeight:700,fontSize:"13px",color:form[key]?color:(dark?"#cbd5e1":"#1e293b"),marginBottom:"2px"}}>{label}</div>
                  <div style={{fontSize:"11px",color:dark?"#475569":"#94a3b8"}}>{desc}</div>
                </div>
                {/* Toggle switch */}
                <div style={{
                  width:"40px",height:"22px",borderRadius:"11px",flexShrink:0,
                  background:form[key]?color:(dark?"#334155":"#cbd5e1"),
                  position:"relative",transition:"background 0.2s",
                }}>
                  <div style={{
                    position:"absolute",top:"3px",left:form[key]?"21px":"3px",
                    width:"16px",height:"16px",borderRadius:"50%",background:"#fff",
                    transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",
                  }}/>
                </div>
              </div>
            ))}
          </div>
        ) : (
        /* ── MAIN DETAILS TAB ── */
        <div>

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

        </div>{/* end main tab inner wrapper */}
        </div>){/* end tab conditional */}

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
  // Columns that support sorting → map header label to car field key
  const SORTABLE = {"Stock No":"stockNo","VIN":"vin","Make":"make","Model":"model"};
  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const toggleSort = col => {
    if (!SORTABLE[col]) return;
    const field = SORTABLE[col];
    setSortBy(prev => {
      if (prev === field) { setSortDir(d => d==="asc"?"desc":"asc"); return field; }
      setSortDir("asc"); return field;
    });
  };
  const sorted = [...cars].sort((a,b)=>{
    if (!sortBy) return 0;
    const av = (a[sortBy]||"").toString().toLowerCase();
    const bv = (b[sortBy]||"").toString().toLowerCase();
    return sortDir==="asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  });
  const drag = useDragScroll();
  return (
    <div ref={drag.ref} onMouseDown={drag.onMouseDown} onMouseMove={drag.onMouseMove} onMouseUp={drag.onMouseUp} onMouseLeave={drag.onMouseLeave}
      style={{overflowX:"auto",WebkitOverflowScrolling:"touch",cursor:"grab",scrollbarWidth:"thin",background:dark?"transparent":"#ffffff",borderRadius:"8px",border:dark?"none":"1px solid #e2e8f0"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px",minWidth:"900px"}}>
        <thead>
          <tr>{headers.map(h=>{
            const isSortable = !!SORTABLE[h];
            const isActive   = sortBy === SORTABLE[h];
            return (
              <th key={h}
                onClick={()=>toggleSort(h)}
                style={{padding:"8px 10px",textAlign:"left",color:isActive?(dark?"#38bdf8":"#2563eb"):(dark?"#475569":"#64748b"),fontWeight:700,fontSize:"10px",letterSpacing:"0.08em",textTransform:"uppercase",borderBottom:`1px solid ${dark?"#1e293b":"#e2e8f0"}`,whiteSpace:"nowrap",background:dark?"#060b14":"#f8fafc",cursor:isSortable?"pointer":"default",userSelect:"none",transition:"color 0.15s"}}>
                {h}{isSortable ? (isActive ? (sortDir==="asc"?" ↑":" ↓") : " ↕") : ""}
              </th>
            );
          })}</tr>
        </thead>
        <tbody>
          {sorted.map((car,i)=>{
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
                <td style={{padding:"8px 10px",color:dark?"#e2e8f0":"#1e293b",fontWeight:600,whiteSpace:"nowrap",textTransform:"uppercase"}}>{car.make}</td>
                <td style={{padding:"8px 10px",color:dark?"#cbd5e1":"#475569",whiteSpace:"nowrap",textTransform:"uppercase"}}>{car.model}</td>
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
                      {expiredFields.has(k)
                        ? ((m=>m?`${m[2]}/${m[1].slice(2)}`:"—")(car[k]?.match(/^(\d{4})-(\d{2})/)))||"—"
                        : (fmtDate(car[k])||"—")}
                      {expired?" ⚠":""}
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
          const mc={id:page.id,stockNo:txt("Stock No"),vin:txt("VIN"),year:txt("Year"),make:txt("Make"),model:txt("Model"),keys:p["Keys"]?.select?.name||"1",miles:txt("Miles"),acv:txt("ACV"),rw:p["R/W"]?.select?.name||"R",titleState:p["Title State"]?.select?.name||"HI",payoffBank:txt("Payoff Bank"),stage:p["Stage"]?.select?.name||"fresh",acquiredDate:dt("Acquired Date"),payoffSent:dt("Payoff Sent"),titleRcvd:dt("Title RCVD"),sentDMV:dt("Sent DMV"),spiTitle:dt("SPI Title RCVD"),regExp:dt("Reg Exp"),scExp:dt("SC Exp"),inSvc:dt("In Svc"),svcDone:dt("Svc Done"),bodyShop:dt("Body Shop"),detail:dt("Detail"),pics:dt("Pics"),frontline:dt("Frontline"),soldDate:dt("Sold Date"),partsHold:!!(p["Parts Hold"]?.checkbox),needsBodyWork:!!(p["Needs Body Work"]?.checkbox),upForSale:!!(p["Up For Sale"]?.checkbox),notes:[]};
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
          const mc={id:page.id,stockNo:txt("Stock No"),vin:txt("VIN"),year:txt("Year"),make:txt("Make"),model:txt("Model"),keys:p["Keys"]?.select?.name||"1",miles:txt("Miles"),acv:txt("ACV"),rw:p["R/W"]?.select?.name||"R",titleState:p["Title State"]?.select?.name||"HI",payoffBank:txt("Payoff Bank"),stage:p["Stage"]?.select?.name||"fresh",acquiredDate:dt("Acquired Date"),payoffSent:dt("Payoff Sent"),titleRcvd:dt("Title RCVD"),sentDMV:dt("Sent DMV"),spiTitle:dt("SPI Title RCVD"),regExp:dt("Reg Exp"),scExp:dt("SC Exp"),inSvc:dt("In Svc"),svcDone:dt("Svc Done"),bodyShop:dt("Body Shop"),detail:dt("Detail"),pics:dt("Pics"),frontline:dt("Frontline"),soldDate:dt("Sold Date"),partsHold:!!(p["Parts Hold"]?.checkbox),needsBodyWork:!!(p["Needs Body Work"]?.checkbox),upForSale:!!(p["Up For Sale"]?.checkbox),notes:[]};
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
    <div style={{minHeight:"100vh",background:"#ffffff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans','DM Mono',sans-serif",padding:"24px"}}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;600;800&display=swap');*{box-sizing:border-box;}"}</style>

      {/* Logo */}
      <div style={{background:"#060b14",borderRadius:"16px",overflow:"hidden",width:"min(520px,85vw)",marginBottom:"36px",boxShadow:"0 8px 40px rgba(0,0,0,0.13)"}}>
        <img
          src="/servco-logo.svg"
          alt="Servco Leeward"
          style={{width:"100%",display:"block"}}
        />
      </div>

      {/* Title */}
      <div style={{
        fontSize:"clamp(15px,2.2vw,22px)",
        fontWeight:700,
        color:"#475569",
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
        color:"#0f172a",
        letterSpacing:"0.04em",
        marginBottom:"6px",
        textAlign:"center",
        fontFamily:"'DM Sans',sans-serif",
      }}>
        Recon Pipeline
      </div>
      <div style={{
        fontSize:"12px",
        color:"#64748b",
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
              background:"#f8fafc",
              border:`1px solid ${pwError?"#dc2626":"#cbd5e1"}`,
              borderRadius:"10px",
              padding:"14px 18px",
              fontSize:"15px",
              color:"#0f172a",
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
            background: connecting ? "#f1f5f9" : "linear-gradient(135deg,#0ea5e9,#38bdf8)",
            color: connecting ? "#64748b" : "#fff",
            border: connecting ? "1px solid #e2e8f0" : "none",
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
        fontSize:"10px", color:"#94a3b8",
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
          Showing <span style={{color:dark?"#64748b":"#475569",fontWeight:700}}>{filtered.length}</span> of {activeCars.filter(c=>c.stage!=="sold").length} vehicles
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
