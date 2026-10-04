import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API = "http://localhost:8080/api/data";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return <div className="login-shell">
    <div className="login-art"><div className="brand-mark">AWS</div><div className="art-content"><span className="eyebrow">CLOUD DATA PREPARATION PLATFORM</span><h1>Turn raw data into<br/><span>trusted data.</span></h1><p>Upload a CSV and let your Spring Boot backend run the AWS Glue DataBrew recipe in your AWS account.</p><div className="art-pills"><span>Amazon S3</span><span>AWS Glue DataBrew</span><span>Spring Boot</span></div></div><div className="grid-art"/></div>
    <div className="login-panel"><div className="login-card"><div className="mini-logo">✦</div><span className="eyebrow">WELCOME BACK</span><h2>Sign in to DataBrew Studio</h2><p className="muted">Access your data preparation workspace.</p><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password"/><button className="primary full" onClick={()=>onLogin(email || "admin@example.com")}>Sign In</button><button className="outline full" onClick={()=>onLogin("demo@awsdatabrew.local")}>Continue with Demo Account</button><p className="login-note">Demo UI authentication for the academic project. AWS credentials are never stored in the frontend.</p></div></div>
  </div>;
}

function App(){
  const [logged,setLogged]=useState(false), [user,setUser]=useState("Admin"), [page,setPage]=useState("dashboard");
  const [file,setFile]=useState(null), [uploaded,setUploaded]=useState(null), [job,setJob]=useState(null), [status,setStatus]=useState("READY"), [error,setError]=useState("");
  const [profile,setProfile]=useState({rows:20,columns:9,missingValues:5,invalidRatings:1});

  useEffect(()=>{
    if(!job || ["SUCCEEDED","FAILED","ERROR","TIMEOUT"].includes(status)) return;
    const timer=setInterval(async()=>{
      try{ const r=await fetch(`${API}/status?jobName=${encodeURIComponent(job.jobName)}`); const d=await r.json(); if(!r.ok) throw new Error(d.error||"Status check failed"); setStatus(d.status); setJob(j=>({...j,...d})); }
      catch(e){setError(e.message);}
    },4000);
    return ()=>clearInterval(timer);
  },[job,status]);

  async function uploadAndClean(){
    if(!file){setError("Please choose a CSV file first.");return;}
    setError(""); setStatus("UPLOADING");
    try{
      const fd=new FormData(); fd.append("file",file);
      const up=await fetch(`${API}/upload`,{method:"POST",body:fd}); const u=await up.json();
      if(!up.ok) throw new Error(u.error||"Upload failed");
      setUploaded(u); setStatus("STARTING");
      const cr=await fetch(`${API}/clean?uploadedKey=${encodeURIComponent(u.s3Key)}&fileName=${encodeURIComponent(u.fileName)}`,{method:"POST"}); const c=await cr.json();
      if(!cr.ok) throw new Error(c.error||"Could not start DataBrew job");
      setJob(c); setStatus(c.status||"RUNNING"); setPage("jobs");
    }catch(e){setStatus("FAILED");setError(e.message);}
  }

  if(!logged) return <Login onLogin={n=>{setUser(n.split("@")[0]);setLogged(true)}}/>;
  const nav=[['dashboard','⌂','Dashboard'],['prepare','✦','Upload & Clean'],['profile','◈','Data Profile'],['jobs','▣','AWS Job'],['architecture','◇','Architecture']];
  return <div className="app-shell"><aside className="sidebar"><div className="side-brand"><div className="aws-mini">AWS</div><div><b>DataBrew</b><small>Studio</small></div></div><div className="workspace"><span className="dot"/><div><small>WORKSPACE</small><b>Customer Sales</b></div></div><nav>{nav.map(([id,icon,label])=><button key={id} className={page===id?"nav active":"nav"} onClick={()=>setPage(id)}><span>{icon}</span>{label}</button>)}</nav><div className="side-bottom"><button className="profile-mini" onClick={()=>setLogged(false)}><div className="avatar">{user[0]?.toUpperCase()}</div><div><b>{user}</b><small>Administrator</small></div><span>↪</span></button></div></aside>
  <main className="main"><header className="topbar"><div><span className="crumb">Workspace / </span><b>{nav.find(x=>x[0]===page)?.[2]}</b></div><div className="top-actions"><span className="live"><i/> AWS Connected</span><div className="top-avatar">{user[0]?.toUpperCase()}</div></div></header><div className="content">{error&&<div className="toast">{error}<button onClick={()=>setError("")}>×</button></div>}
    {page==='dashboard'&&<Dashboard status={status} file={file} job={job} go={setPage}/>} 
    {page==='prepare'&&<Prepare file={file} setFile={setFile} start={uploadAndClean} status={status} uploaded={uploaded}/>} 
    {page==='profile'&&<Profile profile={profile}/>} 
    {page==='jobs'&&<Jobs job={job} status={status} file={file}/>} 
    {page==='architecture'&&<Architecture/>}
  </div></main></div>;
}

