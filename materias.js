// materias.js (atualizado: inclui custo por unidade)
(function(){
  const key = LS_KEYS.MATERIAS;
  const tabelaBody = document.querySelector('#tabela-materias tbody');
  const form = document.getElementById('form-materia');

  function calcEstoqueAtual(m){
    const inicial = Number(m.estoque_inicial||0);
    const entradas = Number(m.entradas||0);
    const saidas = Number(m.saidas||0);
    const usado = Number(m.usado||0);
    return inicial + entradas - saidas - usado;
  }

  function render(){
    const arr = load(key);
    if(!tabelaBody) return;
    tabelaBody.innerHTML = '';
    arr.forEach((m, idx)=>{
      const tr = document.createElement('tr');
      const atual = calcEstoqueAtual(m);
      const status = statusFrom(atual, Number(m.estoque_minimo||0));
      tr.innerHTML = `
        <td>${m.codigo||''}</td>
        <td>${m.nome||''}</td>
        <td>${m.estoque_inicial||0}</td>
        <td>${m.entradas||0}</td>
        <td>${m.saidas||0}</td>
        <td>${m.usado||0}</td>
        <td>${atual}</td>
        <td>${m.unidade||''}</td>
        <td>${typeof m.custo_per_unit !== 'undefined' ? m.custo_per_unit : ''}</td>
        <td>${m.ultima_atualizacao||''}</td>
        <td class="status-cell"></td>
        <td>
          <button class="btn edit" data-i="${idx}">Editar</button>
          <button class="btn danger delete" data-i="${idx}">Excluir</button>
        </td>
      `;
      tr.querySelector('.status-cell').appendChild(formatStatusCell(status));
      tabelaBody.appendChild(tr);
    });
  }

  function resetForm(){
    if(!form) return;
    form.reset(); document.getElementById('mp-id').value='';
  }

  if(form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const mpId = document.getElementById('mp-id').value;
      const obj = {
        codigo: document.getElementById('mp-codigo').value,
        nome: document.getElementById('mp-nome').value,
        estoque_inicial: Number(document.getElementById('mp-estoque-inicial').value)||0,
        entradas: Number(document.getElementById('mp-entradas').value)||0,
        saidas: Number(document.getElementById('mp-saidas').value)||0,
        usado:  Number(document.getElementById('mp-usado')?.value||0),
        estoque_minimo: Number(document.getElementById('mp-estoque-minimo').value)||0,
        unidade: document.getElementById('mp-unidade').value,
        custo_per_unit: Number(document.getElementById('mp-custo').value) || 0,
        ultima_atualizacao: nowDate()
      };
      const arr = load(key);
      if(mpId!=='' && typeof arr[Number(mpId)] !== 'undefined'){ arr[Number(mpId)] = obj; pushActivity(`Matéria‑prima editada: ${obj.codigo} - ${obj.nome}`); }
      else { arr.push(obj); pushActivity(`Matéria‑prima criada: ${obj.codigo} - ${obj.nome}`); }
      save(key, arr); render(); resetForm(); if(document.getElementById('pf-mp-selecao')) populateMpSelect();
    });
  }

  if(tabelaBody){
    tabelaBody.addEventListener('click', (e)=>{
      if(e.target.matches('.edit')){
        const i = Number(e.target.dataset.i); const arr = load(key); const m = arr[i];
        document.getElementById('mp-id').value = i;
        document.getElementById('mp-codigo').value = m.codigo;
        document.getElementById('mp-nome').value = m.nome;
        document.getElementById('mp-estoque-inicial').value = m.estoque_inicial;
        document.getElementById('mp-entradas').value = m.entradas;
        document.getElementById('mp-saidas').value = m.saidas;
        document.getElementById('mp-estoque-minimo').value = m.estoque_minimo;
        document.getElementById('mp-unidade').value = m.unidade;
        document.getElementById('mp-custo').value = m.custo_per_unit || '';
      }
      if(e.target.matches('.delete')){
        if(!confirm('Excluir esta matéria‑prima?')) return;
        const i = Number(e.target.dataset.i); const arr = load(key); const removed = arr.splice(i,1)[0]; save(key,arr); pushActivity(`Matéria‑prima excluída: ${removed.codigo}`); render(); if(document.getElementById('pf-mp-selecao')) populateMpSelect();
      }
    });
  }

  const exportBtn = document.getElementById('export-mp');
  if(exportBtn){
    exportBtn.addEventListener('click', ()=>{
      const table = document.getElementById('tabela-materias');
      if(table) exportTableToExcel(table, 'materias_primas');
    });
  }

  // exposições
  window.populateMpSelect = function(){
    const sel = document.querySelectorAll('.mp-select');
    const materias = load(key);
    sel.forEach(s=>{
      const curVal = s.value;
      s.innerHTML = '<option value="">--Escolha MP--</option>';
      materias.forEach((m, i)=>{ const opt = document.createElement('option'); opt.value = i; opt.textContent = `${m.codigo} — ${m.nome}`; s.appendChild(opt); });
      if(curVal) s.value = curVal;
    });
    // também preencher selects simples (se existirem)
    const simple = document.getElementById('pf-mp-selecao');
    if(simple){
      simple.innerHTML = '<option value="">--Escolha MP--</option>';
      materias.forEach((m,i)=>{ const opt = document.createElement('option'); opt.value=i; opt.textContent = `${m.codigo} — ${m.nome}`; simple.appendChild(opt); });
    }
  }

  // inicial
  render();
  if(!document.getElementById('mp-usado')){
    const hidden = document.createElement('input'); hidden.type='hidden'; hidden.id='mp-usado'; hidden.value='0'; form && form.appendChild(hidden);
  }

  // atualizar selects quando a página carrega
  document.addEventListener('DOMContentLoaded', ()=>{ populateMpSelect(); });
})();