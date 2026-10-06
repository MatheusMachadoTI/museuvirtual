(() => {
'use strict';
const $=(s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const root=location.pathname.includes('/pages/')?'../':'./';
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const safe=(s,f='')=>s||f;

function initTheme(){const saved=localStorage.getItem('sv-theme'); if(saved==='light')document.body.classList.add('light'); $('#themeBtn')?.addEventListener('click',()=>{document.body.classList.toggle('light');localStorage.setItem('sv-theme',document.body.classList.contains('light')?'light':'dark')});}
function initNav(){const menu=$('#menuBtn'),nav=$('#nav'); menu?.addEventListener('click',()=>{nav.classList.toggle('open');menu.setAttribute('aria-expanded',nav.classList.contains('open'))}); const cur=location.pathname.split('/').pop()||'index.html'; $$('.nav a').forEach(a=>{if((a.getAttribute('href')||'').split('/').pop()===cur)a.classList.add('active')}); const bar=$('#progressLine'); addEventListener('scroll',()=>{document.body.classList.toggle('scrolled',scrollY>30); if(bar){const max=document.documentElement.scrollHeight-innerHeight;bar.style.width=`${max>0?scrollY/max*100:0}%`}}, {passive:true});}
function reveal(){const els=$$('.reveal'); if(!('IntersectionObserver'in window)){els.forEach(e=>e.classList.add('visible'));return} const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.08}); els.forEach(e=>io.observe(e));}
function toast(msg){let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.append(t)}t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),2300)}
const FALLBACK_IMAGE=`${root}assets/images/fallback/cosmic-fallback.svg`;

