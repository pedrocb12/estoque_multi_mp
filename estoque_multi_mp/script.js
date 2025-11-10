// script.js - lógica comum e utilitários (atualizado)
const LS_KEYS = { MATERIAS: 'estoque_materias_v2', PRODUTOS: 'estoque_produtos_v2', ACTIVITY: 'estoque_activity_v2' };

function nowDate(){
  const d = new Date();
  return d.toLocaleDateString('pt-BR');
}

function load(key){
  try{return JSON.parse(localStorage.getItem(key) || '[]')}
  catch(e){return []}
}
function save(key,val){localStorage.setItem(key,JSON.stringify(val))}

function statusFrom(current, min){
  if(current > min) return 'green';
  if(current === Number(min)) return 'yellow';
  return 'red';
}

function formatStatusCell(status){
  const span = document.createElement('span');
  span.className = 'status-dot ' + (status==='green'? 'status-green' : status==='yellow'? 'status-yellow':'status-red');
  return span;
}

function exportTableToExcel(tableEl, filename){
  try{
    const wb = XLSX.utils.table_to_book(tableEl, {sheet: 'Estoque'});
    XLSX.writeFile(wb, filename + '.xlsx');
  }catch(e){
    alert('Erro ao exportar. Verifique se xlsx.full.min.js está disponível.');
    console.error(e);
  }
}

function pushActivity(text){
  const acts = load(LS_KEYS.ACTIVITY);
  acts.unshift({text, date: new Date().toISOString()});
  save(LS_KEYS.ACTIVITY, acts.slice(0,200));
}

// resumo para index
function refreshSummary(){
  const materias = load(LS_KEYS.MATERIAS);
  const produtos = load(LS_KEYS.PRODUTOS);
  const totalMP = materias.length;
  const totalPF = produtos.length;
  const emLimite = materias.filter(m=>{
    const atual = (Number(m.estoque_inicial)||0) + (Number(m.entradas)||0) - (Number(m.saidas)||0) - (Number(m.usado)||0);
    return atual <= Number(m.estoque_minimo);
  }).length;
  const el1 = document.getElementById('total-materias');
  if(el1) el1.textContent = totalMP;
  const el2 = document.getElementById('total-produtos');
  if(el2) el2.textContent = totalPF;
  const el3 = document.getElementById('em-limite');
  if(el3) el3.textContent = emLimite;

  const activity = load(LS_KEYS.ACTIVITY);
  const listEl = document.getElementById('activity-list');
  if(listEl){
    const list = activity.slice(0,10).map(a=>`- ${new Date(a.date).toLocaleString()} — ${a.text}`).join('\n');
    listEl.textContent = list || 'Nenhuma atividade ainda.';
  }
}

// chamar refresh caso index carregue
if(document.readyState!=='loading'){
  if(document.getElementById('total-materias')) refreshSummary();
} else {
  document.addEventListener('DOMContentLoaded', ()=>{ if(document.getElementById('total-materias')) refreshSummary(); });
}

// exportadores públicos para páginas
window.exportTableToExcel = exportTableToExcel;
window.LS_KEYS = LS_KEYS;
window.load = load;
window.save = save;
window.pushActivity = pushActivity;
window.nowDate = nowDate;
window.statusFrom = statusFrom;
window.formatStatusCell = formatStatusCell;
