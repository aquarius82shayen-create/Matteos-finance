const euroFmt = new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'});
const DEFAULT_STATE = {
  page: 'dashboard',
  balance: 0,
  startingCapital: 0,
  startingCapitalMonth: '',
  forecastMonth: '2026-09',
  movementFilter: 'all',
  transactions: [],
  futureEvents: [],
  goals: []
};

function loadState(){
  try{
    const raw=localStorage.getItem('matteos-finance-v1');
    if(!raw) return structuredClone(DEFAULT_STATE);
    const saved=JSON.parse(raw);
    if(!saved || typeof saved!=='object') return structuredClone(DEFAULT_STATE);
    return {
      ...structuredClone(DEFAULT_STATE),
      ...saved,
      transactions:Array.isArray(saved.transactions)?saved.transactions:structuredClone(DEFAULT_STATE.transactions),
      futureEvents:Array.isArray(saved.futureEvents)?saved.futureEvents:structuredClone(DEFAULT_STATE.futureEvents),
      goals:Array.isArray(saved.goals)?saved.goals:structuredClone(DEFAULT_STATE.goals)
    };
  }catch(err){
    console.warn('Dati locali non validi: ripristino la versione sicura.',err);
    return structuredClone(DEFAULT_STATE);
  }
}
const state = loadState();
const categories=['Stipendio','Spesa','Benzina','Casa','Affitto','Contrattempo','Tempo libero','Altro','Auto','Redditi','Lavoro','Salute'];
const incomeCategories=['Stipendio','Extra','Mance','Altro'];
const expenseCategories=['Spesa','Benzina','Casa','Affitto','Contrattempo','Tempo libero','Altro'];
const futureIncomeCategories=['Altro'];
const futureExpenseCategories=['Spesa','Casa','Tempo libero','Contrattempo','Affitto','Benzina','Altro'];
function futureCategoriesForType(type){return type==='income'?futureIncomeCategories:futureExpenseCategories}
function futureCategoryOptions(type){return futureCategoriesForType(type).map(c=>`<option>${c}</option>`).join('')}
function categoriesForType(type){return type==='expense'?expenseCategories:incomeCategories}
function categoryOptions(type){return categoriesForType(type).map(c=>`<option>${c}</option>`).join('')}
function save(){localStorage.setItem('matteos-finance-v1',JSON.stringify(state))}
function uid(){return Math.random().toString(36).slice(2,10)}
function sum(items){return items.reduce((a,b)=>a+b,0)}
function monthOf(d){return d.slice(0,7)}
function currentMonth(){return '2026-09'}
function monthName(ym){return new Date(ym+'-01T12:00:00').toLocaleDateString('it-IT',{month:'long',year:'numeric'})}
function monthTx(ym){return state.transactions.filter(t=>monthOf(t.date)===ym)}
function income(ym=currentMonth()){return sum(monthTx(ym).filter(t=>t.type==='income').map(t=>t.amount))}
function expenses(ym=currentMonth()){return sum(monthTx(ym).filter(t=>t.type==='expense').map(t=>t.amount))}
function savings(ym=currentMonth()){return income(ym)-expenses(ym)}
function prevMonth(ym){let [y,m]=ym.split('-').map(Number);m--;if(m===0){m=12;y--}return `${y}-${String(m).padStart(2,'0')}`}
function monthlyCapacity(){const allMonths=[...new Set(state.transactions.map(t=>monthOf(t.date)))];const values=allMonths.map(m=>Math.max(0,savings(m))).filter(Number.isFinite);return values.length?sum(values)/values.length:245.6}
function changePage(page){state.page=page;save();render()}

