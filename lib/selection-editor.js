(function(root){
  let disposeCurrent=null;
  function close(){disposeCurrent?.();}

  function open({image,initial,onSave}){
    close();
    const previous=document.activeElement,width=image.width,height=image.height,selection=root.WormSelection;
    let mask=initial?.width===width&&initial?.height===height?selection.unpack(initial.bits,width*height):new Uint8Array(width*height);
    let tool='rectangle',mode='replace',drag=null,points=[],past=[],future=[],lastWand=null;
    let previewFrame=0,closed=false,border=new Path2D(),pixelArea=0;
    const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
    const dialog=document.createElement('dialog');
    dialog.className='reference-editor';dialog.setAttribute('aria-labelledby','referenceEditorTitle');
    dialog.innerHTML=`<header><div><h2 id="referenceEditorTitle">Select a reference area</h2><p>Outline a known shape in the larva’s plane.</p></div><button class="btn icon" data-action="cancel" aria-label="Close area selection"><i class="fas fa-times" aria-hidden="true"></i></button></header>
      <div class="reference-tools" role="group" aria-label="Selection tools"><button class="btn" data-tool="rectangle" title="Rectangular marquee (M)"><i class="far fa-square" aria-hidden="true"></i> Rectangle</button><button class="btn" data-tool="ellipse" title="Elliptical marquee"><i class="far fa-circle" aria-hidden="true"></i> Ellipse</button><button class="btn" data-tool="lasso" title="Freehand lasso (L)"><i class="fas fa-draw-polygon" aria-hidden="true"></i> Lasso</button><button class="btn" data-tool="wand" title="Magic wand (W)"><i class="fas fa-magic" aria-hidden="true"></i> Magic wand</button></div>
      <div class="reference-options"><label>Selection <select data-option="mode"><option value="replace">Replace</option><option value="add">Add</option><option value="subtract">Subtract</option><option value="intersect">Intersect</option></select></label><label data-circle hidden><input type="checkbox" data-circle-lock> Circle</label><label data-wand hidden>Tolerance <input type="range" min="0" max="255" value="24" aria-label="Magic wand tolerance"><output>24</output></label><label data-wand hidden><input type="checkbox" checked> Contiguous</label><button class="btn icon" data-action="undo" aria-label="Undo area selection"><i class="fas fa-undo" aria-hidden="true"></i></button><button class="btn icon" data-action="redo" aria-label="Redo area selection"><i class="fas fa-redo" aria-hidden="true"></i></button><button class="btn ghost" data-action="all">Select all</button><button class="btn ghost" data-action="clear">Deselect</button><button class="btn ghost" data-action="invert">Invert</button></div>
      <div class="reference-canvas"><canvas aria-label="Reference area selection canvas" tabindex="0"></canvas></div><footer><output data-area aria-live="polite"></output><span data-help>Shift adds · Alt subtracts · Shift+Alt intersects</span><button class="btn" data-action="cancel">Cancel</button><button class="btn primary" data-action="save">Use selected area</button></footer>`;
    document.body.append(dialog);
    const canvas=dialog.querySelector('canvas'),context=canvas.getContext('2d'),base=document.createElement('canvas'),scene=document.createElement('canvas'),paint=document.createElement('canvas');
    for(const target of [canvas,base,scene,paint]){target.width=width;target.height=height;}
    base.getContext('2d').putImageData(image,0,0);
    const areaLabel=dialog.querySelector('[data-area]'),save=dialog.querySelector('[data-action="save"]'),undo=dialog.querySelector('[data-action="undo"]'),redo=dialog.querySelector('[data-action="redo"]');
    const tolerance=dialog.querySelector('input[type="range"]'),contiguous=dialog.querySelector('[data-wand] input[type="checkbox"]');

    function draw(){
      if(closed)return;
      context.clearRect(0,0,width,height);context.drawImage(scene,0,0);
      const scale=width/Math.max(1,canvas.getBoundingClientRect().width);
      context.save();context.lineWidth=1.5*scale;context.setLineDash([]);context.strokeStyle='#fff';context.stroke(border);
      context.setLineDash([4*scale,4*scale]);context.lineDashOffset=reducedMotion.matches?0:-performance.now()/100*scale;context.strokeStyle='#161a17';context.stroke(border);context.restore();
    }
    function render(shown=mask){
      const pixels=new ImageData(width,height);pixelArea=0;
      for(let i=0;i<shown.length;i++)if(shown[i]){pixelArea++;const offset=i*4;pixels.data[offset]=46;pixels.data[offset+1]=158;pixels.data[offset+2]=91;pixels.data[offset+3]=46;}
      paint.getContext('2d').putImageData(pixels,0,0);
      const sceneContext=scene.getContext('2d');sceneContext.clearRect(0,0,width,height);sceneContext.drawImage(base,0,0);sceneContext.drawImage(paint,0,0);
      border=new Path2D();for(const [x0,y0,x1,y1]of selection.boundarySegments(shown,width,height)){border.moveTo(x0,y0);border.lineTo(x1,y1);}
      areaLabel.textContent=pixelArea.toLocaleString()+' px² selected';save.disabled=!pixelArea||!!drag;undo.disabled=!past.length;redo.disabled=!future.length;
      dialog.querySelector('[data-action="clear"]').disabled=!pixelArea;draw();
    }
    const animation=setInterval(()=>{if(pixelArea&&!reducedMotion.matches&&document.visibilityState==='visible')draw();},100);
    function finish(){
      if(closed)return;closed=true;clearInterval(animation);cancelAnimationFrame(previewFrame);dialog.close();dialog.remove();disposeCurrent=null;
      for(const target of [canvas,base,scene,paint])target.width=target.height=0;
      if(previous?.isConnected)previous.focus({preventScroll:true});
    }
    disposeCurrent=finish;
    function remember(){
      past.push(mask);const limit=Math.max(1,Math.min(8,Math.floor(24*1024*1024/mask.length)));while(past.length>limit)past.shift();future=[];
    }
    function commit(next){
      if(next.every((value,index)=>value===mask[index])){render();return;}
      remember();mask=next;render();
    }
    function apply(next,operation){commit(selection.combine(mask,next,operation));}
    function cancelDrag(){cancelAnimationFrame(previewFrame);previewFrame=0;drag=null;render();}
    function setTool(value){
      if(drag)cancelDrag();tool=value;lastWand=null;
      for(const button of dialog.querySelectorAll('[data-tool]'))button.setAttribute('aria-pressed',String(button.dataset.tool===tool));
      for(const element of dialog.querySelectorAll('[data-wand]'))element.hidden=tool!=='wand';
      dialog.querySelector('[data-circle]').hidden=tool!=='ellipse';canvas.style.cursor='crosshair';
    }
    const effective=event=>event.shiftKey&&event.altKey?'intersect':event.altKey?'subtract':event.shiftKey?'add':mode;
    const point=event=>{const rect=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(width,(event.clientX-rect.left)*width/rect.width)),y:Math.max(0,Math.min(height,(event.clientY-rect.top)*height/rect.height))};};
    function shapePoints(){
      if(drag?.tool!=='ellipse'||!dialog.querySelector('[data-circle-lock]').checked)return points;
      const first=points[0],last=points.at(-1),size=Math.min(Math.abs(last.x-first.x),Math.abs(last.y-first.y));return[first,{x:first.x+Math.sign(last.x-first.x)*size,y:first.y+Math.sign(last.y-first.y)*size}];
    }
    function refineWand(){
      dialog.querySelector('.reference-options output').textContent=tolerance.value;
      if(lastWand){const next=selection.combine(lastWand.base,selection.wand(image,lastWand.x,lastWand.y,Number(tolerance.value),contiguous.checked),lastWand.mode);if(!lastWand.recorded&&!next.every((value,index)=>value===mask[index])){remember();lastWand.recorded=true;}mask=next;render();}
    }
    for(const button of dialog.querySelectorAll('[data-tool]'))button.onclick=()=>setTool(button.dataset.tool);
    dialog.querySelector('[data-option="mode"]').onchange=event=>{if(drag)cancelDrag();mode=event.target.value;};
    tolerance.oninput=refineWand;contiguous.onchange=refineWand;
    for(const button of dialog.querySelectorAll('[data-action="cancel"]'))button.onclick=finish;
    undo.onclick=()=>{if(drag)cancelDrag();lastWand=null;if(!past.length)return;future.push(mask);mask=past.pop();render();};
    redo.onclick=()=>{if(drag)cancelDrag();lastWand=null;if(!future.length)return;past.push(mask);mask=future.pop();render();};
    dialog.querySelector('[data-action="all"]').onclick=()=>{lastWand=null;commit(new Uint8Array(mask.length).fill(1));};
    dialog.querySelector('[data-action="clear"]').onclick=()=>{lastWand=null;commit(new Uint8Array(mask.length));};
    dialog.querySelector('[data-action="invert"]').onclick=()=>{lastWand=null;commit(mask.map(value=>value?0:1));};
    save.onclick=()=>{if(drag||!selection.count(mask))return;const result={width,height,bits:selection.pack(mask),areaPixels:selection.count(mask)};finish();onSave(result);};
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
    dialog.addEventListener('keydown',event=>{
      event.stopPropagation();if(event.target.matches('input,select,textarea'))return;
      const key=event.key.toLowerCase(),command=event.ctrlKey||event.metaKey;
      if(command&&['z','y','a','d','i'].includes(key)){
        event.preventDefault();if(key==='z'||key==='y')(key==='y'||event.shiftKey?redo:undo).click();
        else dialog.querySelector('[data-action="'+({a:'all',d:'clear',i:'invert'}[key])+'"]').click();
      }else if(!command&&['m','l','w'].includes(key)){event.preventDefault();setTool({m:'rectangle',l:'lasso',w:'wand'}[key]);}
      else if(event.key==='Enter'&&!event.target.matches('button')){event.preventDefault();save.click();}
    });
    canvas.onpointerdown=event=>{
      if(event.button!==0)return;event.preventDefault();canvas.focus();canvas.setPointerCapture(event.pointerId);const location=point(event);
      if(tool==='wand'){const original=mask,operation=effective(event);apply(selection.wand(image,location.x,location.y,Number(tolerance.value),contiguous.checked),operation);lastWand={base:original,x:location.x,y:location.y,mode:operation,recorded:mask!==original};return;}
      lastWand=null;drag={tool,mode:effective(event)};points=[location,location];render();
    };
    canvas.onpointermove=event=>{
      if(!drag)return;const location=point(event);
      if(drag.tool==='lasso'){if(points.length<4096&&Math.hypot(location.x-points.at(-1).x,location.y-points.at(-1).y)>1)points.push(location);}else points[1]=location;
      cancelAnimationFrame(previewFrame);previewFrame=requestAnimationFrame(()=>{if(drag)render(selection.combine(mask,selection.shape(width,height,drag.tool,shapePoints()),drag.mode));});
    };
    canvas.onpointerup=event=>{
      if(!drag)return;const operation=drag;if(operation.tool!=='lasso')points[1]=point(event);const selected=shapePoints();cancelAnimationFrame(previewFrame);drag=null;
      if(operation.tool==='lasso'?selected.length>=3:Math.hypot(selected[1].x-selected[0].x,selected[1].y-selected[0].y)>1)apply(selection.shape(width,height,operation.tool,selected),operation.mode);else render();
      if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    };
    canvas.onpointercancel=canvas.onlostpointercapture=()=>{if(drag)cancelDrag();};
    setTool(tool);dialog.showModal();canvas.focus();render();
  }
  root.WormAreaEditor={open,close};
})(window);
