import { useState } from "react";

// ─── NOTION CONFIG ────────────────────────────────────────────────────────────
// Replace these before deploying:
// 1. Go to https://www.notion.so/my-integrations → create integration → copy token
// 2. Share your Notion database with that integration
// 3. Copy the database ID from the database URL
const NOTION_TOKEN = "YOUR_NOTION_INTEGRATION_TOKEN";
const NOTION_DB_ID = "YOUR_NOTION_DATABASE_ID";
const PROXY        = "https://corsproxy.io/?url=";

// ─── PIPELINE STAGES ─────────────────────────────────────────────────────────
const STAGES = [
  { id: "in_transit",    label: "In Transit",      color: "#475569", accent: "#94a3b8" },
  { id: "trade_hold",    label: "Trade Hold",       color: "#991b1b", accent: "#f87171" },
  { id: "title_work",    label: "Title Work",       color: "#6d28d9", accent: "#a78bfa" },
  { id: "reg_safety",    label: "Reg / Safety",     color: "#92400e", accent: "#fbbf24" },
  { id: "service",       label: "In Service",       color: "#1e40af", accent: "#60a5fa" },
  { id: "body_shop",     label: "Body Shop",        color: "#0e7490", accent: "#22d3ee" },
  { id: "detail_photos", label: "Detail / Photos",  color: "#065f46", accent: "#34d399" },
  { id: "frontline",     label: "Frontline ✓",      color: "#14532d", accent: "#4ade80" },
];

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = [
  { id:"1", stockNo:"GVA05952", vin:"1FTBR1C80RKA05952", year:"2024", make:"Ford",   model:"Transit",     keys:"2", miles:"8,923",  rw:"R", titleState:"HI", payoffBank:"Ally",  acquiredDate:"2026-01-28", payoffSent:"2026-02-01", titleRcvd:"2026-02-08", sentDMV:"2026-02-09", spiTitle:"2026-02-18", regExp:"",           scExp:"",           inSvc:"2026-02-10", svcDone:"2026-02-13", bodyShop:"",          detail:"2026-02-14", pics:"2026-02-15", frontline:"2026-02-16", stage:"frontline",    notes:[{text:"Detail and photos done. Frontline ready.",author:"Kapono",date:"2026-02-15"}] },
  { id:"2", stockNo:"WKA305P",  vin:"1N6BA1F42RN305002",  year:"2016", make:"Nissan", model:"NV Passenger",keys:"1", miles:"83,422", rw:"R", titleState:"HI", payoffBank:"",      acquiredDate:"2026-01-20", payoffSent:"",           titleRcvd:"",           sentDMV:"",           spiTitle:"",          regExp:"2026-03-10", scExp:"2026-02-10", inSvc:"2026-02-20", svcDone:"",          bodyShop:"",          detail:"",           pics:"",          frontline:"",           stage:"service",      notes:[{text:"Going in next available on heavy duty rack.",author:"Conrad",date:"2026-02-28"},{text:"HVAC heaterhose ordered from dealer.",author:"Lyie B",date:"2025-12-15"}] },
  { id:"3", stockNo:"SFB53904", vin:"1C6JJTBG5NL153904",  year:"2022", make:"Jeep",   model:"Gladiator",   keys:"2", miles:"62,088", rw:"R", titleState:"ML", payoffBank:"Ally",  acquiredDate:"2026-02-10", payoffSent:"2026-02-12", titleRcvd:"",           sentDMV:"",           spiTitle:"",          regExp:"2026-01-15", scExp:"",           inSvc:"",           svcDone:"",          bodyShop:"",          detail:"",           pics:"",          frontline:"",           stage:"title_work",   notes:[{text:"Mainland bank — Ally. Payoff check mailed 2/12.",author:"Michelle P",date:"2026-02-12"},{text:"Reg expired 1/15. Needs renewal.",author:"Kapono",date:"2026-02-14"}] },
  { id:"4", stockNo:"TYA22101", vin:"2T1BURHE0NC022101",  year:"2023", make:"Toyota", model:"Corolla",     keys:"1", miles:"24,500", rw:"R", titleState:"HI", payoffBank:"",      acquiredDate:"2026-02-15", payoffSent:"",           titleRcvd:"2026-02-22", sentDMV:"",           spiTitle:"",          regExp:"",           scExp:"2026-02-01", inSvc:"",           svcDone:"",          bodyShop:"",          detail:"",           pics:"",          frontline:"",           stage:"reg_safety",   notes:[{text:"Failed safety check. Needs fresh SC before detail.",author:"Kapono",date:"2026-02-25"}] },
  { id:"5", stockNo:"HNA88231", vin:"5FNYF6H09NB088231",  year:"2021", make:"Honda",  model:"Pilot",       keys:"2", miles:"41,200", rw:"R", titleState:"HI", payoffBank:"",      acquiredDate:"2026-02-20", payoffSent:"",           titleRcvd:"",           sentDMV:"",           spiTitle:"",          regExp:"",           scExp:"",           inSvc:"2026-02-26", svcDone:"2026-03-01", bodyShop:"2026-03-01",detail:"",           pics:"",          frontline:"",           stage:"body_shop",    notes:[{text:"Minor bumper repair. Sent to sublet body shop.",author:"Tony",date:"2026-03-01"}] },
  { id:"6", stockNo:"MZA91045", vin:"JM3KFBCM1L0391045",  year:"2020", make:"Mazda",  model:"CX-5",        keys:"1", miles:"55,100", rw:"W", titleState:"HI", payoffBank:"",      acquiredDate:"2026-03-01", payoffSent:"",           titleRcvd:"",           sentDMV:"",           spiTitle:"",          regExp:"",           scExp:"",           inSvc:"",           svcDone:"",          bodyShop:"",          detail:"",           pics:"",          frontline:"",           stage:"in_transit",   notes:[{text:"Just acquired. Kapono to decide W or R by tomorrow.",author:"Kapono",date:"2026-03-01"}] },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const TODAY     = new Date(); TODAY.setHours(0,0,0,0);
const daysSince = d => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null;
const fmtDate   = d => d ? new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "";
const stageOf   = id => STAGES.find(s => s.id === id) || STAGES[0];
const isExpired = d => { if (!d) return false; const exp = new Date(d); exp.setHours(0,0,0,0); return exp < TODAY; };
const t2lBadge  = days => {
  if (days === null) return { bg:"#1e293b", fg:"#64748b", label:"—" };
  if (days <=  7)    return { bg:"#14532d", fg:"#4ade80", label:`${days}d` };
  if (days <= 14)    return { bg:"#713f12", fg:"#fbbf24", label:`${days}d` };
  if (days <= 21)    return { bg:"#7c2d12", fg:"#fb923c", label:`${days}d` };
                     return { bg:"#7f1d1d", fg:"#f87171", label:`${days}d ⚠` };
};

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
  const url = `${PROXY}${encodeURIComponent(`https://api.notion.com/v1${path}`)}`;
  const res = await fetch(url, {
    method,
    headers:{ "Authorization":`Bearer ${NOTION_TOKEN}`, "Notion-Version":"2022-06-28", "Content-Type":"application/json" },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return res.json();
}

function carToNotion(car) {
  const rt  = v => ({ rich_text: [{ text: { content: v||"" } }] });
  const dt  = v => v ? { date: { start: v } } : { date: null };
  return {
    "Stock No":       { title: [{ text: { content: car.stockNo||"" } }] },
    "VIN":            rt(car.vin),
    "Year":           rt(car.year),  "Make": rt(car.make), "Model": rt(car.model),
    "Keys":           { select:{ name: car.keys||"1" } },
    "Miles":          rt(car.miles), "R/W": { select:{ name: car.rw||"R" } },
    "Title State":    { select:{ name: car.titleState||"HI" } },
    "Payoff Bank":    rt(car.payoffBank),
    "Stage":          { select:{ name: car.stage||"in_transit" } },
    "Acquired Date":  dt(car.acquiredDate), "Payoff Sent": dt(car.payoffSent),
    "Title RCVD":     dt(car.titleRcvd),    "Sent DMV":    dt(car.sentDMV),
    "SPI Title RCVD": dt(car.spiTitle),     "Reg Exp":     dt(car.regExp),
    "SC Exp":         dt(car.scExp),        "In Svc":      dt(car.inSvc),
    "Svc Done":       dt(car.svcDone),      "Body Shop":   dt(car.bodyShop),
    "Detail":         dt(car.detail),       "Pics":        dt(car.pics),
    "Frontline":      dt(car.frontline),
  };
}

// ─── STATS BAR ────────────────────────────────────────────────────────────────
function StatsBar({ cars }) {
  const frontline  = cars.filter(c => c.stage === "frontline").length;
  const stuck      = cars.filter(c => daysSince(c.acquiredDate) > 21 && c.stage !== "frontline").length;
  const inProgress = cars.filter(c => !["frontline","in_transit"].includes(c.stage)).length;
  const doneCars   = cars.filter(c => c.frontline && c.acquiredDate);
  const avgT2L     = doneCars.length ? Math.round(doneCars.reduce((s,c) => s + daysSince(c.acquiredDate), 0) / doneCars.length) : null;

  const Stat = ({label, value, color}) => (
    <div style={{textAlign:"center", padding:"0 24px"}}>
      <div style={{fontSize:"30px", fontWeight:900, color, fontFamily:"'DM Mono',monospace"}}>{value}</div>
      <div style={{fontSize:"10px", color:"#475569", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginTop:"3px"}}>{label}</div>
    </div>
  );

  return (
    <div style={{
      display:"flex", gap:"0", justifyContent:"center", alignItems:"center",
      background:"#0a0f1a", border:"1px solid #1e293b", borderRadius:"12px",
      padding:"20px", marginBottom:"24px", flexWrap:"wrap",
    }}>
      <Stat label="Total Inventory"  value={cars.length}           color="#94a3b8" />
      <div style={{width:"1px", height:"40px", background:"#1e293b"}}/>
      <Stat label="Frontline Ready"  value={frontline}             color="#4ade80" />
      <div style={{width:"1px", height:"40px", background:"#1e293b"}}/>
      <Stat label="In Progress"      value={inProgress}            color="#60a5fa" />
      <div style={{width:"1px", height:"40px", background:"#1e293b"}}/>
      <Stat label="Stuck 21d+"       value={stuck}                 color="#f87171" />
      <div style={{width:"1px", height:"40px", background:"#1e293b"}}/>
      <Stat label="Avg T2L (done)"   value={avgT2L ? `${avgT2L}d` : "—"} color="#fbbf24" />
    </div>
  );
}

// ─── NOTE THREAD ─────────────────────────────────────────────────────────────
function NoteThread({ notes, onAdd }) {
  const [text, setText]     = useState("");
  const [author, setAuthor] = useState("");
  return (
    <div style={{marginTop:"12px"}}>
      <div style={{fontSize:"10px", fontWeight:700, color:"#64748b", letterSpacing:"0.1em", marginBottom:"8px"}}>NOTES LOG</div>
      <div style={{display:"flex", flexDirection:"column", gap:"6px", maxHeight:"160px", overflowY:"auto", marginBottom:"10px"}}>
        {notes.length === 0 && <div style={{color:"#334155", fontSize:"12px", fontStyle:"italic"}}>No notes yet.</div>}
        {notes.map((n,i) => (
          <div key={i} style={{background:"#060b14", border:"1px solid #1e293b", borderRadius:"6px", padding:"8px 10px"}}>
            <div style={{fontSize:"11px", color:"#94a3b8", marginBottom:"3px"}}>
              <span style={{color:"#e2e8f0", fontWeight:600}}>{n.author}</span> · {fmtDate(n.date)}
            </div>
            <div style={{fontSize:"13px", color:"#cbd5e1", lineHeight:"1.5"}}>{n.text}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex", gap:"6px"}}>
        <input placeholder="Name" value={author} onChange={e=>setAuthor(e.target.value)} style={input({width:"100px"})} />
        <input placeholder="Add a note… (Enter to submit)" value={text} onChange={e=>setText(e.target.value)}
          onKeyDown={e => { if (e.key==="Enter" && text && author) { onAdd({text,author,date:new Date().toISOString().split("T")[0]}); setText(""); }}}
          style={input({flex:1})} />
        <button onClick={()=>{ if(text&&author){ onAdd({text,author,date:new Date().toISOString().split("T")[0]}); setText(""); }}} style={btn("#1e40af","#3b82f6")}>Add</button>
      </div>
    </div>
  );
}

// ─── CAR DETAIL MODAL ────────────────────────────────────────────────────────
function CarModal({ car, onClose, onSave }) {
  const [form, setForm] = useState({...car});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const Field = ({label, fkey, type="text"}) => (
    <div style={{display:"flex", flexDirection:"column", gap:"4px"}}>
      <label style={{fontSize:"10px", color:"#64748b", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase"}}>{label}</label>
      <input type={type} value={form[fkey]||""} onChange={e=>set(fkey,e.target.value)} style={input()} />
    </div>
  );
  const Select = ({label, fkey, options}) => (
    <div style={{display:"flex", flexDirection:"column", gap:"4px"}}>
      <label style={{fontSize:"10px", color:"#64748b", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase"}}>{label}</label>
      <select value={form[fkey]||""} onChange={e=>set(fkey,e.target.value)} style={input()}>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
  // Date field with expired highlight
  const ExpField = ({label, fkey}) => {
    const expired = isExpired(form[fkey]);
    return (
      <div style={{display:"flex", flexDirection:"column", gap:"4px"}}>
        <label style={{fontSize:"10px", color: expired ? "#f87171" : "#64748b", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase"}}>
          {label}{expired ? " ⚠ EXPIRED" : ""}
        </label>
        <input type="date" value={form[fkey]||""} onChange={e=>set(fkey,e.target.value)}
          style={{...input(), border: expired ? "1px solid #dc2626" : "1px solid #334155", color: expired ? "#f87171" : "#e2e8f0", background: expired ? "#3f0e0e" : "#1e293b"}} />
      </div>
    );
  };

  const days  = daysSince(form.acquiredDate);
  const badge = t2lBadge(days);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"20px"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:"12px",width:"100%",maxWidth:"740px",maxHeight:"92vh",overflowY:"auto",padding:"28px",boxShadow:"0 30px 80px rgba(0,0,0,0.9)"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"22px"}}>
          <div>
            <div style={{fontSize:"22px",fontWeight:800,color:"#f1f5f9",fontFamily:"'DM Sans',sans-serif"}}>{form.year} {form.make} {form.model}</div>
            <div style={{fontSize:"12px",color:"#64748b",marginTop:"3px",fontFamily:"monospace"}}>Stock #{form.stockNo}{form.vin ? ` · VIN: ${form.vin}` : ""} · {form.miles} mi</div>
          </div>
          <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
            <span style={{background:badge.bg,color:badge.fg,fontSize:"11px",fontWeight:700,fontFamily:"monospace",padding:"3px 8px",borderRadius:"5px"}}>T2L {badge.label}</span>
            <button onClick={onClose} style={{background:"none",border:"1px solid #334155",color:"#94a3b8",borderRadius:"6px",padding:"6px 12px",cursor:"pointer",fontSize:"13px"}}>✕</button>
          </div>
        </div>

        {/* Stage */}
        <div style={{marginBottom:"20px"}}>
          <div style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",marginBottom:"8px"}}>CURRENT STAGE</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
            {STAGES.map(st => (
              <button key={st.id} onClick={()=>set("stage",st.id)} style={{
                background: form.stage===st.id ? st.color : "#1e293b",
                color: form.stage===st.id ? "#fff" : "#64748b",
                border:`1px solid ${form.stage===st.id ? st.accent : "#334155"}`,
                borderRadius:"6px", padding:"6px 12px", cursor:"pointer",
                fontSize:"12px", fontWeight:600, transition:"all 0.12s"
              }}>{st.label}</button>
            ))}
          </div>
        </div>

        {/* Core fields — no advisor */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px",marginBottom:"20px"}}>
          <Field label="Stock No"   fkey="stockNo" />
          <Field label="VIN"        fkey="vin" />
          <Field label="Year"       fkey="year" />
          <Field label="Make"       fkey="make" />
          <Field label="Model"      fkey="model" />
          <Field label="Miles"      fkey="miles" />
          <Select label="Keys"        fkey="keys"       options={[{v:"1",l:"1 Key"},{v:"2",l:"2 Keys"}]} />
          <Select label="Retail/Whsl" fkey="rw"         options={[{v:"R",l:"Retail"},{v:"W",l:"Wholesale"}]} />
          <Select label="Title State" fkey="titleState" options={[{v:"HI",l:"Hawaii (HI)"},{v:"ML",l:"Mainland (ML)"}]} />
        </div>

        {/* Timeline dates */}
        <div style={{borderTop:"1px solid #1e293b",paddingTop:"16px",marginBottom:"16px"}}>
          <div style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.1em",marginBottom:"12px"}}>TIMELINE DATES</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px"}}>
            <Field    label="Acquired Date"  fkey="acquiredDate"  type="date" />
            <Field    label="Payoff Bank"    fkey="payoffBank" />
            <Field    label="Payoff Sent"    fkey="payoffSent"    type="date" />
            <Field    label="Title RCVD"     fkey="titleRcvd"     type="date" />
            <Field    label="Sent to DMV"    fkey="sentDMV"       type="date" />
            <Field    label="SPI Title RCVD" fkey="spiTitle"      type="date" />
            <ExpField label="Reg Exp"        fkey="regExp" />
            <ExpField label="SC Exp"         fkey="scExp" />
            <Field    label="In Service"     fkey="inSvc"         type="date" />
            <Field    label="Service Done"   fkey="svcDone"       type="date" />
            <Field    label="Body Shop"      fkey="bodyShop"      type="date" />
            <Field    label="Detail"         fkey="detail"        type="date" />
            <Field    label="Pics"           fkey="pics"          type="date" />
            <Field    label="Frontline"      fkey="frontline"     type="date" />
          </div>
        </div>

        {/* Notes */}
        <div style={{borderTop:"1px solid #1e293b",paddingTop:"16px"}}>
          <NoteThread notes={form.notes||[]} onAdd={note=>setForm(f=>({...f,notes:[...(f.notes||[]),note]}))} />
        </div>

        {/* Actions */}
        <div style={{display:"flex",justifyContent:"flex-end",gap:"10px",marginTop:"20px"}}>
          <button onClick={onClose} style={btn("#1e293b","#334155")}>Cancel</button>
          <button onClick={()=>{onSave(form);onClose();}} style={btn("#15803d","#4ade80")}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

// ─── ADD CAR MODAL ────────────────────────────────────────────────────────────
function AddCarModal({ onClose, onAdd }) {
  const blank = { id:Date.now().toString(), stockNo:"", vin:"", year:"", make:"", model:"", keys:"1", miles:"", rw:"R", titleState:"HI", payoffBank:"", acquiredDate:new Date().toISOString().split("T")[0], stage:"in_transit", notes:[], payoffSent:"", titleRcvd:"", sentDMV:"", spiTitle:"", regExp:"", scExp:"", inSvc:"", svcDone:"", bodyShop:"", detail:"", pics:"", frontline:"" };
  const [form, setForm] = useState(blank);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"20px"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:"12px",width:"100%",maxWidth:"540px",padding:"28px",boxShadow:"0 30px 80px rgba(0,0,0,0.9)"}}>
        <div style={{fontSize:"20px",fontWeight:800,color:"#f1f5f9",fontFamily:"'DM Sans',sans-serif",marginBottom:"20px"}}>Add New Vehicle</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"12px",marginBottom:"16px"}}>
          {[["Stock No","stockNo"],["Year","year"],["Make","make"],["Model","model"],["Miles","miles"]].map(([l,k])=>(
            <div key={k} style={{display:"flex",flexDirection:"column",gap:"4px"}}>
              <label style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>{l}</label>
              <input value={form[k]||""} onChange={e=>set(k,e.target.value)} style={input()} />
            </div>
          ))}
          <div style={{display:"flex",flexDirection:"column",gap:"4px",gridColumn:"1 / -1"}}>
            <label style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>VIN</label>
            <input value={form.vin||""} onChange={e=>set("vin",e.target.value)} style={input()} placeholder="17-character VIN" />
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
            <label style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Acquired Date</label>
            <input type="date" value={form.acquiredDate} onChange={e=>set("acquiredDate",e.target.value)} style={input()} />
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
            <label style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>Retail / Wholesale</label>
            <select value={form.rw} onChange={e=>set("rw",e.target.value)} style={input()}>
              <option value="R">Retail</option><option value="W">Wholesale</option>
            </select>
          </div>
        </div>
        <div style={{marginBottom:"16px"}}>
          <div style={{fontSize:"10px",color:"#64748b",fontWeight:700,letterSpacing:"0.08em",marginBottom:"8px"}}>INITIAL STAGE</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
            {STAGES.map(s=>(
              <button key={s.id} onClick={()=>set("stage",s.id)} style={{background:form.stage===s.id?s.color:"#1e293b",color:form.stage===s.id?"#fff":"#64748b",border:`1px solid ${form.stage===s.id?s.accent:"#334155"}`,borderRadius:"6px",padding:"5px 10px",cursor:"pointer",fontSize:"11px",fontWeight:600}}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:"10px"}}>
          <button onClick={onClose} style={btn("#1e293b","#334155")}>Cancel</button>
          <button onClick={()=>{if(form.stockNo&&form.make){onAdd(form);onClose();}}} style={btn("#15803d","#4ade80")}>Add Vehicle</button>
        </div>
      </div>
    </div>
  );
}

// ─── KANBAN VIEW ─────────────────────────────────────────────────────────────
function KanbanView({ cars, onCarClick }) {
  return (
    <div style={{display:"flex",gap:"12px",overflowX:"auto",padding:"4px 0 16px",minHeight:"480px"}}>
      {STAGES.map(stage => {
        const col = cars.filter(c => c.stage === stage.id);
        return (
          <div key={stage.id} style={{minWidth:"210px",width:"210px",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:stage.color+"44",borderRadius:"8px 8px 0 0",borderBottom:`2px solid ${stage.accent}`,marginBottom:"8px"}}>
              <span style={{fontSize:"10px",fontWeight:800,color:stage.accent,letterSpacing:"0.08em",textTransform:"uppercase"}}>{stage.label}</span>
              <span style={{background:stage.accent+"33",color:stage.accent,borderRadius:"12px",fontSize:"11px",fontWeight:700,padding:"1px 7px"}}>{col.length}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
              {col.map(car => {
                const days  = daysSince(car.acquiredDate);
                const badge = t2lBadge(days);
                return (
                  <div key={car.id} onClick={()=>onCarClick(car)}
                    style={{background:"#0f172a",border:"1px solid #1e293b",borderLeft:`3px solid ${stage.accent}`,borderRadius:"8px",padding:"12px",cursor:"pointer",transition:"background 0.12s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#1e293b"}
                    onMouseLeave={e=>e.currentTarget.style.background="#0f172a"}>
                    <div style={{fontSize:"13px",fontWeight:700,color:"#f1f5f9",marginBottom:"2px",fontFamily:"'DM Sans',sans-serif"}}>{car.year} {car.make} {car.model}</div>
                    <div style={{fontSize:"11px",color:"#475569",marginBottom:"8px",fontFamily:"monospace"}}>#{car.stockNo}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:"11px",color:"#475569",fontFamily:"monospace"}}>{car.vin ? car.vin.slice(-6) : "—"}</span>
                      <span style={{background:badge.bg,color:badge.fg,fontSize:"10px",fontWeight:700,fontFamily:"monospace",padding:"2px 6px",borderRadius:"4px"}}>{badge.label}</span>
                    </div>
                    {car.notes?.length>0 && (
                      <div style={{marginTop:"8px",fontSize:"11px",color:"#334155",borderTop:"1px solid #1e293b",paddingTop:"6px",fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        💬 {car.notes[car.notes.length-1].text}
                      </div>
                    )}
                  </div>
                );
              })}
              {col.length===0 && <div style={{textAlign:"center",color:"#1e293b",fontSize:"12px",padding:"20px 0"}}>—</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── TABLE VIEW ───────────────────────────────────────────────────────────────
function TableView({ cars, onCarClick }) {
  const headers = ["Stock No","VIN","Year","Make","Model","Miles","R/W","Title","Keys","Payoff Sent","Title RCVD","Sent DMV","SPI Title","Reg Exp","SC Exp","In Svc","Svc Done","Body Shop","Detail","Pics","Frontline","T2L","Stage"];
  const dateFields = ["payoffSent","titleRcvd","sentDMV","spiTitle","regExp","scExp","inSvc","svcDone","bodyShop","detail","pics","frontline"];
  const expiredFields = new Set(["regExp","scExp"]);
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
        <thead>
          <tr>{headers.map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#475569",fontWeight:700,fontSize:"10px",letterSpacing:"0.08em",textTransform:"uppercase",borderBottom:"1px solid #1e293b",whiteSpace:"nowrap"}}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {cars.map((car,i)=>{
            const days  = daysSince(car.acquiredDate);
            const badge = t2lBadge(days);
            const s     = stageOf(car.stage);
            return (
              <tr key={car.id} onClick={()=>onCarClick(car)}
                style={{cursor:"pointer",background:i%2===0?"#0a0f1a":"#0c1120",borderBottom:"1px solid #0f172a"}}
                onMouseEnter={e=>e.currentTarget.style.background="#1e293b"}
                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#0a0f1a":"#0c1120"}>
                <td style={{padding:"8px 10px",fontFamily:"monospace",color:"#94a3b8",whiteSpace:"nowrap"}}>{car.stockNo}</td>
                <td style={{padding:"8px 10px",fontFamily:"monospace",color:"#475569",whiteSpace:"nowrap",fontSize:"11px"}}>{car.vin || "—"}</td>
                <td style={{padding:"8px 10px",color:"#cbd5e1"}}>{car.year}</td>
                <td style={{padding:"8px 10px",color:"#e2e8f0",fontWeight:600}}>{car.make}</td>
                <td style={{padding:"8px 10px",color:"#cbd5e1"}}>{car.model}</td>
                <td style={{padding:"8px 10px",color:"#94a3b8",textAlign:"right"}}>{car.miles}</td>
                <td style={{padding:"8px 10px",color:car.rw==="R"?"#4ade80":"#fb923c",fontWeight:700}}>{car.rw}</td>
                <td style={{padding:"8px 10px",color:car.titleState==="ML"?"#f87171":"#94a3b8"}}>{car.titleState}</td>
                <td style={{padding:"8px 10px",color:"#94a3b8",textAlign:"center"}}>{car.keys}</td>
                {dateFields.map(k=>{
                  const expired = expiredFields.has(k) && isExpired(car[k]);
                  return (
                    <td key={k} style={{
                      padding:"8px 10px",
                      color: expired ? "#f87171" : car[k] ? "#60a5fa" : "#1e293b",
                      background: expired ? "#3f0e0e" : "transparent",
                      fontFamily:"monospace", whiteSpace:"nowrap", fontWeight: expired ? 700 : 400
                    }}>
                      {fmtDate(car[k]) || "—"}{expired ? " ⚠" : ""}
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
  const [cars, setCars]         = useState(MOCK);
  const [view, setView]         = useState("kanban");
  const [selected, setSelected] = useState(null);
  const [adding, setAdding]     = useState(false);
  const [search, setSearch]     = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [notionMode, setNotionMode]   = useState(false);
  const [status, setStatus]     = useState("");
  const [loading, setLoading]   = useState(false);

  const toast = (msg) => { setStatus(msg); setTimeout(()=>setStatus(""),4000); };

  const loadNotion = async () => {
    setLoading(true);
    toast("Fetching from Notion…");
    try {
      const data = await notionFetch(`/databases/${NOTION_DB_ID}/query`,"POST",{page_size:200});
      if (data.results) {
        const mapped = data.results.map(page => {
          const p   = page.properties;
          const txt = k => p[k]?.rich_text?.[0]?.plain_text || p[k]?.title?.[0]?.plain_text || "";
          const dt  = k => p[k]?.date?.start || "";
          return { id:page.id, stockNo:txt("Stock No"), vin:txt("VIN"), year:txt("Year"), make:txt("Make"), model:txt("Model"), keys:p["Keys"]?.select?.name||"1", miles:txt("Miles"), rw:p["R/W"]?.select?.name||"R", titleState:p["Title State"]?.select?.name||"HI", payoffBank:txt("Payoff Bank"), stage:p["Stage"]?.select?.name||"in_transit", acquiredDate:dt("Acquired Date"), payoffSent:dt("Payoff Sent"), titleRcvd:dt("Title RCVD"), sentDMV:dt("Sent DMV"), spiTitle:dt("SPI Title RCVD"), regExp:dt("Reg Exp"), scExp:dt("SC Exp"), inSvc:dt("In Svc"), svcDone:dt("Svc Done"), bodyShop:dt("Body Shop"), detail:dt("Detail"), pics:dt("Pics"), frontline:dt("Frontline"), notes:[] };
        });
        setCars(mapped);
        toast(`✓ Loaded ${mapped.length} vehicles from Notion`);
      }
    } catch { toast("Notion connection failed — using demo data"); }
    setLoading(false);
  };

  const saveNotion = async (car) => {
    try {
      if (car.id.length > 10) await notionFetch(`/pages/${car.id}`,"PATCH",{properties:carToNotion(car)});
      else await notionFetch("/pages","POST",{parent:{database_id:NOTION_DB_ID},properties:carToNotion(car)});
      toast("✓ Saved to Notion");
    } catch { toast("Save failed — check Notion config"); }
  };

  const handleSave = (updated) => {
    setCars(cs => cs.map(c => c.id===updated.id ? updated : c));
    if (notionMode) saveNotion(updated);
  };
  const handleAdd = (car) => {
    setCars(cs => [...cs, car]);
    if (notionMode) saveNotion(car);
  };

  const filtered = cars.filter(c => {
    const q = search.toLowerCase();
    return (!q || [c.stockNo,c.make,c.model,c.vin].some(v=>(v||"").toLowerCase().includes(q)))
        && (stageFilter==="all" || c.stage===stageFilter);
  });

  return (
    <div style={{minHeight:"100vh",background:"#060b14",color:"#e2e8f0",fontFamily:"'DM Mono','Fira Code','Courier New',monospace"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;600;800&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:#0f172a;}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:3px;}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.4);}
        select option{background:#1e293b;}
      `}</style>

      {/* NAV */}
      <div style={{background:"#0a0f1a",borderBottom:"1px solid #1e293b",padding:"14px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:"30px",height:"30px",background:"#dc2626",borderRadius:"6px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"15px",fontWeight:900,color:"#fff",fontFamily:"'DM Sans',sans-serif"}}>S</div>
          <span style={{fontSize:"16px",fontWeight:800,color:"#f1f5f9",fontFamily:"'DM Sans',sans-serif",letterSpacing:"-0.02em"}}>SERVCO</span>
          <span style={{color:"#334155",fontSize:"14px"}}>/</span>
          <span style={{fontSize:"13px",color:"#475569",fontFamily:"'DM Sans',sans-serif"}}>Recon Pipeline</span>
        </div>
        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
          {status && <span style={{fontSize:"12px",color:"#4ade80",padding:"4px 10px",background:"#14532d33",border:"1px solid #15803d",borderRadius:"6px"}}>{status}</span>}
          <button onClick={()=>{setNotionMode(n=>!n);if(!notionMode)loadNotion();}} style={{...btn(notionMode?"#1a2744":"#1e293b",notionMode?"#3b82f6":"#334155"),fontSize:"12px",padding:"6px 12px"}}>
            {notionMode?"🔗 Notion Live":"🔗 Connect Notion"}
          </button>
          <button onClick={()=>setAdding(true)} style={{...btn("#14532d","#4ade80"),fontSize:"12px",padding:"6px 14px"}}>+ Add Vehicle</button>
        </div>
      </div>

      {/* BODY */}
      <div style={{padding:"24px"}}>
        <StatsBar cars={cars} />

        {/* CONTROLS */}
        <div style={{display:"flex",gap:"10px",marginBottom:"18px",flexWrap:"wrap",alignItems:"center"}}>
          <input placeholder="Search stock #, VIN, make, model…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{...input({width:"280px"}),fontFamily:"'DM Sans',sans-serif"}} />
          <select value={stageFilter} onChange={e=>setStageFilter(e.target.value)} style={input({width:"180px"})}>
            <option value="all">All Stages</option>
            {STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <div style={{marginLeft:"auto",display:"flex",gap:"6px"}}>
            {["kanban","table"].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{...btn(view===v?"#1e40af":"#1e293b",view===v?"#3b82f6":"#334155"),fontSize:"12px",padding:"6px 14px"}}>
                {v==="kanban"?"⬜ Board":"☰ Table"}
              </button>
            ))}
          </div>
        </div>

        <div style={{fontSize:"12px",color:"#334155",marginBottom:"14px"}}>
          Showing <span style={{color:"#64748b",fontWeight:700}}>{filtered.length}</span> of {cars.length} vehicles
        </div>

        {loading
          ? <div style={{textAlign:"center",padding:"80px",color:"#334155",fontSize:"14px"}}>Loading from Notion…</div>
          : view==="kanban"
            ? <KanbanView  cars={filtered} onCarClick={setSelected} />
            : <TableView   cars={filtered} onCarClick={setSelected} />
        }
      </div>

      {selected && <CarModal    car={selected} onClose={()=>setSelected(null)} onSave={handleSave} />}
      {adding   && <AddCarModal               onClose={()=>setAdding(false)}   onAdd={handleAdd}  />}
    </div>
  );
}