const CONTEXT_FALLBACKS={
  solar:`${root}assets/images/fallback/cosmic-fallback.svg`,
  phenomenon:`${root}assets/images/fallback/cosmic-fallback.svg`,
  default:`${root}assets/images/fallback/cosmic-fallback.svg`
};
function loadImageWithFallback(img){
  if(!img || img.dataset.fallbackBound)return;
  img.dataset.fallbackBound='1';
  img.loading=img.loading||'lazy';
  img.decoding='async';
  img.addEventListener('error',()=>{
    const alt=img.dataset.altSrc;
    if(alt && !img.dataset.altTried){
      img.dataset.altTried='1';
      console.warn('[Sinais do Universo] imagem principal falhou; tentando alternativa:',img.src);
      img.src=alt;
      return;
    }
    if(img.dataset.localFallbackTried!=='1'){
      img.dataset.localFallbackTried='1';
      console.warn('[Sinais do Universo] usando fallback local para:',img.alt||img.src);
      img.classList.remove('failed');
      const context=img.closest('.phenomenon-detail-media,.phenomenon-card')?'phenomenon':(img.closest('.solar-stage')?'solar':'default');
      img.src=CONTEXT_FALLBACKS[context]||FALLBACK_IMAGE;
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      return;
    }
    img.classList.add('failed');
    img.setAttribute('aria-label',`Imagem alternativa indisponível: ${img.alt||'visualização astronômica'}`);
  },{once:false});
}
function initImages(){ $$('img').forEach(loadImageWithFallback) }
function setImageSources(container=document){
  $$('img[data-alt-src]',container).forEach(loadImageWithFallback);
}
function initHeroStars(){
  const c=$('#starfield');if(!c)return;
  const ctx=c.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,dpr=Math.min(devicePixelRatio||1,2);
  let w,h,stars=[];
  const resize=()=>{
    w=innerWidth;h=innerHeight;c.width=w*dpr;c.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
    stars=Array.from({length:Math.min(260,Math.floor(w*h/8500))},()=>({x:Math.random()*w,y:Math.random()*h,z:Math.random(),r:.35+Math.random()*1.5,s:.05+Math.random()*.25}));
  };
  const draw=()=>{
    ctx.clearRect(0,0,w,h);
    for(const s of stars){if(!reduce){s.y+=s.s;if(s.y>h)s.y=0;}ctx.globalAlpha=.25+s.z*.7;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.x,s.y,s.r*(.6+s.z),0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;if(!reduce)requestAnimationFrame(draw);
  };
  addEventListener('resize',resize,{passive:true});resize();draw();
}

function modal(html){let m=$('#globalModal');if(!m){m=document.createElement('div');m.id='globalModal';m.className='modal';m.innerHTML='<div class="modal-box"><button class="modal-close" aria-label="Fechar">×</button><div class="modal-content"></div></div>';document.body.append(m);m.addEventListener('click',e=>{if(e.target===m||e.target.closest('.modal-close'))closeModal()});document.addEventListener('keydown',e=>e.key==='Escape'&&closeModal())}$('.modal-content',m).innerHTML=html;m.classList.add('open');m.setAttribute('aria-hidden','false');initImages()}
function closeModal(){const m=$('#globalModal');m?.classList.remove('open');m?.setAttribute('aria-hidden','true')}


function initSolar(){
  const stage=$('#solarStage');
  if(!stage)return;

  const planets=Array.isArray(SOLAR_SYSTEM)?SOLAR_SYSTEM:[];
  const container=$('#solarPlanets');
  const info=$('#planetInfo');
  const canvas=$('#solarCanvas');
  const webglWrap=$('#solarWebglWrap');
  const loading=$('#solarWebglLoading');

  let selected='terra',speed=1,paused=false,educational=false;

  // Keep the original CSS implementation intact as the first fallback.
  container.innerHTML=planets.map(p=>`<button class="planet-orbit p-${p.id}" data-planet="${p.id}" aria-label="Focar ${esc(p.name)}"><span class="planet planet-${p.texture}">${p.id==='terra'?'<span class="moon" aria-hidden="true"></span>':''}</span><span class="planet-label">${esc(p.name)}</span></button>`).join('');

  const renderInfo=p=>{
    if(!p)return;
    selected=p.id;
    $$('.planet-orbit',container).forEach(b=>b.classList.toggle('selected',b.dataset.planet===p.id));
    info.innerHTML=`<div class="planet-kicker">${esc(p.type)}</div><h2>${esc(p.name)}</h2><p>${esc(p.desc)}</p><div class="stat-grid">${[['Distância',p.distance],['Diâmetro',p.diameter],['Massa',p.mass],['Gravidade',p.gravity],['Temperatura',p.temp],['Ano',p.year],['Dia',p.day],['Luas',p.moons]].map(([a,b])=>`<div><small>${a}</small><strong>${esc(b)}</strong></div>`).join('')}</div><div class="info-section"><b>Composição</b><span>${esc(p.composition)}</span></div><div class="info-section"><b>Atmosfera</b><span>${esc(p.atmosphere)}</span></div><div class="info-section"><b>Missões</b><span>${esc(p.missions)}</span></div><ul class="fact-list">${p.facts.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
    stage.classList.toggle('educational',educational);
  };

  const setSelected=id=>{
    const p=planets.find(x=>x.id===id)||planets[2]||planets[0];
    if(p)renderInfo(p);
    return p;
  };

  $$('.planet-orbit',container).forEach(b=>b.addEventListener('click',()=>setSelected(b.dataset.planet)));

  $('#solarPause')?.addEventListener('click',e=>{
    paused=!paused;
    e.currentTarget.textContent=paused?'Continuar':'Pausar';
    stage.classList.toggle('paused',paused);
  });
  $('#solarReset')?.addEventListener('click',()=>{
    stage.style.setProperty('--solar-scale','1');
    setSelected('terra');
    if(window.__solar3dReset)window.__solar3dReset();
  });
  $('#solarZoomIn')?.addEventListener('click',()=>{
    if(window.__solar3dZoom)window.__solar3dZoom(-1);
    else stage.style.setProperty('--solar-scale',Math.min(1.65,parseFloat(getComputedStyle(stage).getPropertyValue('--solar-scale'))+.1));
  });
  $('#solarZoomOut')?.addEventListener('click',()=>{
    if(window.__solar3dZoom)window.__solar3dZoom(1);
    else stage.style.setProperty('--solar-scale',Math.max(.72,parseFloat(getComputedStyle(stage).getPropertyValue('--solar-scale'))-.1));
  });
  $('#solarMode')?.addEventListener('click',e=>{
    educational=!educational;
    e.currentTarget.textContent=educational?'Modo realista':'Modo educativo';
    setSelected(selected);
    if(window.__solar3dEducational)window.__solar3dEducational(educational);
  });
  $('#solarSpeed')?.addEventListener('input',e=>{
    speed=+e.target.value||1;
    stage.style.setProperty('--orbit-speed',`${12/speed}s`);
    if(window.__solar3dSpeed)window.__solar3dSpeed(speed);
  });
  $('#planetSearch')?.addEventListener('input',e=>{
    const q=e.target.value.toLowerCase().trim();
    $$('.planet-orbit',container).forEach(b=>b.hidden=!b.dataset.planet.includes(q)&&!(b.textContent||'').toLowerCase().includes(q));
    if(window.__solar3dFilter)window.__solar3dFilter(q);
  });

  setSelected(new URLSearchParams(location.search).get('planet')||'terra');

  // ---------- Original 3D CSS pointer tilt remains available ----------
  const update3D=(clientX,clientY)=>{
    if(stage.classList.contains('webgl-ready'))return;
    const r=stage.getBoundingClientRect();
    const nx=(clientX-r.left)/r.width-.5,ny=(clientY-r.top)/r.height-.5;
    stage.style.setProperty('--solar-rotate-x',`${(-ny*10).toFixed(2)}deg`);
    stage.style.setProperty('--solar-rotate-y',`${(nx*14).toFixed(2)}deg`);
  };
  stage.addEventListener('pointermove',e=>update3D(e.clientX,e.clientY),{passive:true});
  stage.addEventListener('pointerleave',()=>{
    stage.style.setProperty('--solar-rotate-x','0deg');
    stage.style.setProperty('--solar-rotate-y','0deg');
  },{passive:true});

  // ---------- Real WebGL enhancement ----------
  if(!canvas||!webglWrap)return;
  if(!window.THREE||!window.THREE.OrbitControls){
    if(loading)loading.classList.add('hidden');
    stage.classList.add('webgl-error');
    return;
  }

  try{
    const THREE=window.THREE;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.15;
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;

    const scene=new THREE.Scene();
    scene.fog=new THREE.FogExp2(0x01030a,.0005);

    const camera=new THREE.PerspectiveCamera(42,1,.1,9000);
    camera.position.set(0,420,760);

    const controls=new THREE.OrbitControls(camera,canvas);
    controls.enableDamping=true;
    controls.dampingFactor=.055;
    controls.enablePan=false;
    controls.minDistance=170;
    controls.maxDistance=1700;
    controls.target.set(0,0,0);

    scene.add(new THREE.HemisphereLight(0x9abfff,0x03050a,.22));

    const sunLight=new THREE.PointLight(0xffd6a0,5.2,0,2);
    sunLight.castShadow=true;
    sunLight.shadow.mapSize.set(1024,1024);
    scene.add(sunLight);

    const system=new THREE.Group();
    system.scale.setScalar(1.15);
    scene.add(system);

    const objects=new Map();
    const clock=new THREE.Clock();
    let currentSpeed=speed;
    let edu=educational;
    let destroyed=false;

    // Procedural, local planet maps. They avoid another set of broken
    // external image dependencies while preserving the existing data.
    function texture(kind,size=768){
      const c=document.createElement('canvas');
      c.width=size;c.height=size/2;
      const ctx=c.getContext('2d');
      const w=c.width,h=c.height;

      function bands(colors){
        const g=ctx.createLinearGradient(0,0,0,h);
        colors.forEach((c,i)=>g.addColorStop(i/(colors.length-1),c));
        ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
      }
      function speckle(count,color,alpha=.18,maxR=14){
        for(let i=0;i<count;i++){
          const x=Math.random()*w,y=Math.random()*h,r=1+Math.random()*maxR;
          ctx.fillStyle=color.replace('ALPHA',String(alpha*Math.random()));
          ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
        }
      }

      if(kind==='mercury'){
        bands(['#ddd8ce','#969088','#4b4844']);
        speckle(220,'rgba(35,32,29,ALPHA)',.35,18);
      }else if(kind==='venus'){
        bands(['#f1c97d','#cf8d4b','#8b4c28']);
        for(let i=0;i<55;i++){
          const y=Math.random()*h;
          ctx.strokeStyle=`rgba(255,236,183,${.06+Math.random()*.12})`;
          ctx.lineWidth=2+Math.random()*9;
          ctx.beginPath();ctx.moveTo(0,y);
          for(let x=0;x<=w;x+=30)ctx.lineTo(x,y+Math.sin(x*.018+i)*10);
          ctx.stroke();
        }
      }else if(kind==='earth'){
        bands(['#2c83c7','#0c4c9b','#06204e']);
        const continents=[
          [.18,.38,.14,.21],[.31,.64,.16,.12],[.48,.37,.12,.18],
          [.57,.57,.19,.15],[.74,.34,.16,.17],[.84,.67,.11,.11]
        ];
        continents.forEach(([x,y,rx,ry])=>{
          ctx.fillStyle='#3d8a4f';ctx.beginPath();ctx.ellipse(x*w,y*h,rx*w,ry*h,Math.random(),0,Math.PI*2);ctx.fill();
          ctx.fillStyle='rgba(166,187,91,.4)';ctx.beginPath();ctx.ellipse(x*w-rx*w*.12,y*h-ry*h*.1,rx*w*.55,ry*h*.4,0,0,Math.PI*2);ctx.fill();
        });
        for(let i=0;i<65;i++){
          const x=Math.random()*w,y=Math.random()*h;
          ctx.strokeStyle=`rgba(255,255,255,${.05+Math.random()*.15})`;
          ctx.lineWidth=2+Math.random()*8;
          ctx.beginPath();ctx.arc(x,y,8+Math.random()*32,0,Math.PI*2);ctx.stroke();
        }
      }else if(kind==='mars'){
        bands(['#d06b4d','#91402d','#431a16']);
        speckle(160,'rgba(43,17,15,ALPHA)',.3,18);
      }else if(kind==='jupiter'){
        bands(['#dcbf9a','#9d684d','#ead4b5','#9c6248','#e1bf93','#8b523b','#e4c8a2']);
        for(let i=0;i<70;i++){
          const y=Math.random()*h;
          ctx.strokeStyle=`rgba(255,246,223,${.04+Math.random()*.12})`;
          ctx.lineWidth=1+Math.random()*6;
          ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y+Math.sin(i)*5);ctx.stroke();
        }
        ctx.fillStyle='#a8503e';ctx.beginPath();ctx.ellipse(w*.70,h*.64,w*.10,h*.055,0,0,Math.PI*2);ctx.fill();
      }else if(kind==='saturn'){
        bands(['#e8d2a0','#b79c6e','#f0ddb2','#aa8c61','#ddc18d']);
      }else if(kind==='uranus'){
        bands(['#b8f3f0','#70cbd0','#347f91']);
      }else if(kind==='neptune'){
        bands(['#4b82df','#234da9','#0e286b']);
        ctx.fillStyle='rgba(8,20,58,.5)';ctx.beginPath();ctx.ellipse(w*.62,h*.57,w*.10,h*.045,0,0,Math.PI*2);ctx.fill();
      }else{
        bands(['#888','#444']);
      }

      const t=new THREE.CanvasTexture(c);
      t.colorSpace=THREE.SRGBColorSpace;
      t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
      return t;
    }

    function labelTexture(text){
      const c=document.createElement('canvas');c.width=512;c.height=100;
      const x=c.getContext('2d');
      x.clearRect(0,0,512,100);
      x.font='700 38px Arial';x.textAlign='center';x.textBaseline='middle';
      x.fillStyle='rgba(224,238,255,.95)';
      x.shadowColor='#000';x.shadowBlur=10;
      x.fillText(text,256,50);
      const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
      return t;
    }

    // Stars with depth.
    const count=innerWidth<700?2200:4400;
    const pos=new Float32Array(count*3),col=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const r=1200+Math.random()*2200,theta=Math.random()*Math.PI*2,phi=Math.acos(2*Math.random()-1);
      pos[i*3]=r*Math.sin(phi)*Math.cos(theta);
      pos[i*3+1]=r*Math.cos(phi);
      pos[i*3+2]=r*Math.sin(phi)*Math.sin(theta);
      const c=.55+Math.random()*.45;
      col[i*3]=c;col[i*3+1]=c;col[i*3+2]=1;
    }
    const starGeo=new THREE.BufferGeometry();
    starGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    starGeo.setAttribute('color',new THREE.BufferAttribute(col,3));
    scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({
      size:2,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.82,depthWrite:false
    })));

    // Animated Sun: shader gives a turbulent plasma-like surface.
    const sunMat=new THREE.ShaderMaterial({
      uniforms:{time:{value:0}},
      vertexShader:`varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`uniform float time;varying vec3 v;
      float n(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
      void main(){float a=n(floor(v*.18+time*.35));float b=n(floor(v*.55-time*.2));float f=.72+.42*a+.18*b;
      vec3 c=mix(vec3(1.0,.18,.015),vec3(1.0,.86,.28),a);c=mix(c,vec3(1.0,.98,.72),b*.35);
      gl_FragColor=vec4(c*f,1.0);}`
    });
    const sun=new THREE.Mesh(new THREE.SphereGeometry(52,72,72),sunMat);
    sun.castShadow=false;system.add(sun);sunLight.position.copy(sun.position);

    const glowCanvas=document.createElement('canvas');glowCanvas.width=256;glowCanvas.height=256;
    const gx=glowCanvas.getContext('2d');
    const gg=gx.createRadialGradient(128,128,3,128,128,128);
    gg.addColorStop(0,'rgba(255,245,185,.88)');gg.addColorStop(.2,'rgba(255,170,40,.38)');gg.addColorStop(1,'rgba(255,70,0,0)');
    gx.fillStyle=gg;gx.fillRect(0,0,256,256);
    const glowTex=new THREE.CanvasTexture(glowCanvas);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
    glow.scale.set(250,250,1);system.add(glow);

    const orbitR=[84,112,145,180,245,310,370,425];
    const planetR=[6,9,10,8,23,20,15,14];
    const incl=[7,3.4,0,1.85,1.3,2.5,.77,1.77];
    const periods=[.62,.94,1.18,1.65,2.7,3.55,4.5,5.35];

    function addPlanet(p,i){
      const orbit=new THREE.Group();
      orbit.rotation.x=THREE.MathUtils.degToRad(incl[i]);
      system.add(orbit);

      const a=orbitR[i],b=a*(i===3?.97:i===5?.985:.99);
      const pts=[];
      for(let j=0;j<180;j++){const t=j/180*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(t)*a,0,Math.sin(t)*b));}
      const line=new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({color:0x6f91bb,transparent:true,opacity:.14})
      );
      orbit.add(line);

      const pivot=new THREE.Group();orbit.add(pivot);
      const tex=texture(p.texture);
      const mat=new THREE.MeshStandardMaterial({map:tex,roughness:(p.id==='jupiter'||p.id==='saturno')?.68:.82});
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(planetR[i],48,48),mat);
      mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.planetId=p.id;pivot.add(mesh);

      if(['terra','venus','urano','netuno'].includes(p.id)){
        const colors={terra:0x62bfff,venus:0xf2b06b,urano:0x77dfe1,netuno:0x557cff};
        pivot.add(new THREE.Mesh(new THREE.SphereGeometry(planetR[i]*1.055,36,36),new THREE.MeshBasicMaterial({
          color:colors[p.id],transparent:true,opacity:p.id==='terra'?.14:.07,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false
        })));
      }

      if(p.id==='saturno'){
        const ring=new THREE.Mesh(new THREE.RingGeometry(planetR[i]*1.45,planetR[i]*2.3,128),new THREE.MeshBasicMaterial({
          color:0xd7bd8d,transparent:true,opacity:.72,side:THREE.DoubleSide
        }));
        ring.rotation.x=Math.PI/2.15;pivot.add(ring);
      }
      if(p.id==='urano'){
        const ring=new THREE.Mesh(new THREE.RingGeometry(planetR[i]*1.45,planetR[i]*1.7,96),new THREE.MeshBasicMaterial({
          color:0x9bd7d8,transparent:true,opacity:.25,side:THREE.DoubleSide
        }));
        ring.rotation.x=Math.PI/2.05;pivot.add(ring);
      }

      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture(p.name),transparent:true,depthWrite:false}));
      sprite.scale.set(105,20,1);sprite.position.y=planetR[i]*1.6;sprite.visible=false;pivot.add(sprite);

      const obj={p,orbit,pivot,mesh,line,sprite,a,b,angle:Math.random()*Math.PI*2,period:periods[i]};
      objects.set(p.id,obj);

      if(p.id==='terra'){
        const moonOrbit=new THREE.Group();pivot.add(moonOrbit);
        const moonPath=[];for(let j=0;j<80;j++){const t=j/80*Math.PI*2;moonPath.push(new THREE.Vector3(Math.cos(t)*26,0,Math.sin(t)*26));}
        moonOrbit.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(moonPath),new THREE.LineBasicMaterial({color:0x7891ad,transparent:true,opacity:.2})));
        const moon=new THREE.Mesh(new THREE.SphereGeometry(2.6,28,28),new THREE.MeshStandardMaterial({map:texture('mercury',384),roughness:.95}));
        moon.position.x=26;moon.castShadow=true;moonOrbit.add(moon);obj.moonOrbit=moonOrbit;
      }
    }
    planets.forEach(addPlanet);

    const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
    canvas.addEventListener('click',e=>{
      const r=canvas.getBoundingClientRect();
      pointer.x=((e.clientX-r.left)/r.width)*2-1;
      pointer.y=-((e.clientY-r.top)/r.height)*2+1;
      raycaster.setFromCamera(pointer,camera);
      const hit=raycaster.intersectObjects([...objects.values()].map(o=>o.mesh),false)[0];
      if(hit){
        const obj=objects.get(hit.object.userData.planetId);
        if(obj){setSelected(obj.p.id);focusPlanet(obj);}
      }
    });

    function focusPlanet(obj){
      const world=new THREE.Vector3();obj.mesh.getWorldPosition(world);
      controls.target.lerp(world,.35);
    }

    window.__solar3dSpeed=v=>{currentSpeed=v||1};
    window.__solar3dEducational=v=>{
      edu=!!v;
      objects.forEach(o=>{o.sprite.visible=edu;o.line.material.opacity=edu?.34:.14});
    };
    window.__solar3dFilter=q=>{
      objects.forEach(o=>{
        o.orbit.visible=!q||o.p.id.includes(q)||o.p.name.toLowerCase().includes(q);
      });
    };
    window.__solar3dZoom=dir=>{
      const f=dir<0?.86:1.16;
      camera.position.multiplyScalar(f);
      camera.position.clampLength(170,1700);
    };
    window.__solar3dReset=()=>{
      camera.position.set(0,420,760);controls.target.set(0,0,0);controls.update();
      objects.forEach(o=>o.orbit.visible=true);
      $('#planetSearch')?.setAttribute('value','');
    };

    function resize(){
      const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);
      camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
    }
    addEventListener('resize',resize,{passive:true});resize();

    stage.classList.add('webgl-ready');
    if(loading)loading.classList.add('hidden');

    function frame(){
      if(destroyed)return;
      requestAnimationFrame(frame);
      const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;
      sunMat.uniforms.time.value=t;
      glow.scale.setScalar(250+Math.sin(t*1.8)*7);

      if(!paused){
        system.rotation.y+=dt*.012*currentSpeed;
        objects.forEach(o=>{
          o.angle+=dt*(.25/o.period)*currentSpeed;
          o.pivot.position.set(Math.cos(o.angle)*o.a,0,Math.sin(o.angle)*o.b);
          o.mesh.rotation.y+=dt*(.3+1/(o.a/90+1));
          if(o.moonOrbit)o.moonOrbit.rotation.y+=dt*.55*currentSpeed;
        });
        sun.rotation.y+=dt*.035;
      }
      controls.update();
      renderer.render(scene,camera);
    }
    frame();
  }catch(error){
    console.error('[Sinais do Universo] WebGL desativado; mantendo visualização original.',error);
    stage.classList.remove('webgl-ready');
    stage.classList.add('webgl-error');
    if(loading)loading.classList.add('hidden');
  }
}
function initMuseum(){const grid=$('#museumGrid');if(!grid)return;const search=$('#museumSearch'),filters=$('#museumFilters');let category='Todos',current=0;const cats=['Todos',...new Set(MUSEUM_ITEMS.map(x=>x.category))];filters.innerHTML=cats.map(c=>`<button class="filter ${c==='Todos'?'active':''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');const render=()=>{const q=(search.value||'').toLowerCase();const list=MUSEUM_ITEMS.filter(x=>(category==='Todos'||x.category===category)&&`${x.title} ${x.category} ${x.meta} ${x.desc}`.toLowerCase().includes(q));grid.innerHTML=list.map((x,i)=>`<article class="museum-card reveal visible" data-id="${x.id}"><div class="museum-img"><img src="${x.image}" data-alt-src="${esc(x.fallbackImage||'')}" alt="${esc(x.title)}"/><span class="status ${x.status==='OBSERVADO'?'observed':'art'}">${x.status}</span><span class="zoom">＋</span></div><div class="museum-copy"><span>${esc(x.category)}</span><h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p><small>${esc(x.meta)} · ${esc(x.distance)}</small></div></article>`).join('')||'<div class="empty-state"><b>Nenhum registro encontrado</b><span>Altere a busca ou a categoria.</span></div>';initImages();$$('.museum-card',grid).forEach(card=>card.addEventListener('click',()=>openMuseum(card.dataset.id)));}; const openMuseum=id=>{const item=MUSEUM_ITEMS.find(x=>x.id===id);current=MUSEUM_ITEMS.indexOf(item);modal(`<div class="museum-modal"><div class="museum-large"><img src="${item.image}" data-alt-src="${esc(item.fallbackImage||'')}" alt="${esc(item.title)}"></div><div class="museum-details"><span class="eyebrow">${esc(item.category)} · ${esc(item.status)}</span><h2>${esc(item.title)}</h2><p>${esc(item.desc)}</p><div class="detail-pills"><span>${esc(item.meta)}</span><span>${esc(item.distance)}</span></div><div class="source-box"><b>Origem</b><span>${esc(item.source)}</span></div><p class="fine">Classificação visual: ${item.status==='OBSERVADO'?'imagem/dado observacional':'representação artística ou visualização científica'}. O site não apresenta uma ilustração como se fosse fotografia real.</p><div class="modal-nav"><button id="prevMuseum">← Anterior</button><button id="nextMuseum">Próximo →</button></div></div></div>`);$('#prevMuseum')?.addEventListener('click',()=>openMuseum(MUSEUM_ITEMS[(current-1+MUSEUM_ITEMS.length)%MUSEUM_ITEMS.length].id));$('#nextMuseum')?.addEventListener('click',()=>openMuseum(MUSEUM_ITEMS[(current+1)%MUSEUM_ITEMS.length].id));};filters.addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(!b)return;category=b.dataset.cat;$$('.filter',filters).forEach(x=>x.classList.toggle('active',x===b));render()});search.addEventListener('input',render);render()}

function initPhenomena(){const grid=$('#phenomenaGrid'),detail=$('#phenomenaDetail');if(!grid||!detail)return;let active=PHENOMENA[0];grid.innerHTML=PHENOMENA.map(p=>`<article class="phenomenon-card ${p===active?'active':''}" data-id="${p.id}"><div class="phenomenon-img"><img src="${p.image}" data-alt-src="${esc(p.fallbackImage||'')}" alt="${esc(p.title)}"><span>${p.icon}</span></div><div><small>${esc(p.tag)}</small><h3>${esc(p.title)}</h3><p>${esc(p.short)}</p></div></article>`).join('');const render=p=>{active=p;$$('.phenomenon-card',grid).forEach(c=>c.classList.toggle('active',c.dataset.id===p.id));detail.innerHTML=`<div class="phenomenon-detail-head"><div><span class="eyebrow">${esc(p.tag)}</span><h2>${esc(p.title)}</h2></div><div class="phenomenon-symbol">${p.icon}</div></div><p class="lead">${esc(p.short)}</p><div class="phenomenon-sections">${Object.entries(p.sections).map(([k,v])=>`<section><small>${({oque:'O QUE É?',como:'COMO ACONTECE?',escala:'ESCALA',curiosidade:'CURIOSIDADE'})[k]||k.toUpperCase()}</small><p>${esc(v)}</p></section>`).join('')}</div><div class="phenomenon-bar"><span>MODELO EDUCATIVO</span><i></i><span>OBSERVAÇÃO / FÍSICA</span></div><figure class="phenomenon-detail-media"><img src="${esc(p.image)}" data-alt-src="${esc(p.fallbackImage||'')}" alt="${esc(p.title)} — imagem detalhada" loading="eager" decoding="async"><figcaption>Imagem detalhada do fenômeno · fonte visual astronômica</figcaption></figure>`};$$('.phenomenon-card',grid).forEach(c=>c.addEventListener('click',()=>render(PHENOMENA.find(p=>p.id===c.dataset.id))));render(active);initImages()}

function initExploration(){const grid=$('#missionGrid');if(!grid)return;const agency=$('#missionAgency'),search=$('#missionSearch'),year=$('#missionYear');const render=()=>{const q=(search.value||'').toLowerCase();const a=agency.value;const y=year.value;const list=MISSIONS.filter(m=>(a==='all'||m.agency.includes(a))&&(!y||String(m.year)===y)&&`${m.name} ${m.target} ${m.desc}`.toLowerCase().includes(q));grid.innerHTML=list.map(m=>`<article class="mission-card reveal visible"><div class="mission-year">${m.year}</div><div class="mission-line"></div><div class="mission-content"><div class="mission-image"><img src="${m.image}" data-alt-src="${esc(m.fallbackImage||'')}" alt="${esc(m.name)}"></div><div><span class="eyebrow">${esc(m.agency)} · ${esc(m.status)}</span><h3>${esc(m.name)}</h3><p>${esc(m.desc)}</p><div class="mission-meta"><span>DESTINO <b>${esc(m.target)}</b></span><span>ANO <b>${m.year}</b></span></div></div></div></article>`).join('')||'<div class="empty-state"><b>Nenhuma missão encontrada</b></div>';initImages()}; const years=[...new Set(MISSIONS.map(m=>m.year))].sort();year.innerHTML='<option value="">Todas as décadas</option>'+years.map(y=>`<option value="${y}">${y}</option>`).join('');[agency,search,year].forEach(x=>x.addEventListener('input',render));render()}

function initGlossary(){const grid=$('#glossaryGrid'),input=$('#glossarySearch'),letters=$('#glossaryLetters'),category=$('#glossaryCategory');if(!grid)return;let letter='';const cats=[...new Set(GLOSSARY.map(x=>x[3]))].sort();category.innerHTML='<option value="">Todas as categorias</option>'+cats.map(x=>`<option>${esc(x)}</option>`).join('');letters.innerHTML=['Todos',...new Set(GLOSSARY.map(x=>x[0]))].map(x=>`<button class="filter ${x==='Todos'?'active':''}" data-letter="${x==='Todos'?'':x}">${x}</button>`).join('');const render=()=>{const q=(input.value||'').toLowerCase(),cat=category.value;const list=GLOSSARY.filter(x=>(!letter||x[0]===letter)&&(!cat||x[3]===cat)&&x.slice(1).join(' ').toLowerCase().includes(q));grid.innerHTML=list.map(x=>`<article class="glossary-card"><div class="term-letter">${esc(x[0])}</div><div><span>${esc(x[3])}</span><h3>${esc(x[1])}</h3><p>${esc(x[2])}</p><div class="advanced"><b>Nota avançada</b><span>${esc(x[4])}</span></div></div></article>`).join('')||'<div class="empty-state"><b>Termo não encontrado</b><span>Tente outra palavra ou categoria.</span></div>'};letters.addEventListener('click',e=>{const b=e.target.closest('[data-letter]');if(!b)return;letter=b.dataset.letter;$$('.filter',letters).forEach(x=>x.classList.toggle('active',x===b));render()});input.addEventListener('input',render);category.addEventListener('change',render);render()}

function initLab(){const mass=$('#labMass'),g=$('#labGravity'),weight=$('#labWeight'),planet=$('#labPlanet');if(!mass)return;const update=()=>{const m=+mass.value,gv=+g.value;weight.textContent=`${(m*gv).toFixed(1)} N`;planet.textContent=`${m} kg · gravidade ${gv.toFixed(2)} m/s²`};mass.addEventListener('input',update);g.addEventListener('input',update);update(); const light=$('#lightDistance'),lightOut=$('#lightOutput');light?.addEventListener('input',()=>{const km=+light.value;const seconds=km/299792.458;let text=seconds<60?`${seconds.toFixed(2)} s`:seconds<3600?`${(seconds/60).toFixed(2)} min`:`${(seconds/3600).toFixed(2)} h`;lightOut.textContent=text});light?.dispatchEvent(new Event('input'));}

function initGlobalSearch(){const input=$('#globalSearch'),out=$('#searchResults');if(!input)return;input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase();if(!q){out.hidden=true;return}const ps=SOLAR_SYSTEM.filter(p=>`${p.name} ${p.type}`.toLowerCase().includes(q)).map(p=>`<a href="${root}pages/sistema-solar.html?planet=${p.id}"><b>${esc(p.name)}</b><span>${esc(p.type)}</span></a>`);const gs=GLOSSARY.filter(x=>x.slice(1).join(' ').toLowerCase().includes(q)).slice(0,5).map(x=>`<a href="${root}pages/glossario.html"><b>${esc(x[1])}</b><span>${esc(x[2])}</span></a>`);out.innerHTML=[...ps,...gs].slice(0,8).join('')||'<div class="empty-search">Nenhum resultado encontrado.</div>';out.hidden=false})}


function initHeroCarousel(){
  const carousel=$('#heroCarousel'),slidesEl=$('#heroSlides'),copyEl=$('#heroCopy'),dotsEl=$('#heroDots');
  if(!carousel||!slidesEl||!copyEl||!dotsEl||!Array.isArray(HERO_SLIDES)||!HERO_SLIDES.length)return;
  let index=0,timer=null,progressTimer=null,paused=false,transitioning=false;
  const duration=4800;
  const renderSlides=()=>{
    slidesEl.innerHTML=HERO_SLIDES.map((s,i)=>`<article class="hero-slide ${i===0?'is-active':''}" data-index="${i}" aria-hidden="${i!==0}">
      <img ${i===0?'fetchpriority="high"':'loading="lazy"'} decoding="async" src="${esc(s.image)}" alt="${esc(s.alt)}" data-hero-image="${i}">
    </article>`).join('');
    dotsEl.innerHTML=HERO_SLIDES.map((s,i)=>`<button class="hero-dot ${i===0?'active':''}" role="tab" aria-selected="${i===0}" aria-label="Ir para slide ${i+1}: ${esc(s.title)}" data-slide="${i}"><span></span></button>`).join('');
    $$('.hero-slide img',slidesEl).forEach(loadImageWithFallback);
  };
  const preload=(i)=>{
    const s=HERO_SLIDES[(i+HERO_SLIDES.length)%HERO_SLIDES.length];
    if(!s)return;
    const old=document.querySelector('link[data-hero-preload]');
    old?.remove();
    const link=document.createElement('link');link.rel='preload';link.as='image';link.href=s.image;link.dataset.heroPreload='1';
    document.head.append(link);
  };
  const animateCopy=()=>{
    const s=HERO_SLIDES[index];
    copyEl.classList.remove('copy-in');
    void copyEl.offsetWidth;
    copyEl.innerHTML=`<div class="hero-copy-inner">
      <span class="eyebrow">${esc(s.kicker)}</span>
      <h1>${esc(s.title)}</h1>
      <p>${esc(s.subtitle)}</p>
      <div class="hero-actions"><a class="btn primary" href="${esc(root+s.href)}">${esc(s.cta)} <span>→</span></a>${s.secondary?`<a class="btn" href="${esc(root+s.secondaryHref)}">${esc(s.secondary)}</a>`:''}</div>
    </div>`;
    copyEl.classList.add('copy-in');
    const counter=$('#heroCounter'); if(counter)counter.innerHTML=`<b>${String(index+1).padStart(2,'0')}</b><span>/ ${String(HERO_SLIDES.length).padStart(2,'0')}</span>`;
    const credit=$('#heroCredit');if(credit)credit.textContent=s.credit;
  };
  const setActive=(next,instant=false)=>{
    if(next===index&&!instant)return;
    const prev=index;index=(next+HERO_SLIDES.length)%HERO_SLIDES.length;
    const all=$$('.hero-slide',slidesEl);
    all.forEach((el,i)=>{el.classList.toggle('is-active',i===index);el.classList.toggle('was-active',i===prev);el.setAttribute('aria-hidden',String(i!==index));});
    $$('.hero-dot',dotsEl).forEach((dot,i)=>{dot.classList.toggle('active',i===index);dot.setAttribute('aria-selected',String(i===index));});
    animateCopy();preload(index+1);
  };
  const restart=()=>{
    clearTimeout(timer);clearInterval(progressTimer);
    if(paused || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const bar=$('#heroProgressBar'); if(bar){bar.style.transition='none';bar.style.width='0%';requestAnimationFrame(()=>{bar.style.transition=`width ${duration}ms linear`;bar.style.width='100%';});}
    timer=setTimeout(()=>setActive(index+1),duration);
  };
  const go=(dir)=>{setActive(index+dir);restart()};
  renderSlides();animateCopy();preload(1);restart();
  $('#heroPrev')?.addEventListener('click',()=>go(-1));$('#heroNext')?.addEventListener('click',()=>go(1));
  dotsEl.addEventListener('click',e=>{const b=e.target.closest('[data-slide]');if(!b)return;setActive(+b.dataset.slide);restart()});
  carousel.addEventListener('mouseenter',()=>{paused=true;clearTimeout(timer);clearInterval(progressTimer);});
  carousel.addEventListener('mouseleave',()=>{paused=false;restart()});
  carousel.addEventListener('focusin',()=>{paused=true;clearTimeout(timer);});
  carousel.addEventListener('focusout',e=>{if(!carousel.contains(e.relatedTarget)){paused=false;restart()}});
  carousel.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();go(-1)}else if(e.key==='ArrowRight'){e.preventDefault();go(1)}else if(e.key===' '){e.preventDefault();paused=!paused;paused?clearTimeout(timer):restart()}});
  let startX=0,startY=0;
  carousel.addEventListener('touchstart',e=>{startX=e.changedTouches[0].clientX;startY=e.changedTouches[0].clientY;paused=true;clearTimeout(timer)},{passive:true});
  carousel.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.25)go(dx<0?1:-1);paused=false;restart()},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else restart()});
}

function initUniversal(){initTheme();initNav();reveal();initImages();initHeroCarousel();initHeroStars();initSolar();initMuseum();initPhenomena();initExploration();initGlossary();initLab();initGlobalSearch();}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',initUniversal):initUniversal();
})();
