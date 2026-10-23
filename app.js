(function(){
'use strict';
var R=window.RECIPES||[], F=window.FRONT||{dedication:[],intro:[]};
var app=document.getElementById('app');
var BY={}; R.forEach(function(r){BY[r.slug]=r;});
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function norm(s){return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
R.forEach(function(r){
  r._title=norm(r.title);
  r._ing=norm(r.ingredients.map(function(i){return i.t||i.sub||'';}).join(' \n '));
});
var state={q:'',region:'',course:'',main:'',diet:{},diff:{}};
var listScroll=0;
function count(key){var m={};R.forEach(function(r){var v=r[key];m[v]=(m[v]||0)+1;});return m;}
function ordered(key,lab,ordKey){
  var seen={},arr=[];R.forEach(function(r){if(!seen[r[key]]){seen[r[key]]=1;arr.push({v:r[key],l:r[lab],o:ordKey?r[ordKey]:0});}});
  arr.sort(function(a,b){return (a.o-b.o)||a.l.localeCompare(b.l);});return arr;}
var REG=ordered('region','regionLabel','regionOrder'), CRS=ordered('course','courseLabel','courseOrder');
var MAINS=ordered('main','main');
var DIETS={},DIFFS={};R.forEach(function(r){r.diet.forEach(function(d){DIETS[d]=(DIETS[d]||0)+1;});DIFFS[r.difficulty]=(DIFFS[r.difficulty]||0)+1;});
var regC=count('region'),crsC=count('course'),mainC=count('main');
function title(s){return s.toLowerCase().replace(/(^|[\s(\-\/&])([a-z])/g,function(m,a,b){return a+b.toUpperCase();});}
function match(r){
  if(state.region&&r.region!==state.region)return false;
  if(state.course&&r.course!==state.course)return false;
  if(state.main&&r.main!==state.main)return false;
  var ds=Object.keys(state.diet).filter(function(k){return state.diet[k];});
  if(ds.length&&!ds.some(function(d){return r.diet.indexOf(d)>=0;}))return false;
  var fs=Object.keys(state.diff).filter(function(k){return state.diff[k];});
  if(fs.length&&fs.indexOf(r.difficulty)<0)return false;
  if(state.q){var terms=norm(state.q).split(/\s+/).filter(Boolean);
    for(var i=0;i<terms.length;i++){if(r._title.indexOf(terms[i])<0&&r._ing.indexOf(terms[i])<0)return false;}}
  return true;
}
function setNav(which){
  document.getElementById('nav-welcome').classList.toggle('on',which==='welcome');
  document.getElementById('nav-recipes').classList.toggle('on',which!=='welcome');
}
function welcome(){
  setNav('welcome'); document.title="All Things Work Together: A Carter and O'Neal Family Cookbook";
  var h='<section class="welcome" aria-labelledby="wt">';
  h+='<img class="emblem" src="emblem.jpg" alt="Tejas Social House emblem">';
  h+='<h1 id="wt">All Things Work Together</h1><p class="sub">A Carter and O’Neal Family Cookbook</p>';
  h+='<div class="cta"><a class="btn" href="#recipes">Browse recipes &rarr;</a></div>';
  h+='<div class="rule" aria-hidden="true"></div>';
  h+='<h2 class="label">Dedication</h2>';
  F.dedication.forEach(function(p){h+='<p class="dedication">'+esc(p)+'</p>';});
  h+='<h2 class="label">Introduction</h2><div class="intro">';
  F.intro.forEach(function(p,i){
    var cls=/^[“"]/.test(p)?'verse':(/^— /.test(p)?'vref':'');
    h+='<p'+(cls?' class="'+cls+'"':'')+'>'+esc(p)+'</p>';});
  h+='</div><div class="rule" aria-hidden="true"></div>';
  h+='<div class="cta"><a class="btn" href="#recipes">Browse all '+R.length+' family recipes &rarr;</a></div></section>';
  app.innerHTML=h; window.scrollTo(0,0);
}
function opts(arr,c,sel,all){return '<option value="">'+all+'</option>'+arr.map(function(o){return '<option value="'+esc(o.v)+'"'+(o.v===sel?' selected':'')+'>'+esc(o.l)+' ('+c[o.v]+')</option>';}).join('');}
function chipset(name,obj,cnt){return Object.keys(cnt).sort().map(function(k){return '<button type="button" class="chip" data-g="'+name+'" data-v="'+esc(k)+'" aria-pressed="'+(!!obj[k])+'">'+esc(title(k))+'<span class="n">'+cnt[k]+'</span></button>';}).join('');}
function list(){
  setNav('recipes'); document.title='Recipes · All Things Work Together';
  var h='<h1 class="sr" style="position:absolute;left:-9999px">Recipes</h1>';
  h+='<div class="search"><label for="q" style="position:absolute;left:-9999px">Search recipes</label><input id="q" type="search" autocomplete="off" placeholder="Search dish or ingredient…" value="'+esc(state.q)+'"><button type="button" id="clearq" aria-label="Clear search">×</button></div>';
  h+='<div class="filters">';
  h+='<label>Region<select id="f-region">'+opts(REG,regC,state.region,'All regions')+'</select></label>';
  h+='<label>Course<select id="f-course">'+opts(CRS,crsC,state.course,'All courses')+'</select></label>';
  h+='<label>Main ingredient<select id="f-main">'+opts(MAINS.map(function(o){return {v:o.v,l:title(o.l)};}),mainC,state.main,'Any')+'</select></label>';
  h+='</div><p class="glabel" id="gl-diet">Diet</p><div class="chips" role="group" aria-labelledby="gl-diet">'+chipset('diet',state.diet,DIETS)+'</div>';
  h+='<p class="glabel" id="gl-diff">Difficulty</p><div class="chips" role="group" aria-labelledby="gl-diff">'+chipset('diff',state.diff,DIFFS)+'</div>';
  h+='<div class="status"><span id="count" aria-live="polite"></span><button type="button" class="linkbtn" id="reset">Clear all filters</button></div>';
  h+='<ul class="results" id="res"></ul>';
  app.innerHTML=h;
  var q=document.getElementById('q');
  q.addEventListener('input',function(){state.q=q.value;results();});
  document.getElementById('clearq').onclick=function(){state.q='';q.value='';results();q.focus();};
  ['region','course','main'].forEach(function(k){document.getElementById('f-'+k).addEventListener('change',function(e){state[k]=e.target.value;results();});});
  Array.prototype.forEach.call(app.querySelectorAll('.chip'),function(b){b.onclick=function(){var g=state[b.dataset.g];g[b.dataset.v]=!g[b.dataset.v];b.setAttribute('aria-pressed',String(!!g[b.dataset.v]));results();};});
  document.getElementById('reset').onclick=function(){state={q:'',region:'',course:'',main:'',diet:{},diff:{}};list();};
  results(); window.scrollTo(0,listScroll);
}
function results(){
  var hits=R.filter(match);
  var terms=norm(state.q).split(/\s+/).filter(Boolean);
  function tscore(r){if(!terms.length)return 0; return terms.every(function(t){return r._title.indexOf(t)>=0;})?0:1;}
  hits.sort(function(a,b){return (tscore(a)-tscore(b))||(a.regionOrder-b.regionOrder)||(a.courseOrder-b.courseOrder)||a.title.localeCompare(b.title);});
  document.getElementById('count').textContent=hits.length+(hits.length===1?' recipe':' recipes')+(hits.length===R.length?'':' of '+R.length);
  var el=document.getElementById('res');
  if(!hits.length){el.innerHTML='<li class="empty">No recipes match. Try fewer words or clear the filters.</li>';return;}
  el.innerHTML=hits.map(function(r){
    return '<li><a href="#recipe/'+r.slug+'">'+(r.img?'<img loading="lazy" src="'+r.img+'" alt="">':'<span style="width:72px"></span>')+
      '<span><span class="rt">'+esc(r.title)+'</span><span class="meta">'+esc(r.regionLabel)+' · '+esc(r.courseLabel)+'</span><span class="cr">'+esc(r.credit)+'</span></span></a></li>';}).join('');
}
function recipe(r){
  setNav('recipe'); document.title=r.title+' · All Things Work Together';
  var h='<div class="toolbar"><button type="button" class="btn alt" id="back">&larr; Back</button><button type="button" class="btn alt" id="print">Print</button></div>';
  h+='<article class="recipe"><p class="crumb">'+esc(r.regionLabel)+' · '+esc(r.courseLabel)+'<span class="dot" aria-hidden="true"></span></p>';
  h+='<h1>'+esc(r.title)+'</h1><p class="credit">'+esc(r.credit)+'</p>';
  if(r.credit2)r.credit2.split('\n').forEach(function(c){h+='<p class="credit2">'+esc(c)+'</p>';});
  h+='<p class="tagline">'+esc(r.tagline)+'</p>';
  if(r.img)h+='<img class="hero" src="'+r.img+'" alt="'+esc(r.title)+'">';
  if(r.yld)h+='<p class="yield">'+esc(r.yld)+'</p>';
  if(r.ingredients.length){h+='<h2 class="sec">INGREDIENTS</h2><ul class="ings">'+r.ingredients.map(function(i){return i.sub?'<li class="sub">'+esc(i.sub)+'</li>':'<li>'+esc(i.t)+'</li>';}).join('')+'</ul>';}
  if(r.steps.length){h+='<h2 class="sec">DIRECTIONS</h2><ol class="steps">'+r.steps.map(function(s){
      if(s.sub)return '<li class="sub">'+esc(s.sub)+'</li>';
      return '<li>'+(s.n?'<span class="n">'+esc(s.n)+'</span>':'<span class="n" aria-hidden="true">·</span>')+'<span>'+esc(s.t)+'</span></li>';}).join('')+'</ol>';}
  if(r.notes.length){h+='<h2 class="sec">NOTES</h2><div class="notes">'+r.notes.map(function(n){return '<p>'+esc(n)+'</p>';}).join('')+'</div>';}
  h+='<p class="end" aria-hidden="true">✦ ✦ ✦</p></article>';
  app.innerHTML=h; window.scrollTo(0,0);
  document.getElementById('back').onclick=function(){ if(history.length>1&&cameFromList){history.back();} else {location.hash='#recipes';} };
  document.getElementById('print').onclick=function(){window.print();};
}
var cameFromList=false, last='';
function route(){
  var h=decodeURIComponent(location.hash.replace(/^#/,''));
  if(last==='recipes'&&h.indexOf('recipe/')===0){listScroll=window.scrollY;cameFromList=true;}
  else if(h.indexOf('recipe/')!==0){cameFromList=false;}
  last=h.indexOf('recipe/')===0?'recipe':(h||'welcome');
  if(h.indexOf('recipe/')===0){var r=BY[h.slice(7)]; if(r)return recipe(r); app.innerHTML='<p class="empty">Recipe not found. <a href="#recipes">Back to recipes</a></p>';return;}
  if(h==='recipes'){return list();}
  welcome();
}
window.addEventListener('hashchange',route);
route();
})();