// Navigazione della settimana della Dashboard: non modifica i dati salvati.
let dashboardWeekOffset = 0;
let dashboardWeekDirection = 0;
let dashboardWeekTransition = null;
let dashboardWeekTransitionTimer = null;
const WEEK_BASE = new Date('2026-09-03T12:00:00');
const WEEK_LABELS = ['DOM','LUN','MAR','MER','GIO','VEN','SAB'];
const MONTH_LABELS = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];
function pad2(n){return String(n).padStart(2,'0')}
function isoDate(d){return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`}
function dashboardWeekDays(offset=dashboardWeekOffset){
  const start=new Date(WEEK_BASE);
  start.setDate(start.getDate()+offset*7);
  return Array.from({length:7},(_,i)=>{
    const date=new Date(start);
    date.setDate(start.getDate()+i);
    const key=isoDate(date);
    const tx=state.transactions.filter(t=>t.date===key);
    const inc=sum(tx.filter(t=>t.type==='income').map(t=>Number(t.amount)||0));
    const out=sum(tx.filter(t=>t.type==='expense').map(t=>Number(t.amount)||0));
    return {date,key,name:WEEK_LABELS[date.getDay()],day:date.getDate(),month:MONTH_LABELS[date.getMonth()],inc,out};
  });
}
function shiftDashboardWeek(delta){
  if(dashboardWeekTransition) return;
  const from=dashboardWeekOffset;
  const to=from+delta;
  dashboardWeekDirection=delta>0?1:-1;
  dashboardWeekTransition={from,to,direction:delta>0?'next':'prev'};
  dashboardWeekOffset=to;
  render();
  clearTimeout(dashboardWeekTransitionTimer);
  dashboardWeekTransitionTimer=setTimeout(()=>{
    dashboardWeekTransition=null;
    render();
  },1080);
}
function weekAmount(v){return Number.isInteger(v)?String(v):v.toLocaleString('it-IT',{maximumFractionDigits:2})}

function dayCardMarkup(day,today=false){return `<div class="day-card ${today?'today':''}"><div class="day-name">${day.name}</div><div class="day-num">${day.day}</div><div class="day-month">${day.month}</div><div class="day-in positive">+€ ${weekAmount(day.inc)}</div><div class="day-out negative">-€ ${weekAmount(day.out)}</div><button class="day-plus" onclick="openTransaction('income','${day.key}')">＋</button></div>`}
function dashboard(){const ym=currentMonth(), inc=income(ym), out=expenses(ym), sav=inc-out;const cats={};monthTx(ym).filter(t=>t.type==='expense').forEach(t=>cats[t.category]=(cats[t.category]||0)+t.amount);const totalOut=out||1;const colors=['#7a21ff','#ff1675','#ff6247','#29e88b','#ffd34f','#ffe08a','#a93de7'];const entries=Object.entries(cats);const days=dashboardWeekDays();
return `<section class="page dashboard-page ${state.page==='dashboard'?'active':''}${dashboardWeekTransition?' week-changing':''}">
  <div class="hero">
    <img class="duck-art" src="assets/dashboard-mascot.png" alt="Mascotte di Matteo's Finance" />
    <img class="dashboard-logo" src="assets/dashboard-logo-red-2-transparent.png" alt="Matteo's Finance" />
    <div class="hero-actions"><button class="icon-btn" onclick="openSettings()" title="Impostazioni">⚙</button></div>
    <select class="month-select" aria-label="Mese dashboard"><option>Settembre 2026</option></select>
    <div class="balance-card"><div class="balance-label-row"><div class="balance-label">TOTALE DISPONIBILE</div></div><div class="balance-value-row"><div class="balance-value">${euroFmt.format(state.balance)}</div><img class="balance-wallet" src="assets/wallet-transparent.png" alt="Portafoglio" /></div><div class="balance-delta"><span class="positive">↗ ${euroFmt.format(sav)}</span> &nbsp; saldo del mese</div><div class="balance-buttons"><button class="big-btn income" onclick="openTransaction('income')">⊕ &nbsp; Aggiungi entrata</button><button class="big-btn expense" onclick="openTransaction('expense')">↟ &nbsp; Aggiungi uscita</button></div></div>
  </div>
  <div class="section"><div class="section-title week-title"><span>▣ SETTIMANA IN CORSO</span><span class="week-nav"><button type="button" onclick="shiftDashboardWeek(-1)" aria-label="Settimana precedente">‹</button><button type="button" onclick="shiftDashboardWeek(1)" aria-label="Settimana successiva">›</button></span></div><div class="panel week-panel"><div class="week-viewport">${dashboardWeekTransition?`<div class="week-track week-transition-${dashboardWeekTransition.direction}">${(dashboardWeekTransition.direction==='next'?[dashboardWeekDays(dashboardWeekTransition.from),days]:[days,dashboardWeekDays(dashboardWeekTransition.from)]).map((week,weekIndex)=>`<div class="week-pane"><div class="week-grid">${week.map(day=>dayCardMarkup(day,day.key==='2026-09-06'&&((dashboardWeekTransition.direction==='next'?dashboardWeekTransition.from:dashboardWeekTransition.to)===0)&&weekIndex===0)).join('')}</div></div>`).join('')}</div>`:`<div class="week-grid">${days.map(day=>dayCardMarkup(day,day.key==='2026-09-06'&&dashboardWeekOffset===0)).join('')}</div>`}</div></div></div>
  <div class="stats-grid"><div class="stat-card green"><b><span class="stat-icon">↗</span> ENTRATE</b><strong>${euroFmt.format(inc)}</strong></div><div class="stat-card pink"><b><span class="stat-icon">↘</span> USCITE</b><strong>${euroFmt.format(out)}</strong></div><div class="stat-card blue"><b><span class="stat-icon coin-icon">€</span> RISPARMIO</b><strong>${euroFmt.format(sav)}</strong></div></div>
  <div class="panel chart-panel"><div><div class="section-title" style="margin:0 0 8px">RIPARTIZIONE USCITE</div><ul class="legend">${entries.map(([c,v],i)=>`<li><i class="dot" style="background:${colors[i%colors.length]}"></i><span>${c}</span><span>${Math.round(v/totalOut*100)}%</span><span>${euroFmt.format(v)}</span></li>`).join('')||'<li>Nessuna uscita</li>'}</ul></div><div style="position:relative;display:grid;place-items:center"><div class="donut" style="background:${donutGradient(entries,colors,totalOut)}"></div><div class="donut-center"><b>${euroFmt.format(out)}</b><small>Totale uscite</small></div></div></div>
</section>`}
function donutGradient(entries,colors,total){if(!entries.length)return '#172435';let acc=0;const s=entries.map(([_,v],i)=>{const a=acc;acc+=v/total*100;return `${colors[i%colors.length]} ${a}% ${acc}%`}).join(',');return `conic-gradient(${s})`}
function forecasts(){const f=forecast(state.forecastMonth);return `<section class="page ${state.page==='forecasts'?'active':''}"><div class="page-head"><div><h1>Previsioni</h1></div><button class="icon-btn" onclick="openSettings()">⚙</button></div><div class="month-control"><button onclick="shiftForecast(-1)">‹</button><select onchange="state.forecastMonth=this.value;save();render()">${monthOptions().map(x=>`<option value="${x}" ${x===state.forecastMonth?'selected':''}>${monthName(x)}</option>`).join('')}</select><button onclick="shiftForecast(1)">›</button></div><div class="panel forecast-card"><h3 style="margin-top:0">Situazione prevista</h3><div class="forecast-row"><span>🟢 Entrate previste</span><b>${euroFmt.format(f.income)}</b></div><div class="forecast-row"><span>🔴 Uscite previste</span><b>${euroFmt.format(f.expenses)}</b></div><div class="forecast-row"><span>📉 Saldo mese</span><b class="${f.net>=0?'positive':'negative'}">${euroFmt.format(f.net)}</b></div><div class="forecast-row"><span>🏦 Totale stimato fine mese</span><b class="${f.endBalance>=0?'positive':'negative'}">${euroFmt.format(f.endBalance)}</b></div><div class="forecast-note">La previsione usa la <b>media di tutti i mesi precedenti disponibili</b>, categoria per categoria. Per il mese corrente considera anche i movimenti già registrati e stima solo il periodo rimanente; gli <b>eventi futuri</b> vengono aggiunti con il loro importo reale.</div></div><div class="section-title">Eventi futuri <button class="primary-btn" onclick="openFutureEvent()">＋ Aggiungi evento</button></div><div class="events-list">${futureEventsForMonth(state.forecastMonth).map(eventRow).join('')||'<div class="empty">Nessun evento previsto per questo mese.</div>'}</div><div class="panel" style="margin-top:14px;padding:16px"><h3 style="margin:0">Andamento previsto dei risparmi</h3><div class="bar-chart">${monthOptions().slice(0,6).map(m=>{const x=forecast(m).endBalance;const h=Math.max(15,Math.min(100,Math.max(0,x)/5000*100));return `<div class="bar" style="height:${h}%"><span>${monthName(m).slice(0,3)}</span></div>`}).join('')}</div></div></section>`}
function monthOptions(){return ['2026-09','2026-10','2026-11','2026-12','2027-01','2027-02','2027-03','2027-04','2027-05','2027-06','2027-07','2027-08']}
function shiftForecast(n){const a=monthOptions(),i=a.indexOf(state.forecastMonth);state.forecastMonth=a[Math.max(0,Math.min(a.length-1,i+n))];save();render()}
function futureEventsForMonth(ym){return state.futureEvents.filter(e=>monthOf(e.date)===ym)}

// --- Motore previsioni ---
// La previsione separa sempre tre cose: dati reali, media storica ed eventi già conosciuti.
function historicalMonthsBefore(ym){
  // Per non falsare la media con un mese ancora in corso, vengono usati i mesi
  // realmente conclusi e antecedenti al mese che stiamo stimando.
  const cutoff=ym===currentMonth()?ym:currentMonth();
  return [...new Set(state.transactions.map(t=>monthOf(t.date)))].filter(m=>m<cutoff&&m<ym).sort();
}
function averageCategoryTotals(ym,type){
  const months=historicalMonthsBefore(ym);
  if(!months.length)return {total:0,byCategory:{},months:0};
  const byCategory={};
  months.forEach(m=>{
    monthTx(m).filter(t=>t.type===type).forEach(t=>{
      byCategory[t.category]=(byCategory[t.category]||0)+(Number(t.amount)||0);
    });
  });
  Object.keys(byCategory).forEach(c=>byCategory[c]/=months.length);
  return {total:sum(Object.values(byCategory)),byCategory,months:months.length};
}
function todayIso(){
  const d=new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function daysInMonth(ym){
  const [y,m]=ym.split('-').map(Number);
  return new Date(y,m,0).getDate();
}
function remainingMonthFraction(ym){
  if(ym!==currentMonth())return 1;
  const today=todayIso();
  if(monthOf(today)!==ym)return 1;
  const day=Number(today.slice(-2));
  // Include la giornata corrente: la previsione parte da ciò che non è ancora certo.
  return Math.max(0,(daysInMonth(ym)-day+1)/daysInMonth(ym));
}
function futureEventTotals(ym){
  const today=todayIso();
  const events=futureEventsForMonth(ym).filter(e=>ym!==currentMonth()||e.date>=today);
  return {
    income:sum(events.filter(e=>e.type==='income').map(e=>Number(e.amount)||0)),
    expenses:sum(events.filter(e=>e.type==='expense').map(e=>Number(e.amount)||0))
  };
}
function realMonthTotals(ym){
  const tx=monthTx(ym);
  return {
    income:sum(tx.filter(t=>t.type==='income').map(t=>Number(t.amount)||0)),
    expenses:sum(tx.filter(t=>t.type==='expense').map(t=>Number(t.amount)||0))
  };
}
function balanceAtStartOfMonth(ym){
  const from=state.startingCapitalMonth||'';
  const relevant=state.transactions.filter(t=>{
    const m=monthOf(t.date);
    return m<ym&&(!from||m>=from);
  });
  return (Number(state.startingCapital)||0)+sum(relevant.map(t=>t.type==='income'?(Number(t.amount)||0):-(Number(t.amount)||0)));
}
function normalForecastForMonth(ym){
  const avgIncome=averageCategoryTotals(ym,'income');
  const avgExpenses=averageCategoryTotals(ym,'expense');
  const factor=remainingMonthFraction(ym);
  return {
    income:avgIncome.total*factor,
    expenses:avgExpenses.total*factor,
    historicalMonths:Math.max(avgIncome.months,avgExpenses.months)
  };
}
function forecastComponents(ym){
  const normal=normalForecastForMonth(ym);
  const events=futureEventTotals(ym);
  if(ym===currentMonth()){
    const actual=realMonthTotals(ym);
    const income=actual.income+normal.income+events.income;
    const expenses=actual.expenses+normal.expenses+events.expenses;
    return {income,expenses,net:income-expenses,normal,events,actual};
  }
  const income=normal.income+events.income;
  const expenses=normal.expenses+events.expenses;
  return {income,expenses,net:income-expenses,normal,events,actual:{income:0,expenses:0}};
}
function forecast(ym){
  const months=monthOptions();
  const targetIndex=months.indexOf(ym);
  if(targetIndex<0)return {income:0,expenses:0,net:0,endBalance:state.balance};
  let running=balanceAtStartOfMonth(currentMonth());
  let result=null;
  for(let i=0;i<=targetIndex;i++){
    const m=months[i];
    const parts=forecastComponents(m);
    running+=parts.net;
    if(m===ym)result={...parts,endBalance:running};
  }
  return result||{income:0,expenses:0,net:0,endBalance:running};
}
function eventIcon(description='',category='',type='expense'){
  const x=`${description} ${category}`.toLowerCase();
  // Scelta mirata dell'icona in base al significato dell'evento.
  if(/revisione|tagliando|officina|meccanico|riparazione/.test(x)) return '🛠️';
  if(/assicurazione.*auto|auto.*assicurazione|auto|macchina|veicolo/.test(x)) return '🚗︎';
  if(/benzina|carburante|rifornimento/.test(x)) return '⛽︎';
  if(/casa|affitto|mutuo/.test(x)) return '⌂';
  if(/bolletta|luce|gas|acqua/.test(x)) return '⚡︎';
  if(/stipendio|salario/.test(x)) return '▰';
  if(/credito|rimborso|redditi|entrata/.test(x)) return '↗';
  if(/viaggio|vacanza|aereo/.test(x)) return '✈︎';
  if(/concerto|musica|chitarra/.test(x)) return '♪';
  if(/medico|salute|farmacia/.test(x)) return '✚';
  if(/spesa|supermercato|cibo/.test(x)) return '▣';
  return type==='income'?'↗':'↘';
}
function eventRow(e){const tone=e.type==='income'?'income':'expense';return `<div class="event-row event-${tone}"><div class="event-icon">${eventIcon(e.description,e.category,e.type)}</div><div class="event-meta"><b class="editable-title" onclick="openFutureEvent('${e.id}')">${escapeHtml(e.description)}</b><small>${new Date(e.date+'T12:00').toLocaleDateString('it-IT')} · ${e.category}</small></div><div class="event-actions"><strong class="${e.type==='income'?'positive':'negative'}">${e.type==='income'?'+':'-'}${euroFmt.format(e.amount)}</strong><button class="mini-btn delete" onclick="deleteFutureEvent('${e.id}')">⌫</button></div></div>`}
function goals(){return `<section class="page ${state.page==='goals'?'active':''}"><div class="page-head"><div><h1>Obiettivi</h1></div><button class="icon-btn" onclick="openSettings()">⚙</button></div><button class="primary-btn" style="width:100%;font-size:18px" onclick="openGoal()">＋ Nuovo obiettivo</button><div class="goal-tabs"><button class="active">In corso (${state.goals.length})</button><button>Completati (0)</button><button>Archiviati (0)</button></div><div class="goals-list">${state.goals.map(goalCard).join('')||'<div class="empty">Non hai ancora obiettivi.</div>'}</div></section>`}
function goalVisual(name){
  const x=(name||'').toLowerCase();
  // Una sola immagine/simbolo, scelto in base al titolo specifico dell'obiettivo.
  if(/berlin|berlino/.test(x)) return '🍺';
  if(/germania|deutschland/.test(x)) return '🇩🇪';
  if(/roma|italia/.test(x)) return '🏛️';
  if(/parigi|paris|francia/.test(x)) return '🗼';
  if(/londra|london|inghilterra|uk/.test(x)) return '🎡';
  if(/spagna|barcellona|madrid/.test(x)) return '🇪🇸';
  if(/portogallo|lisbona/.test(x)) return '🇵🇹';
  if(/new york|usa|america/.test(x)) return '🗽';
  if(/giappone|tokyo|tokio/.test(x)) return '🇯🇵';
  if(/thai|tailandia/.test(x)) return '🇹🇭';
  if(/viaggio|vacanza/.test(x)) return '✈️';
  if(/mare|spiaggia|isola/.test(x)) return '🏖️';
  if(/casa|appartamento/.test(x)) return '🏠';
  if(/auto|macchina/.test(x)) return '🚗';
  if(/chitarra|musica|concerto/.test(x)) return '🎸';
  if(/pc|computer|telefono|cellulare/.test(x)) return '💻';
  if(/corso|studio|master|libro/.test(x)) return '📚';
  if(/fitness|palestra|dimagr/.test(x)) return '💪';
  return '🎯';
}
function goalCard(g){const a=analyseGoal(g),pct=Math.min(100,g.saved/g.cost*100);return `<div class="goal-card"><div class="goal-content"><div class="goal-top"><div><h3 class="editable-title" onclick="openGoal('${g.id}')">${escapeHtml(g.name)}</h3><b class="positive">${euroFmt.format(g.cost)}</b><p>Entro il ${new Date(g.deadline+'T12:00').toLocaleDateString('it-IT')}</p><p>Mancano ${a.monthsLeft} mesi · Priorità ${g.priority}</p></div><div class="goal-side"><span class="status ${a.status}">${a.label}</span><div class="goal-visual" aria-hidden="true">${goalVisual(g.name)}</div></div></div><div class="progress"><i style="width:${pct}%"></i></div><div class="goal-foot"><span>${euroFmt.format(g.saved)}</span><span>${Math.round(pct)}%</span><span>${euroFmt.format(g.cost)}</span></div><div class="goal-actions"><button class="secondary-btn" style="flex:1" onclick="openGoalAnalysis('${g.id}')">Analizza</button><button class="danger-btn" onclick="deleteGoal('${g.id}')">⌫</button></div></div></div>`}
function analyseGoal(g){const now=new Date('2026-09-01T12:00'),end=new Date(g.deadline+'T12:00');let months=Math.max(1,(end.getFullYear()-now.getFullYear())*12+end.getMonth()-now.getMonth()+1);const needed=Math.max(0,(g.cost-g.saved)/months);const cap=Math.max(0,monthlyCapacity()-(g.cushion>state.balance?0:0));const ratio=cap?needed/cap:Infinity;let status='good',label='✓ In linea';if(ratio>.9&&ratio<=1.25){status='watch';label='⚠ Da monitorare'}if(ratio>1.25){status='bad';label='✕ Non raggiungibile'}return {monthsLeft:months,needed,capacity:cap,status,label,ratio}}
function movements(){const items=[...state.transactions].sort((a,b)=>b.date.localeCompare(a.date)).filter(t=>state.movementFilter==='all'||t.type===state.movementFilter);return `<section class="page ${state.page==='movements'?'active':''}"><div class="page-head"><div><h1>Movimenti</h1></div><button class="primary-btn" onclick="openTransaction('income','${day.key}')">＋</button></div><div class="filters"><button class="filter-btn ${state.movementFilter==='all'?'active':''}" onclick="setFilter('all')">Tutti</button><button class="filter-btn ${state.movementFilter==='income'?'active':''}" onclick="setFilter('income')">Entrate</button><button class="filter-btn ${state.movementFilter==='expense'?'active':''}" onclick="setFilter('expense')">Uscite</button></div><div class="movement-list">${items.map(t=>`<div class="movement-row"><div class="event-icon">${t.type==='income'?'↗':'↘'}</div><div class="event-meta"><b>${escapeHtml(t.description)}</b><small>${t.category} · ${new Date(t.date+'T12:00').toLocaleDateString('it-IT')}</small></div><div class="event-actions"><strong class="movement-amount ${t.type==='income'?'positive':'negative'}">${t.type==='income'?'+':'-'}${euroFmt.format(t.amount)}</strong><button class="mini-btn delete" onclick="deleteTransaction('${t.id}')">⌫</button></div></div>`).join('')||'<div class="empty">Nessun movimento.</div>'}</div></section>`}
function render(){
  const app=document.getElementById('app');
  try{
    app.innerHTML=dashboard()+movements()+forecasts()+goals();
    document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>changePage(b.dataset.nav)));
    const quick=document.getElementById('quickAdd');
    if(quick) quick.onclick=()=>openTransaction();
    const weekViewport=document.querySelector('.week-viewport');
    if(weekViewport){
      let startX=0,startY=0,tracking=false;
      weekViewport.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;const t=e.touches[0];startX=t.clientX;startY=t.clientY;tracking=true},{passive:true});
      weekViewport.addEventListener('touchend',e=>{if(!tracking)return;tracking=false;const t=e.changedTouches[0];const dx=t.clientX-startX,dy=t.clientY-startY;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.2){shiftDashboardWeek(dx<0?1:-1)}},{passive:true});
    }
  }catch(err){
    console.error('Errore durante il rendering',err);
    app.innerHTML=`<section class="page active"><div class="panel" style="padding:24px;text-align:center"><h2>Matteo's Finance ha recuperato un problema</h2><p>Non sono andati persi i tuoi dati. Puoi ripristinare l'avvio sicuro dell'app.</p><button class="primary-btn" onclick="resetDemo()">Ripristina dati sicuri</button></div></section>`;
  }
}
function setFilter(x){state.movementFilter=x;save();render()}
function openModal(content){document.getElementById('modalRoot').innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal">${content}</div></div>`}
function closeModal(){document.getElementById('modalRoot').innerHTML=''}
function openTransaction(defaultType='income',presetDate='2026-09-06'){let type=defaultType||'income';openModal(`<div class="modal-head"><h2>Nuovo movimento</h2><button class="close-btn" onclick="closeModal()">×</button></div><div class="type-switch"><button id="typeIncome" class="income ${type==='income'?'active':''}" onclick="selectType('income')">↓ Entrata</button><button id="typeExpense" class="expense ${type==='expense'?'active':''}" onclick="selectType('expense')">↑ Uscita</button></div><form id="transactionForm" class="form-grid"><div class="form-grid two"><div class="field"><label>Data</label><input name="date" type="date" value="${presetDate}" required></div><div class="field"><label>Categoria</label><select id="transactionCategory" name="category">${categoryOptions(type)}</select></div></div><div class="field"><label>Importo</label><input name="amount" type="number" min="0.01" step="0.01" required></div><div class="modal-actions"><button type="button" class="secondary-btn" onclick="closeModal()">Annulla</button><button class="primary-btn">Salva movimento</button></div></form>`);document.getElementById('transactionForm').dataset.type=type;document.getElementById('transactionForm').addEventListener('submit',submitTransaction)}
function selectType(type){const f=document.getElementById('transactionForm');f.dataset.type=type;document.getElementById('typeIncome').classList.toggle('active',type==='income');document.getElementById('typeExpense').classList.toggle('active',type==='expense');const category=document.getElementById('transactionCategory');if(category)category.innerHTML=categoryOptions(type)}
function submitTransaction(ev){ev.preventDefault();const f=ev.currentTarget,d=new FormData(f),amount=Number(d.get('amount'));state.transactions.push({id:uid(),date:d.get('date'),type:f.dataset.type,category:d.get('category'),description:d.get('category'),amount});recalculateBalance();save();closeModal();render()}
function deleteTransaction(id){const t=state.transactions.find(x=>x.id===id);if(!t)return;if(!confirm('Eliminare questo movimento?'))return;state.transactions=state.transactions.filter(x=>x.id!==id);recalculateBalance();save();render()}
function openFutureEvent(editId=null){const existing=editId?state.futureEvents.find(e=>e.id===editId):null;let type=existing?existing.type:'expense';const title=existing?'Modifica evento previsto':'Nuovo evento previsto';openModal(`<div class="modal-head"><h2>${title}</h2><button class="close-btn" onclick="closeModal()">×</button></div><div class="type-switch"><button id="typeIncome" class="income ${type==='income'?'active':''}" onclick="selectFutureType('income')">↓ Entrata</button><button id="typeExpense" class="expense ${type==='expense'?'active':''}" onclick="selectFutureType('expense')">↑ Uscita</button></div><form id="futureForm" class="form-grid"><div class="form-grid two"><div class="field"><label>Data</label><input name="date" type="date" value="${existing?existing.date:state.forecastMonth+'-15'}" required></div><div class="field"><label>Categoria</label><select id="futureCategory" name="category">${futureCategoryOptions(type).replace(`<option>${existing?.category||''}</option>`,`<option selected>${existing?.category||''}</option>`)}</select></div></div><div class="field"><label>Descrizione</label><input name="description" value="${escapeHtml(existing?.description||'')}" required></div><div class="field"><label>Importo</label><input name="amount" type="number" min="0.01" step="0.01" value="${existing?.amount??''}" required></div><div class="modal-actions"><button type="button" class="secondary-btn" onclick="closeModal()">Annulla</button><button class="primary-btn">${existing?'Salva modifiche':'Salva evento'}</button></div></form>`);const form=document.getElementById('futureForm');form.dataset.type=type;if(editId)form.dataset.editId=editId;form.addEventListener('submit',submitFuture)}
function selectFutureType(type){const f=document.getElementById('futureForm');f.dataset.type=type;document.getElementById('typeIncome').classList.toggle('active',type==='income');document.getElementById('typeExpense').classList.toggle('active',type==='expense');const category=document.getElementById('futureCategory');if(category)category.innerHTML=futureCategoryOptions(type)}
function submitFuture(ev){ev.preventDefault();const f=ev.currentTarget,d=new FormData(f);const data={date:d.get('date'),type:f.dataset.type,category:d.get('category'),description:d.get('description'),amount:Number(d.get('amount'))};if(f.dataset.editId){const i=state.futureEvents.findIndex(e=>e.id===f.dataset.editId);if(i>=0)state.futureEvents[i]={...state.futureEvents[i],...data}}else state.futureEvents.push({id:uid(),...data});save();closeModal();render()}
function deleteFutureEvent(id){if(confirm('Eliminare questo evento previsto?')){state.futureEvents=state.futureEvents.filter(e=>e.id!==id);save();render()}}
function openGoal(editId=null){const existing=editId?state.goals.find(g=>g.id===editId):null;let priority=existing?.priority||'media', cushionEnabled=Number(existing?.cushion||0)>0;const title=existing?'Modifica obiettivo':'Nuovo obiettivo';openModal(`<div class="modal-head"><h2>${title}</h2><button class="close-btn" onclick="closeModal()">×</button></div><form id="goalForm" class="form-grid"><div class="field"><label>Quale meta vuoi raggiungere?</label><input name="name" value="${escapeHtml(existing?.name||'')}" placeholder="Es. Chitarra nuova" required></div><div class="field"><label>Quanto costa?</label><input name="cost" type="number" min="1" step="0.01" value="${existing?.cost??''}" required></div><div class="field"><label>Entro quando?</label><input name="deadline" type="date" value="${existing?.deadline||'2026-12-31'}" required></div><div class="field"><label>Dai una priorità a questo obiettivo</label><div class="priority-switch"><button type="button" data-p="bassa" class="${priority==='bassa'?'active':''}">♧ Bassa</button><button type="button" data-p="media" class="${priority==='media'?'active':''}">◉ Media</button><button type="button" data-p="alta" class="${priority==='alta'?'active':''}">♥ Alta</button></div></div><div class="field"><label>Vuoi fissare un minimo di cuscino?</label><div class="type-switch"><button type="button" id="cushionNo" class="${!cushionEnabled?'active':''}">No</button><button type="button" id="cushionYes" class="${cushionEnabled?'active':''}">Sì</button></div></div><div id="cushionField" class="field" style="display:${cushionEnabled?'block':'none'}"><label>Importo minimo del cuscino</label><input name="cushion" type="number" min="0" step="0.01" value="${existing?.cushion??0}"></div><div class="modal-actions"><button type="button" class="secondary-btn" onclick="closeModal()">Annulla</button><button class="primary-btn">${existing?'Salva modifiche':'Analizza obiettivo'}</button></div></form>`);document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{priority=b.dataset.p;document.querySelectorAll('[data-p]').forEach(x=>x.classList.toggle('active',x===b))});document.getElementById('cushionNo').onclick=()=>{cushionEnabled=false;document.getElementById('cushionField').style.display='none';document.getElementById('cushionNo').classList.add('active');document.getElementById('cushionYes').classList.remove('active')};document.getElementById('cushionYes').onclick=()=>{cushionEnabled=true;document.getElementById('cushionField').style.display='block';document.getElementById('cushionYes').classList.add('active');document.getElementById('cushionNo').classList.remove('active')};const form=document.getElementById('goalForm');form.addEventListener('submit',ev=>{ev.preventDefault();const d=new FormData(ev.currentTarget),data={name:d.get('name'),cost:Number(d.get('cost')),deadline:d.get('deadline'),priority,cushion:cushionEnabled?Number(d.get('cushion')):0};if(existing){const i=state.goals.findIndex(g=>g.id===existing.id);if(i>=0)state.goals[i]={...state.goals[i],...data};save();closeModal();render()}else{const g={id:uid(),...data,saved:0};state.goals.push(g);save();closeModal();openGoalAnalysis(g.id)}})}
function openGoalAnalysis(id){const g=state.goals.find(x=>x.id===id);if(!g)return;const a=analyseGoal(g);openModal(`<div class="modal-head"><h2>Analisi obiettivo</h2><button class="close-btn" onclick="closeModal()">×</button></div><div class="analysis-box ${a.status}" style="margin-top:16px"><h3 style="margin-top:0">${escapeHtml(g.name)}</h3><div class="forecast-row"><span>Risparmio mensile necessario</span><b>${euroFmt.format(a.needed)}</b></div><div class="forecast-row"><span>Capacità di risparmio stimata</span><b>${euroFmt.format(a.capacity)}</b></div><div class="forecast-row"><span>Tempo disponibile</span><b>${a.monthsLeft} mesi</b></div><div class="forecast-row"><span>Cuscino considerato</span><b>${euroFmt.format(g.cushion)}</b></div><h3>${a.label}</h3><p>${a.status==='good'?'Con l’andamento attuale puoi raggiungere l’obiettivo entro la data prevista.':a.status==='watch'?'L’obiettivo è vicino al limite: conviene monitorare spese e risparmio mensile.':'Con la capacità stimata attuale l’obiettivo non è raggiungibile entro la data prevista.'}</p></div><div class="modal-actions"><button class="primary-btn" onclick="closeModal();render()">Chiudi</button></div>`)}
function deleteGoal(id){if(confirm('Eliminare questo obiettivo?')){state.goals=state.goals.filter(g=>g.id!==id);save();render()}}
function openSettings(){openModal(`<div class="modal-head"><h2>⚙ Impostazioni</h2><button class="close-btn" onclick="closeModal()">×</button></div>
<div class="settings-section"><h3>Capitale di partenza</h3><p>Indica quanti soldi possedevi e in quale mese vuoi far iniziare il calcolo del capitale.</p><div class="field"><label>In quale mese preferisci inserire il tuo capitale di partenza?</label><input id="startingCapitalMonthInput" type="month" value="${state.startingCapitalMonth||currentMonth()}"></div><div class="settings-row"><input id="startingCapitalInput" type="number" min="0" step="0.01" value="${state.startingCapital||0}"><button class="primary-btn" onclick="saveStartingCapital()">Salva</button></div></div>
<div class="settings-section"><h3>Gestione entrate e uscite</h3><p>Puoi cancellare un singolo mese oppure tutti i movimenti.</p><button class="danger-btn" onclick="openDeleteTransactions()">Cancella entrate/uscite</button></div>
<div class="settings-section"><h3>Reset</h3><div class="settings-actions"><button class="secondary-btn" onclick="confirmResetMonth()">Reset mese</button><button class="danger-btn" onclick="confirmResetTotal()">Reset totale</button></div></div>
<div class="analysis-box"><b>Dati salvati sul dispositivo</b><p>Le modifiche rimangono nel browser tramite memoria locale.</p></div>`)}
function saveStartingCapital(){const v=Math.max(0,Number(document.getElementById('startingCapitalInput').value)||0);const m=document.getElementById('startingCapitalMonthInput').value||currentMonth();state.startingCapital=v;state.startingCapitalMonth=m;recalculateBalance();save();closeModal();render()}
function openDeleteTransactions(){const months=[...new Set(state.transactions.map(t=>monthOf(t.date)))].sort();openModal(`<div class="modal-head"><h2>Cancella entrate/uscite</h2><button class="close-btn" onclick="closeModal()">×</button></div><div class="form-grid"><div class="field"><label>Seleziona il mese da cancellare</label><select id="deleteMonth"><option value="">— Seleziona un mese —</option>${months.map(m=>`<option value="${m}">${monthName(m)}</option>`).join('')}</select></div><button class="secondary-btn" onclick="confirmDeleteMonth()">Cancella il mese selezionato</button><button class="danger-btn" onclick="confirmDeleteAllTransactions()">Cancella tutti i mesi</button><button class="secondary-btn" onclick="openSettings()">Annulla</button></div>`)}
function confirmDeleteMonth(){const m=document.getElementById('deleteMonth').value;if(!m)return;if(confirm('SICURO CHE VUOI CANCELLARE tutti i dati di '+monthName(m)+'?')){state.transactions=state.transactions.filter(t=>monthOf(t.date)!==m);recalculateBalance();save();closeModal();render()}}
function confirmDeleteAllTransactions(){if(confirm('SICURO CHE VUOI CANCELLARE tutte le entrate e le uscite?')){state.transactions=[];recalculateBalance();save();closeModal();render()}}
function confirmResetMonth(){const m=currentMonth();if(confirm('Vuoi davvero cancellare i dati del mese corrente?')){state.transactions=state.transactions.filter(t=>monthOf(t.date)!==m);state.futureEvents=state.futureEvents.filter(e=>monthOf(e.date)!==m);recalculateBalance();save();closeModal();render()}}
function confirmResetTotal(){if(confirm('Vuoi davvero cancellare TUTTI i dati? Questa operazione non si può annullare.')){state.balance=0;state.startingCapital=0;state.startingCapitalMonth='';state.transactions=[];state.futureEvents=[];state.goals=[];save();closeModal();render()}}
function recalculateBalance(){const from=state.startingCapitalMonth?state.startingCapitalMonth+'-01':null;const relevant=from?state.transactions.filter(t=>t.date>=from):state.transactions;state.balance=(state.startingCapital||0)+sum(relevant.map(t=>t.type==='income'?t.amount:-t.amount))}

function resetDemo(){if(confirm('Ripristinare i dati iniziali?')){localStorage.removeItem('matteos-finance-v1');location.reload()}}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
render();
