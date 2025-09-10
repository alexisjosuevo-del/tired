
function fmt(n){ return '$ ' + (Number(n)||0).toLocaleString('es-MX',{minimumFractionDigits:2, maximumFractionDigits:2}); }); }
function toNum(n){ const x=Number(n); return isFinite(x)?x:0; }
function precioBase(m){ return Number(m['PMP DEMSA']||m['COSTO DEMSA']||0); }

async function loadData(){
  // 1) intentar leer del <script id="__data">
  try{
    const raw = document.getElementById('__data')?.textContent;
    if(raw){ return JSON.parse(raw); }
  }catch(e){}
  // 2) fallback a data.json (para GitHub Pages)
  try{
    const res = await fetch('data.json'); return await res.json();
  }catch(e){
    alert('No se pudo cargar la base de datos.');
    return { medicamentos:[], servicios:[], header:{} };
  }
}

let DATA={medicamentos:[], servicios:[], header:{} };
let ORDEN='AZ'; // AZ por defecto
let MEDS=[]; // catálogo
let MEDLIST=[]; // opciones para datalist

function renderHeader(){
  const dir = (DATA?.header?.direccion||'');
  const el1 = document.getElementById('dirText');
  const el2 = document.getElementById('empresaDireccion');
  if(el1){ el1.textContent = dir; }
  if(el2){ if(!el2.value) el2.value = dir; }
}


function repoblarSelect(){
  const sel = document.getElementById('medSel');
  let base = [...MEDS];
  if(ORDEN==='AZ'){
    base.sort((a,b)=> (a.descripcion||'').localeCompare(b.descripcion||'','es',{sensitivity:'base'}));
  }else{
    base.sort((a,b)=> (precioBase(b) - precioBase(a)));
  }
  sel.innerHTML='';
const dl=document.getElementById('medList');
dl.innerHTML='';
for(const m of base){
  const opt=document.createElement('option');
  opt.value=m.codigo+" — "+(m.descripcion||'');
  dl.appendChild(opt);
  const o=document.createElement('option');
  o.value=m.codigo; o.textContent=m.codigo+" — "+(m.descripcion||''); o.dataset.precio=precioBase(m);
  sel.appendChild(o);
}
if(sel.options.length){
    document.getElementById('medPrecio').value = sel.options[0].dataset.precio || 0;
  }
}

function addMedRow(item, cant, precio){
  const tr=document.createElement('tr');
  tr.innerHTML = `<td>${item.codigo} — ${item.descripcion||''}</td>
                  <td class="center"><input type="number" class="q" min="1" step="1" value="${cant}"></td>
                  <td class="right"><input type="number" step="0.01" value="${Number(precio)||0}"></td>
                  <td class="money sub">0.00</td>
                  <td class="center"><button class="outline del">✕</button></td>`;
  tr.querySelector('.del').onclick=()=>{ tr.remove(); calcular(); };
  document.querySelector('#tablaMedicamentos tbody').appendChild(tr);
}

function addSrvRow(nombre,cant,precio){
  const tr=document.createElement('tr');
  tr.innerHTML = `<td>${nombre}</td>
                  <td class="center"><input type="number" class="q" min="1" step="1" value="${cant}"></td>
                  <td class="right"><input type="number" step="0.01" value="${Number(precio)||0}"></td>
                  <td class="money sub">0.00</td>
                  <td class="center"><button class="outline del">✕</button></td>`;
  tr.querySelector('.del').onclick=()=>{ tr.remove(); calcular(); };
  document.querySelector('#tablaServicios tbody').appendChild(tr);
}

function calcular(){
  let sm=0, ss=0;
  document.querySelectorAll('#tablaMedicamentos tbody tr').forEach(tr=>{
    const q=toNum(tr.querySelector('input.q').value);
    const p=toNum(tr.querySelectorAll('input')[1].value);
    const s=q*p; sm+=s; tr.querySelector('.sub').textContent = fmt(s);
  });
  document.querySelectorAll('#tablaServicios tbody tr').forEach(tr=>{
    const q=toNum(tr.querySelector('input.q').value);
    const p=toNum(tr.querySelectorAll('input')[1].value);
    const s=q*p; ss+=s; tr.querySelector('.sub').textContent = fmt(s);
  });
  const iva = ss*0.16;
  document.getElementById('subtotalMedicamentos').textContent = fmt(sm);
  document.getElementById('subtotalServicios').textContent = fmt(ss);
  document.getElementById('iva').textContent = fmt(iva);
  document.getElementById('total').textContent = fmt(sm+ss+iva);
}