function Dashboard({status,file,job,go}){return <div><div className="hero"><div><span className="eyebrow">REAL AWS WORKFLOW</span><h1>Raw data in. Clean data out.</h1><p>Upload a CSV from this application and the Spring Boot backend will store it in S3, create a DataBrew dataset, run your published recipe and return the cleaned output.</p><div className="hero-actions"><button className="primary" onClick={()=>go('prepare')}>Upload Dataset →</button><button className="ghost" onClick={()=>go('architecture')}>View Architecture</button></div></div><div className="hero-orb"><div className="orb-core">AWS</div><div className="orb-ring r1"/><div className="orb-ring r2"/></div></div><div className="stats"><Stat title="Source Rows" value="20" sub="Project dataset" icon="▤"/><Stat title="Columns" value="9" sub="Customer sales fields" icon="▦"/><Stat title="Quality Issues" value="5" sub="Missing values" icon="⚠"/><Stat title="Invalid Ratings" value="1" sub="Rating = 6" icon="!"/></div><section className="card"><div className="card-head"><div><span className="eyebrow">LIVE PIPELINE</span><h3>Application → AWS</h3></div><span className="status">{status}</span></div><div className="pipeline">{['React upload','Spring Boot','Amazon S3','DataBrew Recipe Job','Clean CSV'].map((x,i)=><div className="pipe" key={x}><div className="pipe-icon">{i+1}</div><div><b>{x}</b><small>{i===0?'User interface':i===1?'REST API + AWS SDK':i===2?'Raw and cleaned files':i===3?'Profile/recipe execution':'Download result'}</small></div>{i<4&&<span className="arrow">→</span>}</div>)}</div>{job&&<p className="muted">Latest job: <b>{job.jobName}</b> • {job.status}</p>}</section></div>}

function Prepare({file,setFile,start,status,uploaded}){return <div><div className="page-title"><div><span className="eyebrow">DATA PREPARATION</span><h1>Upload and clean</h1><p>This action uses your actual AWS account through the Spring Boot backend.</p></div><span className="status large">{status}</span></div><section className="card upload-card"><div className="upload-zone"><div className="upload-icon">↑</div><h2>Upload raw CSV</h2><p>Use the same column structure expected by the published DataBrew recipe.</p><input id="csv" type="file" accept=".csv" onChange={e=>setFile(e.target.files?.[0]||null)}/><label htmlFor="csv" className="outline choose">{file?file.name:'Choose CSV file'}</label>{file&&<span className="file-ok">✓ {file.name} selected</span>}</div><button className="primary full" onClick={start}>{status==='UPLOADING'?'Uploading...':'Upload & Start DataBrew'}</button>{uploaded&&<p className="muted">Uploaded to S3: <b>{uploaded.s3Key}</b></p>}</section><div className="grid-2"><section className="card"><div className="card-head"><div><span className="eyebrow">RECIPE</span><h3>Published cleaning logic</h3></div><span className="tag">Version 1</span></div><div className="chips"><span>Age → Average</span><span>City → Most Frequent</span><span>Quantity → Average</span><span>Rating → Average</span><span>Name → Capital Case</span><span>Product → Capital Case</span><span>Rating 6 → Removed</span></div></section><section className="card"><div className="card-head"><div><span className="eyebrow">AWS</span><h3>What happens next?</h3></div></div><p className="muted">1. Upload to S3 → 2. Create DataBrew dataset → 3. Run recipe job → 4. Write cleaned CSV to S3 → 5. Download here.</p></section></div></div>}

