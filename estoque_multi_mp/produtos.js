// produtos.js (suporta múltiplas matérias-primas por produto)
(function(){
  const key = LS_KEYS.PRODUTOS;
  const tabelaBody = document.querySelector('#tabela-produtos tbody');
  const form = document.getElementById('form-produto');
  const mpList = document.getElementById('mp-list');
  const mpRowTemplate = document.getElementById('mp-row-template');

  function calcEstoqueAtual(p){
    const inicial = Number(p.estoque_inicial||0);
    const produzido = Number(p.produzido||0);
    const vendido = Number(p.vendido||0);
    return inicial + produzido - vendido;
  }

  function render(){
    const arr = load(key);
    if(!tabelaBody) return;
    tabelaBody.innerHTML = '';
    arr.forEach((p, idx)=>{
      const tr = document.createElement('tr');
      const atual = calcEstoqueAtual(p);
      const status = statusFrom(atual, Number(p.estoque_minimo||0));
      const mpSummary = (p.materiasPrimas||[]).map(m=>`${m.mp_nome.split(' — ')[1]||m.mp_nome}: ${m.qtd_por_unidade}${m.unidade? ' '+m.unidade : ''}`).join('; ');
      tr.innerHTML = `
        <td>${p.codigo||''}</td>
        <td>${p.nome||''}</td>
        <td>${p.estoque_inicial||0}</td>
        <td>${p.produzido||0}</td>
        <td>${p.vendido||0}</td>
        <td>${atual}</td>
        <td>${mpSummary}</td>
        <td>${p.ultima_producao||''}</td>
        <td class="status-cell"></td>
        <td>
          <button class="btn produzir" data-i="${idx}">Registrar Produção</button>
          <button class="btn edit" data-i="${idx}">Editar</button>
          <button class="btn danger delete" data-i="${idx}">Excluir</button>
        </td>
      `;
      tr.querySelector('.status-cell').appendChild(formatStatusCell(status));
      tabelaBody.appendChild(tr);
    });
  }

  function resetForm(){ form && form.reset(); if(document.getElementById('pf-id')) document.getElementById('pf-id').value=''; mpList && (mpList.innerHTML=''); updateTotalCost(); }

  function addMpRow(data){
    const tpl = mpRowTemplate.content.cloneNode(true);
    const row = tpl.querySelector('.mp-row');
    const sel = row.querySelector('.mp-select');
    const qty = row.querySelector('.mp-qty');
    const unit = row.querySelector('.mp-unit');
    const cost = row.querySelector('.mp-cost');
    const btnRemove = row.querySelector('.remove-mp');

    // populate options
    populateMpSelect();
    // after populateMpSelect runs, there's a small chance the select isn't filled in the cloned node yet,
    // so we fill manually:
    const materias = load(LS_KEYS.MATERIAS);
    sel.innerHTML = '<option value="">--Escolha MP--</option>';
    materias.forEach((m,i)=>{ const opt = document.createElement('option'); opt.value=i; opt.textContent = `${m.codigo} — ${m.nome}`; sel.appendChild(opt); });

    if(data){
      sel.value = data.mp_index;
      qty.value = data.qtd_por_unidade;
      unit.value = data.unidade || '';
      cost.value = data.custo_per_unit || '';
    }

    sel.addEventListener('change', ()=>{
      const idx = sel.value;
      if(idx==='') { unit.value=''; cost.value=''; return; }
      const m = load(LS_KEYS.MATERIAS)[Number(idx)];
      if(!m) return;
      unit.value = m.unidade || '';
      cost.value = typeof m.custo_per_unit !== 'undefined' ? m.custo_per_unit : '';
      updateTotalCost();
    });

    qty.addEventListener('input', updateTotalCost);
    cost.addEventListener('input', updateTotalCost);

    btnRemove.addEventListener('click', ()=>{ row.remove(); updateTotalCost(); });

    mpList.appendChild(row);
    return row;
  }

  function updateTotalCost(){
    let total = 0;
    const rows = mpList.querySelectorAll('.mp-row');
    rows.forEach(r=>{
      const qty = Number(r.querySelector('.mp-qty').value) || 0;
      const cost = Number(r.querySelector('.mp-cost').value) || 0;
      total += qty * cost;
    });
    const totalField = document.getElementById('pf-custo-total');
    if(totalField) totalField.value = total || '';
  }

  if(document.getElementById('add-mp-row')){
    document.getElementById('add-mp-row').addEventListener('click', ()=> addMpRow());
  }

  if(form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const pfId = document.getElementById('pf-id').value;
      const materiasRows = Array.from(mpList.querySelectorAll('.mp-row'));
      const materiasPrimas = materiasRows.map(r=>{
        const sel = r.querySelector('.mp-select');
        const idx = sel.value;
        const mp = load(LS_KEYS.MATERIAS)[Number(idx)];
        return {
          mp_index: idx === '' ? null : Number(idx),
          mp_nome: mp ? `${mp.codigo} — ${mp.nome}` : sel.options[sel.selectedIndex]?.text || '',
          qtd_por_unidade: Number(r.querySelector('.mp-qty').value) || 0,
          unidade: r.querySelector('.mp-unit').value || (mp? mp.unidade: ''),
          custo_per_unit: Number(r.querySelector('.mp-cost').value) || 0
        };
      });

      const obj = {
        codigo: document.getElementById('pf-codigo').value,
        nome: document.getElementById('pf-nome').value,
        estoque_inicial: Number(document.getElementById('pf-estoque-inicial').value)||0,
        produzido: Number(0),
        vendido: Number(0),
        estoque_minimo: Number(document.getElementById('pf-estoque-minimo').value)||0,
        unidade: document.getElementById('pf-unidade').value,
        materiasPrimas,
        custo_total: Number(document.getElementById('pf-custo-total').value) || 0,
        ultima_producao: ''
      };
      const arr = load(key);
      if(pfId!=='' && typeof arr[Number(pfId)] !== 'undefined'){ arr[Number(pfId)] = obj; pushActivity(`Produto editado: ${obj.codigo} - ${obj.nome}`); }
      else { arr.push(obj); pushActivity(`Produto criado: ${obj.codigo} - ${obj.nome}`); }
      save(key, arr); render(); resetForm();
    });
  }

  if(tabelaBody){
    tabelaBody.addEventListener('click', (e)=>{
      if(e.target.matches('.produzir')){
        const i = Number(e.target.dataset.i); const arr = load(key); const p = arr[i];
        const q = Number(prompt('Quantidade a produzir (número de unidades):', '1'))||0;
        if(q<=0) return;
        const materias = load(LS_KEYS.MATERIAS);
        // verificar disponibilidade e calcular total por MP
        const shortages = [];
        (p.materiasPrimas||[]).forEach(mrp=>{
          if(mrp.mp_index===null) return;
          const mp = materias[mrp.mp_index];
          if(!mp) return;
          const needed = Number(mrp.qtd_por_unidade||0) * q;
          const atual = Number(mp.estoque_inicial||0) + Number(mp.entradas||0) - Number(mp.saidas||0) - Number(mp.usado||0);
          if(needed > atual) shortages.push({mp, needed, atual});
        });
        if(shortages.length){
          const names = shortages.map(s=>`${s.mp.nome} (precisa ${s.needed}, tem ${s.atual})`).join('\n');
          if(!confirm('Há falta de matéria‑prima:\n' + names + '\nDeseja continuar e permitir estoque negativo?')) return;
        }
        // aplicar desconto em cada MP
        (p.materiasPrimas||[]).forEach(mrp=>{
          if(mrp.mp_index===null) return;
          const mp = materias[mrp.mp_index];
          if(!mp) return;
          const needed = Number(mrp.qtd_por_unidade||0) * q;
          mp.usado = (Number(mp.usado||0) + needed);
          mp.ultima_atualizacao = nowDate();
        });
        save(LS_KEYS.MATERIAS, materias);
        p.produzido = Number(p.produzido||0) + q;
        p.ultima_producao = nowDate();
        save(key, arr);
        pushActivity(`Produzido ${q} x ${p.nome} (consumiu insumos)`);
        render();
        if(typeof populateMpSelect === 'function') populateMpSelect();
      }
      if(e.target.matches('.edit')){
        const i = Number(e.target.dataset.i); const arr = load(key); const p = arr[i];
        document.getElementById('pf-id').value = i;
        document.getElementById('pf-codigo').value = p.codigo;
        document.getElementById('pf-nome').value = p.nome;
        document.getElementById('pf-estoque-inicial').value = p.estoque_inicial;
        document.getElementById('pf-unidade').value = p.unidade;
        // popular mp rows
        mpList.innerHTML = '';
        (p.materiasPrimas||[]).forEach(m=> addMpRow({
          mp_index: m.mp_index,
          qtd_por_unidade: m.qtd_por_unidade,
          unidade: m.unidade,
          custo_per_unit: m.custo_per_unit
        }));
        updateTotalCost();
      }
      if(e.target.matches('.delete')){
        if(!confirm('Excluir este produto?')) return;
        const i = Number(e.target.dataset.i); const arr = load(key); const removed = arr.splice(i,1)[0]; save(key,arr); pushActivity(`Produto excluído: ${removed.codigo}`); render();
      }
    });
  }

  const exportBtn = document.getElementById('export-pf');
  if(exportBtn){
    exportBtn.addEventListener('click', ()=>{
      const table = document.getElementById('tabela-produtos');
      if(table) exportTableToExcel(table, 'produtos_finais');
    });
  }

  window.addEventListener('DOMContentLoaded', ()=>{ if(typeof populateMpSelect === 'function') populateMpSelect(); });
  render();
})();