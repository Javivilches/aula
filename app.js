(() => {
  'use strict';
  const app = document.querySelector('#app');
  const LETTERS = ['A', 'B', 'C', 'D'];
  const TOPICS = [
    {name:'Análisis de la empresa como comunidad de personas', short:'Ética, empresa y grupos de interés'},
    {name:'Aplicación de los principios de responsabilidad social corporativa (RSC)', short:'Responsabilidad social y buenas prácticas'},
    {name:'Coordinación de los flujos de información del departamento de recursos humanos a través de la organización', short:'Comunicación y gestión de RR. HH.'},
    {name:'Aplicación de los procedimientos administrativos relativos a la selección de recursos humanos', short:'Reclutamiento y selección de personal'},
    {name:'Gestión de los procedimientos administrativos relativos a la formación y promoción de personal', short:'Formación, desempeño y promoción'}
  ];
  const SUBJECTS = [
    {id:'rrhh',name:'Recursos Humanos y Responsabilidad Social Corporativa',short:'Recursos Humanos y RSC',topics:TOPICS},
    ...Array.from({length:5},(_,i)=>({id:`asignatura-${i+1}`,name:`Asignatura ${i+1}`,short:`Asignatura ${i+1}`,topics:[]}))
  ];
  const TESTS = Object.fromEntries(TOPICS.flatMap((_,idx) => {
    const t = idx + 1;
    return ['normal','dificil'].map(level => [`rrhh-${t}-${level}`, `datos/recursos-humanos/tema${t}-${level}.json`]);
  }));
  for(let n=1;n<=5;n++)TESTS[`rrhh-final${n}`]=`datos/recursos-humanos/final${n}.json`;
  const SUMMARY_PATH = 'resumenes/recursos-humanos/';
  const LS_PREFIX = 'mi-aula:v3:';
  const ic = (name,extra='') => `<svg class="icon ${extra}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const html = str => String(str ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const shuffle = a => {const b = [...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
  const safeGet = key => {try{return JSON.parse(localStorage.getItem(key) || 'null');}catch{return null;}};
  const safeSet = (key,data) => {try{localStorage.setItem(key, JSON.stringify(data));}catch{}};
  const hashValue = text => {let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};
  const keyFor = id => `${LS_PREFIX}${id}`;
  let openedTopic = 0;
  let quiz = null;
  let quizKey = null;
  let quizState = null;
  let loadToken = 0;
  let questionPos = 0;
  let onlyErrors = false;
  let route = 'home';

  function navigate(target){const dest=`#/${target}`; if(location.hash===dest){readRoute();}else{location.hash=dest;}}
  function scrollTop(){window.scrollTo({top:0,behavior:'instant'});}
  function layoutBreadcrumb(label='Volver a la asignatura'){
    return `<button type="button" class="breadcrumb" data-action="subject">${ic('arrow-left')} ${html(label)}</button>`;
  }
  function progressFor(id){const s=safeGet(keyFor(id));return s && typeof s==='object'?s:null;}
  function allStats(){let completed=0;for(const id of Object.keys(TESTS))if(progressFor(id)?.done)completed++;return {completed,total:15};}

  function homeView(){
    const {completed,total}=allStats();
    app.innerHTML=`<section class="hero fade-in">
      <div><span class="eyebrow on-dark">${ic('sparkle')} Tu espacio personal de estudio</span>
        <h1 class="page-title">Un paso más cerca<br>de tu <span style="color:var(--gold)">objetivo.</span></h1>
        <p class="page-subtitle">Todo lo que necesitas para preparar tus exámenes, bien organizado y a tu ritmo. Estudia los resúmenes y demuestra lo que sabes con cada test.</p>
        <div class="hero-bottom"><span class="hero-chip">${ic('book')} 5 temas disponibles</span><span class="hero-chip">${ic('target')} ${total} test para practicar</span></div>
      </div>
      <div class="hero-art" aria-hidden="true"><div class="hero-art-card">${ic('book')}</div></div>
    </section>
    <div class="section-head"><div><span class="eyebrow">Biblioteca de asignaturas</span><h2>¿Qué vamos a estudiar hoy?</h2></div><span class="section-note">${completed} de ${total} test completados</span></div>
    <section class="subjects-grid" aria-label="Asignaturas">${SUBJECTS.map((s,i)=>`<button type="button" class="subject-card ${i?'disabled':''}" ${i?'disabled aria-label="'+html(s.name)+', próximamente"':`data-action="subject"`}>
      <span class="subject-top"><span class="subject-icon">${ic(i?'lock':'book')}</span><span class="subject-index">${String(i+1).padStart(2,'0')} / 06</span></span>
      <span class="subject-title">${html(s.short)}</span><span class="subject-desc">${i?'Próximamente': '5 temas · 10 resúmenes · 15 test'}</span>
      <span class="subject-bottom"><span>${i?'En preparación':'Explorar asignatura'}</span>${ic(i?'lock':'arrow-right')}</span></button>`).join('')}</section>`;
  }

  function resourcePDF(n,level){
    const basic = level === 'basico';
    const fname=`tema${n}-${level}.pdf`;
    const path=SUMMARY_PATH+fname;
    return `<article class="resource-card"><div class="resource-main"><span class="resource-icon ${basic?'':'alt'}">${ic(basic?'file':'book')}</span><span><strong>Resumen ${basic?'básico':'ampliado'}</strong><small>${basic?'Conceptos y esquema general':'Preparación detallada del examen'} · PDF</small></span></div>
      <div class="resource-actions"><a class="button button-outline" href="${path}" target="_blank" rel="noopener noreferrer" aria-label="Abrir resumen ${basic?'básico':'ampliado'} del tema ${n}">${ic('external')} Ver PDF</a>
      <a class="button button-icon" href="${path}" download="${fname}" aria-label="Descargar resumen ${basic?'básico':'ampliado'} del tema ${n}" title="Descargar PDF">${ic('download')}</a></div></article>`;
  }
  function resourceTest(n,level){
    const id=`rrhh-${n}-${level}`;const old=progressFor(id);
    const status=old?.done?'Corregido':(old?.answers&&Object.keys(old.answers).length?'En curso':'');
    const txt=old?.done?'Revisar test':(status==='En curso'?'Continuar test':'Empezar test');
    return `<article class="resource-card test-resource"><div class="resource-main"><span class="resource-icon ${level==='dificil'?'hard':''}">${ic(level==='normal'?'target':'award')}</span><span><strong>Test ${level==='normal'?'normal':'difícil'}</strong><small>20 preguntas · Corrección explicada</small></span>${status?`<span class="status-soft">${status}</span>`:''}</div>
      <div class="resource-actions"><button type="button" class="button button-primary" data-action="test" data-key="${id}">${ic(old?.done?'circle-check':'play')} ${txt}</button></div></article>`;
  }
  function subjectView(){
    const stats=allStats();
    app.innerHTML=`<div class="fade-in"><button type="button" class="breadcrumb" data-action="home">${ic('arrow-left')} Todas las asignaturas</button>
    <section class="subject-hero"><div><span class="eyebrow on-dark course-kicker">${ic('book')} ASIGNATURA 01</span><h1 class="page-title">Recursos Humanos y<br>Responsabilidad Social Corporativa</h1>
      <p class="page-subtitle">Tus resúmenes y test, organizados por temas. Empieza por comprender, practica y después comprueba tus conocimientos.</p></div>
      <div class="subject-side-icon" aria-hidden="true">${ic('book')}</div></section>
      <div class="quick-stats"><div class="stat-mini">${ic('book')}<span><strong>5</strong> <small>temas</small></span></div>
        <div class="stat-mini">${ic('file')}<span><strong>10</strong> <small>resúmenes</small></span></div>
        <div class="stat-mini">${ic('target')}<span><strong>${stats.completed}/15</strong> <small>test completados</small></span></div></div>
      <div class="section-head"><div><span class="eyebrow">Tu temario</span><h2>Elige un tema para empezar</h2></div><span class="section-note">Pulsa para desplegar los materiales</span></div>
      <div class="topic-list">${TOPICS.map((t,i)=>{const n=i+1;const open=openedTopic===i;return `<section class="topic ${open?'is-open':''}" id="tema-${n}">
        <button type="button" class="topic-toggle" data-action="toggle" data-topic="${i}" aria-expanded="${open}" aria-controls="topic-body-${n}">
          <span class="topic-index">${String(n).padStart(2,'0')}</span><span class="topic-info"><strong>Tema ${n}</strong><span>${html(t.name)}</span></span>
          <span class="topic-state"><small>2 resúmenes · 2 test</small><span class="topic-chevron">${ic('chevron-down')}</span></span></button>
        ${open?`<div class="topic-content" id="topic-body-${n}"><div class="resource-grid">${resourcePDF(n,'basico')}${resourcePDF(n,'ampliado')}${resourceTest(n,'normal')}${resourceTest(n,'dificil')}</div></div>`:''}</section>`}).join('')}</div>
      <section class="finals"><div class="final-head"><span class="eyebrow on-dark">${ic('award')} El gran repaso</span><span class="badge-later available">5 simulacros disponibles</span></div>
      <h2>Test finales</h2><p>150 preguntas nuevas, con los 5 temas mezclados. Seis preguntas de cada tema por simulacro y dificultad progresiva. Ideal para preparar el examen real.</p>
      <div class="final-grid">${['Normal','Normal-alto','Difícil','Muy difícil','Desafío final'].map((label,i)=>{const id=`rrhh-final${i+1}`;const prev=progressFor(id);const status=prev?.done?'Terminado':(prev?.answers&&Object.keys(prev.answers).length?'En curso':'');return `<button type="button" class="final-card final-launch" data-action="test" data-key="${id}" aria-label="Abrir simulacro final ${i+1}: ${label}"><span class="final-count">SIMULACRO ${String(i+1).padStart(2,'0')}</span><strong>${label}</strong><small>30 preguntas · 5 temas</small><span class="final-enter">${status || 'Comenzar'} ${ic('arrow-right')}</span></button>`;}).join('')}</div></section></div>`;
  }

  function validData(data){return data && Array.isArray(data.preguntas)&&data.preguntas.length>0 && data.preguntas.every(q=>q.id&&q.pregunta&&q.opciones&&LETTERS.every(x=>typeof q.opciones[x]==='string')&&LETTERS.includes(q.correcta));}
  function contentSignature(data){return hashValue(data.preguntas.map(q=>`${q.id}/${q.pregunta}/${q.correcta}/${LETTERS.map(l=>q.opciones[l]).join('/')}`).join('|'));}
  function validSaved(saved,data,sig){
    const n=data.preguntas.length;
    return !!(saved&&saved.signature===sig&&Array.isArray(saved.order)&&saved.order.length===n&&new Set(saved.order).size===n&&saved.order.every(x=>Number.isInteger(x)&&x>=0&&x<n)&&Array.isArray(saved.options)&&saved.options.length===n&&saved.options.every(opt=>Array.isArray(opt)&&opt.length===4&&new Set(opt).size===4&&opt.every(l=>LETTERS.includes(l)))&&saved.answers&&typeof saved.answers==='object');
  }
  function createQuizState(data,sig){return {signature:sig,order:shuffle(data.preguntas.map((_,i)=>i)),options:data.preguntas.map(()=>shuffle(LETTERS)),answers:{},done:false,best:null,lastPos:0};}
  function saveQuiz(){if(quizKey&&quizState)safeSet(keyFor(quizKey),quizState);}
  async function openTest(id){
    const path=TESTS[id];if(!path){return showError('Este test no está disponible','Todavía no hemos añadido las preguntas de este examen.');}
    const token=++loadToken;quizKey=id;quiz=null;quizState=null;onlyErrors=false;
    app.innerHTML=`<div class="loading-box"><div class="loading-spinner" aria-hidden="true"></div><p>Cargando preguntas...</p></div>`;
    try{
      if(location.protocol==='file:')throw new Error('LOCAL_FILE');
      const response=await fetch(path,{cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      if(!validData(data))throw new Error('El archivo JSON no tiene la estructura de preguntas esperada.');
      if(token!==loadToken||location.hash!==`#/test/${id}`)return;
      quiz=data;
      const sig=contentSignature(data);
      const old=safeGet(keyFor(id));
      quizState=validSaved(old,data,sig)?old:createQuizState(data,sig);
      questionPos=Math.min(Math.max(0,Number(quizState.lastPos)||0),data.preguntas.length-1);
      saveQuiz();quizView();scrollTop();
    }catch(err){
      if(token!==loadToken)return;
      const locError=err.message==='LOCAL_FILE';
      showError('No se puede cargar el test',locError
        ? 'Has abierto index.html directamente desde tu ordenador. Los navegadores bloquean la lectura de archivos JSON locales. Publica la carpeta en GitHub Pages o utiliza el archivo INICIAR_AULA.bat incluido en el paquete completo.'
        : `No se ha podido abrir ${path}. Revisa que el archivo esté en esa carpeta y que tu web esté publicada mediante un servidor. ${err.message}`);
    }
  }
  function showError(title,desc){
    app.innerHTML=`<section class="error-panel fade-in"><div class="modal-icon">${ic('close')}</div><h2 style="margin-top:15px">${html(title)}</h2><p>${html(desc)}</p><button type="button" data-action="subject" class="button button-primary">${ic('arrow-left')} Volver a los temas</button></section>`;
  }
  const questionByIdx = original => quiz.preguntas[original];
  function filteredOrder(){
    if(!onlyErrors || !quizState.done)return quizState.order;
    return quizState.order.filter(original=>{
      const q=questionByIdx(original);
      return quizState.answers[q.id]!==q.correcta;
    });
  }
  function questionData(){const filtered=filteredOrder();return {idx:filtered[questionPos],filtered,q:questionByIdx(filtered[questionPos])};}
  function countAnswers(){return quiz.preguntas.filter(q=>LETTERS.includes(quizState.answers[q.id])).length;}
  function correctCount(){return quiz.preguntas.filter(q=>quizState.answers[q.id]===q.correcta).length;}
  function paletteButton(original,pos,active){
    const q=questionByIdx(original),chosen=quizState.answers[q.id];
    let style=quizState.done?(chosen===q.correcta?'right':'wrong'):(chosen?'answered':'');
    if(active)style+=' current';
    // The label reflects the original randomized presentation order.
    const realNumber=quizState.order.indexOf(original)+1;
    return `<button type="button" class="palette-button ${style}" data-action="jump" data-index="${pos}" aria-label="Ir a la pregunta ${realNumber}${chosen?', contestada':''}" ${active?'aria-current="step"':''}>${realNumber}</button>`;
  }
  function quizView(opts={}){
    if(!quiz||!quizState)return;
    const {filtered,idx,q}=questionData();
    const total=quiz.preguntas.length, answered=countAnswers(),right=correctCount(),wrong=answered-right,unanswered=total-answered;
    const displayPos=quizState.order.indexOf(idx)+1;
    const optionOrder=quizState.options[idx];
    const chosen=quizState.answers[q?.id];
    const done=quizState.done;
    const isFinal=/^rrhh-final[1-5]$/.test(quizKey);
    const subtitle=isFinal?quiz.test:(quizKey.endsWith('dificil')?'Test difícil':'Test normal');
    const topicN=Number(q?.tema)||Number(quizKey.split('-')[1])||1;
    const badge=isFinal?`Simulacro final <span aria-hidden="true">·</span> Los 5 temas`:`Tema ${topicN} <span aria-hidden="true">·</span> ${subtitle}`;
    const sigScore=(right/total*10).toFixed(1).replace('.',',');
    let card='';
    if(!q){card=`<div class="question-card"><h2>¡Todo correcto!</h2><p class="muted">No tienes preguntas falladas ni sin responder.</p><button class="button button-primary" data-action="review-all">Ver todas las preguntas</button></div>`;}
    else{
      const options=optionOrder.map((origLetter,i)=>{
        const label=LETTERS[i],selected=chosen===origLetter,correct=done&&q.correcta===origLetter,bad=done&&selected&&!correct;
        return `<button type="button" class="answer ${selected?'selected':''} ${correct?'correct':''} ${bad?'incorrect':''}" data-action="choose" data-letter="${origLetter}" ${done?'disabled':''} aria-pressed="${selected?'true':'false'}">
          <span class="answer-letter">${label}</span><span class="answer-text">${html(q.opciones[origLetter])}</span>${done&&correct?ic('check','answer-status'):done&&bad?ic('close','answer-status wrong'):''}</button>`;
      }).join('');
      const displayCorrect=LETTERS[optionOrder.indexOf(q.correcta)];
      card=`<section class="question-card fade-in" id="question-card" aria-label="Pregunta ${displayPos}">
        <div class="question-meta"><span class="question-label">Pregunta ${displayPos} de ${total}</span><span>${isFinal&&!done?'Simulacro de examen':`${isFinal?'Tema '+html(q.tema)+' · ':''}Apartado ${html(q.apartado||'')}${q.pagina_manual?' · Pág. '+html(q.pagina_manual):''}`}</span></div>
        <h2 class="question-text" id="current-question">${html(q.pregunta)}</h2>
        <div class="answers-list" role="group" aria-label="Elige una respuesta">${options}</div>
        ${done?`<div class="question-explanation"><div class="explanation-title ${chosen!==q.correcta?'wrong':''}">${ic(chosen===q.correcta?'circle-check':'close')}${chosen===q.correcta?'Respuesta correcta':chosen?'Respuesta incorrecta':'Pregunta sin responder'}</div>
          <p><strong>Solución ${displayCorrect}:</strong> ${html(q.opciones[q.correcta])}</p><p>${html(q.explicacion||'')}</p></div>`:`<p class="question-bottom-tip">${ic('shield')} Tu respuesta se guarda automáticamente en este dispositivo.</p>`}
      </section>`;
    }
    const result=done?`<section class="result-card fade-in" aria-label="Resultado del test"><div class="result-upper"><div><span class="result-heading">${right/total>=.80?'Excelente trabajo':right/total>=.50?'Examen completado':'Sigue practicando'}</span>
      <div class="result-score">${sigScore} <small>/ 10</small></div><div class="result-meta">${right} respuestas correctas de ${total}</div></div>
      <div class="score-orbit" style="--pct:${Math.round(right/total*100)}%"><span>${Math.round(right/total*100)}%</span></div></div>
      <div class="result-stats"><div class="result-stat good"><strong>${right}</strong><small>Aciertos</small></div><div class="result-stat bad"><strong>${wrong}</strong><small>Fallos</small></div><div class="result-stat"><strong>${unanswered}</strong><small>Sin responder</small></div></div></section>`:'';
    const review=done?`<div class="review-bar"><button class="review-pill ${!onlyErrors?'active':''}" data-action="review-all" type="button">Todas (${total})</button>
      <button class="review-pill ${onlyErrors?'active':''}" data-action="review-errors" type="button">Revisar fallos (${wrong+unanswered})</button><button class="review-pill" type="button" data-action="reset">${ic('rotate')} Repetir test</button></div>`:'';
    const palette=filtered.map((original,pos)=>paletteButton(original,pos,pos===questionPos)).join('');
    const hasItems=filtered.length>0;
    const navButtons=`<button type="button" class="button button-ghost" data-action="prev" ${!hasItems||questionPos===0?'disabled':''}>${ic('arrow-left')} Anterior</button>
      <button type="button" class="button button-primary" data-action="next" ${!hasItems||questionPos===filtered.length-1?'disabled':''}>Siguiente ${ic('arrow-right')}</button>`;
    app.innerHTML=`<div class="quiz-page fade-in"><section class="quiz-header">${layoutBreadcrumb()}
      <div class="eyebrow">${ic('target')} ${badge}</div><h1 class="page-title">${html(subtitle)}${isFinal?'':` <span style="color:#acb0c5">/</span> Tema ${topicN}`}</h1>
      <p class="page-subtitle">${isFinal?'Preguntas de todos los temas intercaladas · Simulacro completo':html(TOPICS[topicN-1]?.short||quiz.tema||'Preparación de exámenes')} · ${total} preguntas · Una única respuesta correcta</p>
      <div class="quiz-summary-strip"><div class="quiz-counter"><strong>${answered}</strong> de ${total} respondidas</div><div class="progress-track" role="progressbar" aria-label="Preguntas respondidas" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${answered}"><span style="width:${Math.round(answered/total*100)}%"></span></div><span class="quiz-counter">${Math.round(answered/total*100)}%</span></div>
    </section>
    ${result}${review}
    <div class="mobile-palette-wrap"><div class="mobile-palette" aria-label="Navegar entre preguntas">${palette}</div></div>
    <div class="quiz-grid"><div class="quiz-main">${card}
      <div class="quiz-bottom-actions">${navButtons}${done?`<button class="button button-outline" data-action="subject">Volver a temas</button>`:`<button class="button button-outline" data-action="finish">Corregir test</button>`}</div>
    </div><aside class="quiz-side-card"><h3 class="side-title">Tu examen</h3><p class="side-note">${done?'Selecciona una pregunta para revisar':'Selecciona una pregunta para ir directamente a ella'}</p>
      <div class="palette" aria-label="Navegar entre preguntas">${palette}</div><div class="side-legend"><span><i class="legend-dot"></i> Pendiente</span><span><i class="legend-dot answered"></i> Respondida</span></div>
      ${done?`<button type="button" class="button button-outline side-submit" data-action="reset">${ic('rotate')} Hacer de nuevo</button>`:`<button type="button" class="button button-primary side-submit" data-action="finish">${ic('circle-check')} Corregir examen</button>`}
    </aside></div>
    <nav class="exam-sticky" aria-label="Controles del test"><button class="button" data-action="prev" ${!hasItems||questionPos===0?'disabled':''}>${ic('arrow-left')} Anterior</button>
      <button class="button button-finish" data-action="${done?'subject':'finish'}">${done?'Temas':'Corregir'}</button>
      <button class="button button-primary" data-action="next" ${!hasItems||questionPos===filtered.length-1?'disabled':''}>Siguiente ${ic('arrow-right')}</button></nav>
    ${!done?'<p class="tiny-hint">Puedes terminar el test aunque queden respuestas pendientes. La corrección solo se muestra cuando lo entregues.</p>':'<p class="tiny-hint">El progreso se conserva en este navegador. Para repetir el test se cambia el orden de las preguntas y las opciones.</p>'}</div>`;
    if(opts.focusChoice){const choice=app.querySelector(`[data-action="choose"][data-letter="${opts.focusChoice}"]`);if(choice)choice.focus({preventScroll:true});}
    if(opts.scrollToQuestion){requestAnimationFrame(()=>document.getElementById('question-card')?.scrollIntoView({block:'start',behavior:'smooth'}));}
    requestAnimationFrame(()=>{const selected=app.querySelector('.mobile-palette .palette-button.current');if(selected){const scroller=selected.parentElement;scroller.scrollTo({left:selected.offsetLeft-scroller.offsetLeft-scroller.clientWidth/2+selected.clientWidth/2,behavior:'smooth'});}});
  }
  function updatePos(pos){
    const items=filteredOrder();if(pos<0||pos>=items.length)return;
    questionPos=pos;quizState.lastPos=quizState.order.indexOf(items[pos]);saveQuiz();quizView({scrollToQuestion:true});
  }
  function chooseAnswer(letter){
    if(quizState?.done||!LETTERS.includes(letter))return;
    const q=questionData().q;if(!q)return;
    quizState.answers[q.id]=letter;saveQuiz();quizView({focusChoice:letter});
  }
  function finishQuiz(){
    if(quizState.done)return;
    const count=countAnswers();
    const dialog=document.getElementById('confirm-dialog');
    document.getElementById('confirm-text').textContent=`Has respondido ${count} de ${quiz.preguntas.length} preguntas. ${count<quiz.preguntas.length?'Las preguntas sin responder contarán como incorrectas. ':''}Después podrás ver las soluciones y explicaciones.`;
    if(dialog?.showModal){dialog.showModal();}else if(confirm('¿Corregir el examen ahora?'))submitQuiz();
  }
  function submitQuiz(){const dialog=document.getElementById('confirm-dialog');if(dialog.open)dialog.close();quizState.done=true;const mark=correctCount();const previous=Number.isInteger(quizState.best)?quizState.best:null;quizState.best=previous===null?mark:Math.max(previous,mark);saveQuiz();quizView();scrollTop();}
  function resetQuiz(){if(!confirm('¿Repetir el examen? Se borrarán las respuestas de este intento, pero conservarás tu mejor nota.'))return;const best=quizState.best;quizState=createQuizState(quiz,contentSignature(quiz));quizState.best=best;questionPos=0;onlyErrors=false;saveQuiz();quizView();scrollTop();}
  function changeReview(only){onlyErrors=only;questionPos=0;quizView();scrollTop();}
  function readRoute(){
    loadToken++;
    const path=decodeURIComponent(location.hash.replace(/^#\/?/,'')).replace(/^\/+/, '');
    const match=path.match(/^test\/(rrhh-(?:[1-5]-(?:normal|dificil)|final[1-5]))$/);
    if(match){route='test';openTest(match[1]);return;}
    quiz=null;quizState=null;
    if(path==='asignatura/rrhh'){route='subject';subjectView();scrollTop();return;}
    route='home';homeView();scrollTop();
  }
  app.addEventListener('click',e=>{
    const target=e.target.closest('[data-action]');if(!target)return;
    const action=target.dataset.action;
    if(action==='home'){navigate('');return;}
    if(action==='subject'){navigate('asignatura/rrhh');return;}
    if(action==='toggle'){const selected=Number(target.dataset.topic);openedTopic=openedTopic===selected?-1:selected;subjectView();return;}
    if(action==='test'){navigate(`test/${target.dataset.key}`);return;}
    if(route!=='test'||!quiz||!quizState)return;
    if(action==='choose'){chooseAnswer(target.dataset.letter);return;}
    if(action==='jump'){updatePos(Number(target.dataset.index));return;}
    if(action==='next'){updatePos(questionPos+1);return;}
    if(action==='prev'){updatePos(questionPos-1);return;}
    if(action==='finish'){finishQuiz();return;}
    if(action==='reset'){resetQuiz();return;}
    if(action==='review-errors'){changeReview(true);return;}
    if(action==='review-all'){changeReview(false);return;}
  });
  document.querySelector('.brand')?.addEventListener('click',()=>navigate(''));
  document.getElementById('cancel-submit')?.addEventListener('click',()=>document.getElementById('confirm-dialog').close());
  document.getElementById('confirm-submit')?.addEventListener('click',submitQuiz);
  document.addEventListener('keydown',e=>{
    if(route!=='test'||!quiz||!quizState||document.getElementById('confirm-dialog').open)return;
    if(['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)||e.altKey||e.ctrlKey||e.metaKey)return;
    if(!quizState.done&&['1','2','3','4'].includes(e.key)){
      const idx=questionData().idx;if(idx!==undefined){e.preventDefault();chooseAnswer(quizState.options[idx][Number(e.key)-1]);}
    }
  });
  window.addEventListener('hashchange',readRoute);
  if(!location.hash){location.replace('#/');}else{readRoute();}
})();