function Profile({profile}){return <div><div className="page-title"><div><span className="eyebrow">DATA QUALITY</span><h1>Source profile</h1><p>Profile from the project dataset before cleaning.</p></div></div><div className="stats"><Stat title="Rows" value={profile.rows} sub="Source dataset" icon="▤"/><Stat title="Columns" value={profile.columns} sub="Detected fields" icon="▦"/><Stat title="Missing Values" value={profile.missingValues} sub="Affected cells" icon="⚠"/><Stat title="Invalid Ratings" value={profile.invalidRatings} sub="Rating = 6" icon="!"/></div><section className="card"><div className="card-head"><div><span className="eyebrow">QUALITY CHECKS</span><h3>Issues detected</h3></div></div><div className="quality-grid">{[['Age','10%','2 missing'],['City','5%','1 missing'],['Quantity','5%','1 missing'],['Rating','5%','1 missing'],['Exact duplicates','0%','0 duplicates'],['Invalid rating','1 row','Rating = 6']].map(x=><div className="quality" key={x[0]}><div><b>{x[0]}</b><small>{x[2]}</small></div><strong>{x[1]}</strong></div>)}</div></section></div>}

function Jobs({job,status,file}){const done=status==='SUCCEEDED'; return <div><div className="page-title"><div><span className="eyebrow">AWS EXECUTION</span><h1>DataBrew job</h1><p>Monitor the real AWS Glue DataBrew recipe execution started by this application.</p></div><span className="status large">{status}</span></div><section className="card"><div className="job-row"><div className="job-icon">✦</div><div className="job-main"><b>{job?.jobName||'No job started yet'}</b><small>{job?.datasetName||'Upload a CSV to create a DataBrew dataset'}</small></div><span className="status">{status}</span></div>{job&&<div className="job-meta"><span>Input <b>S3</b></span><span>Recipe <b>customer-sales-cleaning-recipe v1</b></span><span>Region <b>ap-south-1</b></span><span>Output <b>S3</b></span></div>}{done&&<div className="result-box"><h3>✓ Cleaned data is ready</h3><p>Your DataBrew recipe job completed successfully. The output is stored in Amazon S3.</p><a className="primary download" href={`${API}/download`}>Download Cleaned CSV</a>{job?.outputUrl&&<a className="outline download" href={job.outputUrl} target="_blank" rel="noreferrer">Open S3 Output</a>}</div>}{['RUNNING','STARTING','UPLOADING'].includes(status)&&<div className="running">⟳ DataBrew is processing your dataset. This page checks the AWS job every 4 seconds.</div>}</section></div>}

function Architecture(){return <div><div className="page-title"><div><span className="eyebrow">SYSTEM ARCHITECTURE</span><h1>Full-stack AWS workflow</h1><p>The frontend does not hold AWS credentials. Spring Boot controls AWS operations through the SDK.</p></div></div><section className="card"><div className="architecture"><Box t="React Frontend" s="Login • Upload • Status • Download"/><div className="big-arrow">↓ REST API</div><Box t="Spring Boot Backend" s="Upload • Dataset • Recipe Job • Status"/><div className="big-arrow">↓ AWS SDK</div><Box t="Amazon S3" s="frontend-uploads/ • frontend-cleaned/"/><div className="big-arrow">↓</div><Box t="AWS Glue DataBrew" s="Dataset → Recipe → Recipe Job"/><div className="big-arrow">↓</div><Box t="Cleaned CSV" s="Stored in S3 and downloaded by React"/></div></section></div>}
function Box({t,s}){return <div className="arch-box"><b>{t}</b><small>{s}</small></div>}
function Stat({title,value,sub,icon}){return <div className="stat"><div className="stat-icon">{icon}</div><div><small>{title}</small><strong>{value}</strong><span>{sub}</span></div></div>}
createRoot(document.getElementById("root")).render(<App/>);
