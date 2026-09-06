const eur = new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'});
const state = JSON.parse(localStorage.getItem('matteos-finance-v1') || 'null') || {
  page:'dashboard',
  balance:3245.60,
  transactions:[
    {id:'t1',date:'2026-09-01',type:'income',category:'Stipendio',description:'Stipendio',amount:1870},
    {id:'t2',date:'2026-09-03',type:'expense',category:'Spesa',description:'Spesa alimentare',amount:649.76},
    {id:'t3',date:'2026-09-04',type:'expense',category:'Benzina',description:'Rifornimento',amount:324.88},
    {id:'t4',date:'2026-09-05',type:'expense',category:'Casa',description:'Spese casa',amount:243.66},
    {id:'t5',date:'2026-09-06',type:'expense',category:'Affitto',description:'Affitto',amount:243.66},
    {id:'t6',date:'2026-09-07',type:'expense',category:'Contrattempo',description:'Imprevisti',amount:81.22},
    {id:'t7',date:'2026-09-08',type:'expense',category:'Tempo libero',description:'Svago',amount:48.73},
    {id:'t8',date:'2026-09-09',type:'expense',category:'Altro',description:'Varie',amount:32.49}
  ],
  futureEvents:[
    {id:'e1',date:'2026-12-15',type:'expense',category:'Auto',description:'Assicurazione auto',amount:600},
    {id:'e2',date:'2026-12-18',type:'income',category:'Redditi',description:'Credito dichiarazione',amount:400}
  ],
  goals:[
    {id:'g1',name:'Chitarra nuova',cost:350,deadline:'2026-12-31',priority:'media',cushion:1000,saved:150},
    {id:'g2',name:'Vacanza Berlino',cost:1500,deadline:'2027-08-31',priority:'media',cushion:0,saved:300},
    {id:'g3',name:'Nuovo computer',cost:1200,deadline:'2027-04-30',priority:'alta',cushion:0,saved:100}
  ],
  forecastMonth:'2026-12',
  movementFilter:'all'
};
if(!Number.isInteger(state.weekOffset)) state.weekOffset=0;
const categories=['Stipendio','Spesa','Benzina','Casa','Affitto','Contrattempo','Tempo libero','Altro','Auto','Redditi','Lavoro','Salute'];
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
function dashboardWeekData(){
  const today=new Date(); today.setHours(12,0,0,0);
  const monday=new Date(today); monday.setDate(today.getDate()-((today.getDay()+6)%7)+((state.weekOffset||0)*7));
  const names=['LUN','MAR','MER','GIO','VEN','SAB','DOM'];
  return names.map((name,index)=>{
    const date=new Date(monday); date.setDate(monday.getDate()+index);
    const iso=date.toISOString().slice(0,10);
    const tx=state.transactions.filter(t=>t.date===iso);
    return {name,date,iso,income:sum(tx.filter(t=>t.type==='income').map(t=>t.amount)),expense:sum(tx.filter(t=>t.type==='expense').map(t=>t.amount)),today:date.toDateString()===today.toDateString()};
  });
}
function shiftDashboardWeek(delta){state.weekOffset=(state.weekOffset||0)+delta;save();render()}
function formatShortDate(d){return d.toLocaleDateString('it-IT',{day:'numeric',month:'short'})}
function dashboard(){
  const ym=currentMonth(), inc=income(ym), out=expenses(ym), sav=inc-out;
  const cats={}; monthTx(ym).filter(t=>t.type==='expense').forEach(t=>cats[t.category]=(cats[t.category]||0)+t.amount);
  const totalOut=out||1;
  const colors=['#7a21ff','#ff1675','#ff6247','#29e88b','#ffd34f','#ffe08a','#a93de7'];
  const entries=Object.entries(cats);
  const days=dashboardWeekData();
  const range=days.length?`${formatShortDate(days[0].date)} – ${formatShortDate(days[6].date)}`:'';
  return `<section class="page ${state.page==='dashboard'?'active':''}">
    <div class="hero hero-fixed">
      <div class="hero-topline">
        <div class="duck-wrap"><img class="duck-art" src="${DUCK}" alt="Mascotte Matteo's Finance"></div>
        <img class="finance-logo" src="${LOGO}" alt="Matteo's Finance">
        <div class="hero-actions"><button class="icon-btn" title="Notifiche" aria-label="Notifiche">🔔</button><button class="icon-btn" title="Impostazioni" aria-label="Impostazioni" onclick="openSettings()">⚙</button></div>
      </div>
      <div class="hero-month-row"><select class="month-select" onchange="state.dashboardMonth=this.value;save();render()">${monthOptions().map(x=>`<option value="${x}" ${(state.dashboardMonth||currentMonth())===x?'selected':''}>${monthName(x)}</option>`).join('')}</select></div>
      <div class="balance-card balance-fixed">
        <div class="balance-copy"><div class="balance-label">TOTALE DISPONIBILE</div><div class="balance-value">${eur.format(state.balance)}</div><div class="balance-delta"><span class="positive">↗ ${eur.format(sav)}</span> &nbsp; saldo del mese</div></div>
        <div class="balance-visual"><img class="wallet-art" src="${WALLET}" alt="Portafoglio"><img class="coins-art" src="${COINS}" alt="Crescita risparmi"></div>
        <div class="balance-buttons"><button class="big-btn income" onclick="openTransaction('income')">⊕ &nbsp; Aggiungi entrata</button><button class="big-btn expense" onclick="openTransaction('expense')">↟ &nbsp; Aggiungi uscita</button></div>
      </div>
    </div>
    <div class="section week-section-fixed"><div class="section-title"><span>▣ SETTIMANA IN CORSO</span><div class="week-nav"><button onclick="shiftDashboardWeek(-1)" aria-label="Settimana precedente">‹</button><span>${range}</span><button onclick="shiftDashboardWeek(1)" aria-label="Settimana successiva">›</button></div></div><div class="panel week-panel"><div class="week-grid">${days.map(x=>`<div class="day-card ${x.today?'today':''}"><div class="day-name">${x.name}</div><div class="day-num">${x.date.getDate()}</div><div class="day-in positive">+€ ${x.income.toFixed(0)}</div><div class="day-out negative">-€ ${x.expense.toFixed(0)}</div><button class="day-plus" onclick="openTransaction()">＋</button></div>`).join('')}</div></div></div>
    <div class="stats-grid"><div class="stat-card green"><b>↗ ENTRATE</b><strong>${eur.format(inc)}</strong><small>Questo mese</small></div><div class="stat-card pink"><b>↘ USCITE</b><strong>${eur.format(out)}</strong><small>Questo mese</small></div><div class="stat-card blue"><b>♟ RISPARMIO</b><strong>${eur.format(sav)}</strong><small>Questo mese</small></div></div>
    <div class="panel chart-panel"><div><div class="section-title" style="margin:0 0 8px">RIPARTIZIONE USCITE</div><ul class="legend">${entries.map(([c,v],i)=>`<li><i class="dot" style="background:${colors[i%colors.length]}"></i><span>${c}</span><span>${Math.round(v/totalOut*100)}%</span><span>${eur.format(v)}</span></li>`).join('')||'<li>Nessuna uscita</li>'}</ul></div><div style="position:relative;display:grid;place-items:center"><div class="donut" style="background:${donutGradient(entries,colors,totalOut)}"></div><div class="donut-center"><b>${eur.format(out)}</b><small>Totale uscite</small></div></div></div>
  </section>`
}
function donutGradient(entries,colors,total){if(!entries.length)return '#172435';let acc=0;const s=entries.map(([_,v],i)=>{const a=acc;acc+=v/total*100;return `${colors[i%colors.length]} ${a}% ${acc}%`}).join(',');return `conic-gradient(${s})`}
function forecasts(){const f=forecast(state.forecastMonth);return `<section class="page ${state.page==='forecasts'?'active':''}"><div class="page-head"><div><h1>Previsioni</h1></div><button class="icon-btn" onclick="openSettings()">⚙</button></div><div class="month-control"><button onclick="shiftForecast(-1)">‹</button><select onchange="state.forecastMonth=this.value;save();render()">${monthOptions().map(x=>`<option value="${x}" ${x===state.forecastMonth?'selected':''}>${monthName(x)}</option>`).join('')}</select><button onclick="shiftForecast(1)">›</button></div><div class="panel forecast-card"><h3 style="margin-top:0">Situazione prevista</h3><div class="forecast-row"><span>🟢 Entrate previste</span><b>${eur.format(f.income)}</b></div><div class="forecast-row"><span>🔴 Uscite previste</span><b>${eur.format(f.expenses)}</b></div><div class="forecast-row"><span>📉 Saldo mese</span><b class="${f.net>=0?'positive':'negative'}">${eur.format(f.net)}</b></div><div class="forecast-row"><span>🏦 Totale stimato fine mese</span><b class="positive">${eur.format(f.endBalance)}</b></div><div class="forecast-note">Queste previsioni applicano prudenzialmente <b>−5% alle entrate</b> e <b>+5% alle spese</b>, oltre agli eventi futuri che inserisci.</div></div><div class="section-title">Eventi futuri <button class="primary-btn" onclick="openFutureEvent()">＋ Aggiungi evento</button></div><div class="events-list">${futureEventsForMonth(state.forecastMonth).map(eventRow).join('')||'<div class="empty">Nessun evento previsto per questo mese.</div>'}</div><div class="panel" style="margin-top:14px;padding:16px"><h3 style="margin:0">Andamento previsto dei risparmi</h3><div class="bar-chart">${monthOptions().slice(0,6).map((m,i)=>{const x=forecast(m).endBalance;const h=Math.max(15,Math.min(100,x/5000*100));return `<div class="bar" style="height:${h}%"><span>${monthName(m).slice(0,3)}</span></div>`}).join('')}</div></div></section>`}
function monthOptions(){return ['2026-09','2026-10','2026-11','2026-12','2027-01','2027-02','2027-03','2027-04','2027-05','2027-06','2027-07','2027-08']}
function shiftForecast(n){const a=monthOptions(),i=a.indexOf(state.forecastMonth);state.forecastMonth=a[Math.max(0,Math.min(a.length-1,i+n))];save();render()}
function futureEventsForMonth(ym){return state.futureEvents.filter(e=>monthOf(e.date)===ym)}
function forecast(ym){const baseIncome=income(currentMonth())*.95;const baseExpenses=expenses(currentMonth())*1.05;const ev=futureEventsForMonth(ym);const ei=sum(ev.filter(e=>e.type==='income').map(e=>e.amount));const ee=sum(ev.filter(e=>e.type==='expense').map(e=>e.amount));const inc=baseIncome+ei,out=baseExpenses+ee,net=inc-out;const idx=monthOptions().indexOf(ym), baseIdx=monthOptions().indexOf(currentMonth());let running=state.balance;for(let i=baseIdx+1;i<=idx;i++){const m=monthOptions()[i];const events=futureEventsForMonth(m);running+=baseIncome+sum(events.filter(e=>e.type==='income').map(e=>e.amount))-baseExpenses-sum(events.filter(e=>e.type==='expense').map(e=>e.amount))}return {income:inc,expenses:out,net,endBalance:running}}
function eventRow(e){return `<div class="event-row"><div class="event-icon">${e.type==='income'?'▣':'▰'}</div><div class="event-meta"><b>${e.description}</b><small>${new Date(e.date+'T12:00').toLocaleDateString('it-IT')} · ${e.category}</small></div><div class="event-actions"><strong class="${e.type==='income'?'positive':'negative'}">${e.type==='income'?'+':'-'}${eur.format(e.amount)}</strong><button class="mini-btn delete" onclick="deleteFutureEvent('${e.id}')">⌫</button></div></div>`}
function goals(){return `<section class="page ${state.page==='goals'?'active':''}"><div class="page-head"><div><h1>Obiettivi</h1></div><button class="icon-btn" onclick="openSettings()">⚙</button></div><button class="primary-btn" style="width:100%;font-size:18px" onclick="openGoal()">＋ Nuovo obiettivo</button><div class="goal-tabs"><button class="active">In corso (${state.goals.length})</button><button>Completati (0)</button><button>Archiviati (0)</button></div><div class="goals-list">${state.goals.map(goalCard).join('')||'<div class="empty">Non hai ancora obiettivi.</div>'}</div></section>`}
function goalArtwork(name){
  const n=(name||'').toLowerCase();
  if(/berlino|germania|berlin/.test(n)) return {icon:'🍺🇩🇪',label:'Berlino'};
  if(/chitarra|guitar/.test(n)) return {icon:'🎸',label:'Musica'};
  if(/vacanza|viaggio|mare|hotel/.test(n)) return {icon:'✈️🌍',label:'Viaggio'};
  if(/computer|pc|laptop/.test(n)) return {icon:'💻',label:'Tecnologia'};
  if(/auto|macchina/.test(n)) return {icon:'🚗',label:'Auto'};
  if(/casa|appartamento/.test(n)) return {icon:'🏠',label:'Casa'};
  if(/moto/.test(n)) return {icon:'🏍️',label:'Moto'};
  return {icon:'🎯',label:'Obiettivo'};
}
function goalCard(g){
  const a=analyseGoal(g),pct=Math.min(100,g.saved/g.cost*100),art=goalArtwork(g.name);
  return `<div class="goal-card"><div class="goal-main"><div class="goal-copy"><div class="goal-top"><div><h3>${escapeHtml(g.name)}</h3><b class="positive">${eur.format(g.cost)}</b><p>Entro il ${new Date(g.deadline+'T12:00').toLocaleDateString('it-IT')}</p><p>Mancano ${a.monthsLeft} mesi · Priorità ${g.priority}</p></div><span class="status ${a.status}">${a.label}</span></div></div><div class="goal-art" aria-label="${art.label}">${art.icon}</div></div><div class="progress"><i style="width:${pct}%"></i></div><div class="goal-foot"><span>${eur.format(g.saved)}</span><span>${Math.round(pct)}%</span><span>${eur.format(g.cost)}</span></div><div style="margin-top:12px;display:flex;gap:8px"><button class="secondary-btn" style="flex:1" onclick="openGoalAnalysis('${g.id}')">Analizza</button><button class="danger-btn" onclick="deleteGoal('${g.id}')">⌫</button></div></div>`
}
function analyseGoal(g){const now=new Date('2026-09-01T12:00'),end=new Date(g.deadline+'T12:00');let months=Math.max(1,(end.getFullYear()-now.getFullYear())*12+end.getMonth()-now.getMonth()+1);const needed=Math.max(0,(g.cost-g.saved)/months);const cap=Math.max(0,monthlyCapacity()-(g.cushion>state.balance?0:0));const ratio=cap?needed/cap:Infinity;let status='good',label='✓ In linea';if(ratio>.9&&ratio<=1.25){status='watch';label='⚠ Da monitorare'}if(ratio>1.25){status='bad';label='✕ Non raggiungibile'}return {monthsLeft:months,needed,capacity:cap,status,label,ratio}}
function movements(){const items=[...state.transactions].sort((a,b)=>b.date.localeCompare(a.date)).filter(t=>state.movementFilter==='all'||t.type===state.movementFilter);return `<section class="page ${state.page==='movements'?'active':''}"><div class="page-head"><div><h1>Movimenti</h1></div><button class="primary-btn" onclick="openTransaction()">＋</button></div><div class="filters"><button class="filter-btn ${state.movementFilter==='all'?'active':''}" onclick="setFilter('all')">Tutti</button><button class="filter-btn ${state.movementFilter==='income'?'active':''}" onclick="setFilter('income')">Entrate</button><button class="filter-btn ${state.movementFilter==='expense'?'active':''}" onclick="setFilter('expense')">Uscite</button></div><div class="movement-list">${items.map(t=>`<div class="movement-row"><div class="event-icon">${t.type==='income'?'↗':'↘'}</div><div class="event-meta"><b>${escapeHtml(t.description)}</b><small>${t.category} · ${new Date(t.date+'T12:00').toLocaleDateString('it-IT')}</small></div><div class="event-actions"><strong class="movement-amount ${t.type==='income'?'positive':'negative'}">${t.type==='income'?'+':'-'}${eur.format(t.amount)}</strong><button class="mini-btn delete" onclick="deleteTransaction('${t.id}')">⌫</button></div></div>`).join('')||'<div class="empty">Nessun movimento.</div>'}</div></section>`}
function render(){document.getElementById('app').innerHTML=dashboard()+movements()+forecasts()+goals();document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>changePage(b.dataset.nav)));document.getElementById('quickAdd').onclick=()=>openTransaction();}
function setFilter(x){state.movementFilter=x;save();render()}
function openModal(content){document.getElementById('modalRoot').innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal">${content}</div></div>`}
function closeModal(){document.getElementById('modalRoot').innerHTML=''}
function openTransaction(defaultType='income'){let type=defaultType||'income';openModal(`<div class="modal-head"><h2>Nuovo movimento</h2><button class="close-btn" onclick="closeModal()">×</button></div><div class="type-switch"><button id="typeIncome" class="income active" onclick="selectType('income')">↓ Entrata</button><button id="typeExpense" class="expense" onclick="selectType('expense')">↑ Uscita</button></div><form id="transactionForm" class="form-grid"><div class="form-grid two"><div class="field"><label>Data</label><input name="date" type="date" value="2026-09-06" required></div><div class="field"><label>Categoria</label><select name="category">${categories.map(c=>`<option>${c}</option>`).join('')}</select></div></div><div class="field"><label>Descrizione</label><input name="description" placeholder="Es. Assicurazione auto" required></div><div class="field"><label>Importo</label><input name="amount" type="number" min="0.01" step="0.01" required></div><div class="modal-actions"><button type="button" class="secondary-btn" onclick="closeModal()">Annulla</button><button class="primary-btn">Salva movimento</button></div></form>`);document.getElementById('transactionForm').dataset.type=type;document.getElementById('transactionForm').addEventListener('submit',submitTransaction)}
function selectType(type){const f=document.getElementById('transactionForm');f.dataset.type=type;document.getElementById('typeIncome').classList.toggle('active',type==='income');document.getElementById('typeExpense').classList.toggle('active',type==='expense')}
function submitTransaction(ev){ev.preventDefault();const f=ev.currentTarget,d=new FormData(f),amount=Number(d.get('amount'));state.transactions.push({id:uid(),date:d.get('date'),type:f.dataset.type,category:d.get('category'),description:d.get('description'),amount});state.balance+=f.dataset.type==='income'?amount:-amount;save();closeModal();render()}
function deleteTransaction(id){const t=state.transactions.find(x=>x.id===id);if(!t)return;if(!confirm('Eliminare questo movimento?'))return;state.balance+=t.type==='income'?-t.amount:t.amount;state.transactions=state.transactions.filter(x=>x.id!==id);save();render()}
function openFutureEvent(){let type='expense';openModal(`<div class="modal-head"><h2>Nuovo evento previsto</h2><button class="close-btn" onclick="closeModal()">×</button></div><div class="type-switch"><button id="typeIncome" class="income" onclick="selectFutureType('income')">↓ Entrata</button><button id="typeExpense" class="expense active" onclick="selectFutureType('expense')">↑ Uscita</button></div><form id="futureForm" class="form-grid"><div class="form-grid two"><div class="field"><label>Data</label><input name="date" type="date" value="${state.forecastMonth}-15" required></div><div class="field"><label>Categoria</label><select name="category">${categories.map(c=>`<option>${c}</option>`).join('')}</select></div></div><div class="field"><label>Descrizione</label><input name="description" required></div><div class="field"><label>Importo</label><input name="amount" type="number" min="0.01" step="0.01" required></div><div class="modal-actions"><button type="button" class="secondary-btn" onclick="closeModal()">Annulla</button><button class="primary-btn">Salva evento</button></div></form>`);document.getElementById('futureForm').dataset.type=type;document.getElementById('futureForm').addEventListener('submit',submitFuture)}
function selectFutureType(type){const f=document.getElementById('futureForm');f.dataset.type=type;document.getElementById('typeIncome').classList.toggle('active',type==='income');document.getElementById('typeExpense').classList.toggle('active',type==='expense')}
function submitFuture(ev){ev.preventDefault();const f=ev.currentTarget,d=new FormData(f);state.futureEvents.push({id:uid(),date:d.get('date'),type:f.dataset.type,category:d.get('category'),description:d.get('description'),amount:Number(d.get('amount'))});save();closeModal();render()}
function deleteFutureEvent(id){if(confirm('Eliminare questo evento previsto?')){state.futureEvents=state.futureEvents.filter(e=>e.id!==id);save();render()}}
function openGoal(){let priority='media', cushionEnabled=false;openModal(`<div class="modal-head"><h2>Nuovo obiettivo</h2><button class="close-btn" onclick="closeModal()">×</button></div><form id="goalForm" class="form-grid"><div class="field"><label>Quale meta vuoi raggiungere?</label><input name="name" placeholder="Es. Chitarra nuova" required></div><div class="field"><label>Quanto costa?</label><input name="cost" type="number" min="1" step="0.01" required></div><div class="field"><label>Entro quando?</label><input name="deadline" type="date" value="2026-12-31" required></div><div class="field"><label>Dai una priorità a questo obiettivo</label><div class="priority-switch"><button type="button" data-p="bassa">♧ Bassa</button><button type="button" data-p="media" class="active">◉ Media</button><button type="button" data-p="alta">♥ Alta</button></div></div><div class="field"><label>Vuoi fissare un minimo di cuscino?</label><div class="type-switch"><button type="button" id="cushionNo" class="active">No</button><button type="button" id="cushionYes">Sì</button></div></div><div id="cushionField" class="field" style="display:none"><label>Importo minimo del cuscino</label><input name="cushion" type="number" min="0" step="0.01" value="0"></div><div class="modal-actions"><button type="button" class="secondary-btn" onclick="closeModal()">Annulla</button><button class="primary-btn">Analizza obiettivo</button></div></form>`);document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{priority=b.dataset.p;document.querySelectorAll('[data-p]').forEach(x=>x.classList.toggle('active',x===b))});document.getElementById('cushionNo').onclick=()=>{cushionEnabled=false;document.getElementById('cushionField').style.display='none';document.getElementById('cushionNo').classList.add('active');document.getElementById('cushionYes').classList.remove('active')};document.getElementById('cushionYes').onclick=()=>{cushionEnabled=true;document.getElementById('cushionField').style.display='block';document.getElementById('cushionYes').classList.add('active');document.getElementById('cushionNo').classList.remove('active')};document.getElementById('goalForm').addEventListener('submit',ev=>{ev.preventDefault();const d=new FormData(ev.currentTarget),g={id:uid(),name:d.get('name'),cost:Number(d.get('cost')),deadline:d.get('deadline'),priority,cushion:cushionEnabled?Number(d.get('cushion')):0,saved:0};state.goals.push(g);save();closeModal();openGoalAnalysis(g.id)})}
function openGoalAnalysis(id){const g=state.goals.find(x=>x.id===id);if(!g)return;const a=analyseGoal(g);openModal(`<div class="modal-head"><h2>Analisi obiettivo</h2><button class="close-btn" onclick="closeModal()">×</button></div><div class="analysis-box ${a.status}" style="margin-top:16px"><h3 style="margin-top:0">${escapeHtml(g.name)}</h3><div class="forecast-row"><span>Risparmio mensile necessario</span><b>${eur.format(a.needed)}</b></div><div class="forecast-row"><span>Capacità di risparmio stimata</span><b>${eur.format(a.capacity)}</b></div><div class="forecast-row"><span>Tempo disponibile</span><b>${a.monthsLeft} mesi</b></div><div class="forecast-row"><span>Cuscino considerato</span><b>${eur.format(g.cushion)}</b></div><h3>${a.label}</h3><p>${a.status==='good'?'Con l’andamento attuale puoi raggiungere l’obiettivo entro la data prevista.':a.status==='watch'?'L’obiettivo è vicino al limite: conviene monitorare spese e risparmio mensile.':'Con la capacità stimata attuale l’obiettivo non è raggiungibile entro la data prevista.'}</p></div><div class="modal-actions"><button class="primary-btn" onclick="closeModal();render()">Chiudi</button></div>`)}
function deleteGoal(id){if(confirm('Eliminare questo obiettivo?')){state.goals=state.goals.filter(g=>g.id!==id);save();render()}}
function openSettings(){openModal(`<div class="modal-head"><h2>Impostazioni</h2><button class="close-btn" onclick="closeModal()">×</button></div><div class="form-grid"><div class="analysis-box"><b>Dati salvati sul dispositivo</b><p>I movimenti, le previsioni e gli obiettivi rimangono salvati nel browser tramite memoria locale.</p></div><button class="danger-btn" onclick="resetDemo()">Ripristina dati demo</button></div>`)}
function resetDemo(){if(confirm('Ripristinare i dati iniziali?')){localStorage.removeItem('matteos-finance-v1');location.reload()}}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
render();