function exportar(){
  const meds=Array.from(document.querySelectorAll('#tablaMedicamentos tbody tr')).map(tr=>{
    const [codDesc,qEl,pEl]=[tr.children[0].textContent,tr.querySelector('input.q'),tr.querySelectorAll('input')[1]];
    const [codigo,...rest]=codDesc.split(' — ');
    const descripcion=rest.join(' — ');
    return { codigo, descripcion, cantidad: toNum(qEl.value), precio: toNum(pEl.value) };
  });
  const servs=Array.from(document.querySelectorAll('#tablaServicios tbody tr')).map(tr=>({
    servicio: tr.children[0].textContent,
    cantidad: toNum(tr.querySelector('input.q').value),
    precio: toNum(tr.querySelectorAll('input')[1].value)
  }));
  const payload={
  fecha: document.getElementById('fecha').value,
  vigencia: document.getElementById('vigencia').value,
  realizado_por: document.getElementById('realizadoPor').value,
  paciente: document.getElementById('paciente').value,
  medico: document.getElementById('medico').value,
  aseguradora: document.getElementById('aseguradora').value,
  comentarios: (document.getElementById('comentarios')?.value||''),
  esquema: (document.getElementById('esquema')?.value||''),
  kam: (document.getElementById('kam')?.value||document.getElementById('kam2')?.value||''),
  fecha_programacion: (document.getElementById('fechaProg')?.value||''),
  medicamentos: meds,
  servicios: servs
};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='cotizacion.json'; a.click();
}

function exportarPDF(){ window.print(); }

document.addEventListener('input', e=>{
  if(e.target.closest('#tablaMedicamentos') || e.target.closest('#tablaServicios')) calcular();
  });

document.addEventListener('DOMContentLoaded', async ()=>{ const today=new Date().toISOString().slice(0,10); const f=document.getElementById('fecha'); if(f&&!f.value) f.value=today; 
  DATA = await loadData();
  MEDS = DATA.medicamentos || [];
  renderHeader();

  // Servicios
  const selS=document.getElementById('servicioSel');
  (DATA.servicios||[]).forEach(s=>{
    const opt=document.createElement('option'); opt.value=s.nombre; opt.textContent=s.nombre; opt.dataset.precio=s.precio;
    selS.appendChild(opt);
  });
  selS.onchange=()=>{ document.getElementById('servicioPrecio').value=selS.selectedOptions[0].dataset.precio||0; };
  selS.dispatchEvent(new Event('change'));

  // Medicamentos (select + filtros)
  repoblarSelect();

  const combo=document.getElementById('medCombo');
  combo.addEventListener('change',()=>{
    const val=combo.value;
    const m = val.match(/^(\d{6,14})/);
    let code=null;
    if(m){ code=m[1]; }
    if(!code){
      const t=val.toLowerCase();
      const item=MEDS.find(x=>(x.descripcion||'').toLowerCase().includes(t));
      if(item) code=String(item.codigo);
    }
    if(code){
      const sel=document.getElementById('medSel');
      const opt=[...sel.options].find(o=>String(o.value)===String(code));
      if(opt){ sel.value=code; document.getElementById('medPrecio').value=opt.dataset.precio||0; }
    }
  });
  document.getElementById('ordenAZ').onclick = ()=>{ ORDEN='AZ'; repoblarSelect(); };
  document.getElementById('ordenPrecio').onclick = ()=>{ ORDEN='PRECIO'; repoblarSelect(); };
  document.getElementById('medSel').onchange = (e)=>{
    const opt = e.target.selectedOptions[0];
    if(opt) document.getElementById('medPrecio').value = opt.dataset.precio || 0;
  };
  document.getElementById('agregarMed').onclick = ()=>{
    const sel = document.getElementById('medSel');
    const code = sel.value;
    const item = MEDS.find(x=>String(x.codigo)===String(code));
    if(item){
      const cant = toNum(document.getElementById('medCant').value||1);
      const precio = toNum(document.getElementById('medPrecio').value||0);
      addMedRow(item, cant, precio); calcular();
    }
  };

  // Export
  document.getElementById('exportar').onclick = exportar;
  document.getElementById('exportarPDF').onclick = exportarPDF;

  calcular();
});