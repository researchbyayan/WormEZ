const {test,expect}=require('@playwright/test');
const path=require('node:path');

test('camera chunks are written in recording order before finalization',async({page})=>{
  await page.goto('file://'+path.resolve('WormEZ.html'));
  await page.waitForFunction(()=>Boolean(window.__wormez));
  await page.evaluate(()=>{
    window.captureEvents=[];
    window.wormezDesktop={
      beginCapture:async()=>({id:'test-capture'}),
      appendCapture:async(_id,data)=>{window.captureEvents.push(new Uint8Array(data)[0]);},
      finishCapture:async()=>{window.captureEvents.push('finish');return{name:'test.webm',url:'data:video/webm;base64,'};},
      cancelCapture:async()=>({cancelled:true})
    };
    window.MediaRecorder=class{
      static isTypeSupported(){return true;}
      constructor(){this.state='inactive';window.testRecorder=this;}
      start(){this.state='recording';}
      stop(){this.state='inactive';queueMicrotask(()=>this.onstop?.());}
      emit(byte,delay){this.ondataavailable?.({data:{size:1,arrayBuffer:async()=>{await new Promise(resolve=>setTimeout(resolve,delay));return Uint8Array.of(byte).buffer;}}});}
    };
    window.__wormez.state.cameraStream={getTracks:()=>[]};
    document.getElementById('recordCamera').click();
  });
  await page.waitForFunction(()=>Boolean(window.testRecorder));
  await page.evaluate(()=>{window.testRecorder.emit(1,35);window.testRecorder.emit(2,0);window.testRecorder.stop();});
  await expect.poll(()=>page.evaluate(()=>window.captureEvents)).toEqual([1,2,'finish']);
});

test('loading another clip cancels an active camera capture',async({page})=>{
  await page.goto('file://'+path.resolve('WormEZ.html'));
  await page.waitForFunction(()=>Boolean(window.__wormez));
  await page.evaluate(()=>{
    window.captureEvents=[];
    window.wormezDesktop={
      beginCapture:async()=>({id:'old-capture'}),
      appendCapture:async()=>{window.captureEvents.push('write');},
      finishCapture:async()=>{window.captureEvents.push('finish');return{name:'old.webm',url:'data:video/webm;base64,'};},
      cancelCapture:async()=>{window.captureEvents.push('cancel');return{cancelled:true};}
    };
    window.MediaRecorder=class{
      static isTypeSupported(){return true;}
      constructor(){this.state='inactive';window.testRecorder=this;}
      start(){this.state='recording';}
      stop(){this.state='inactive';queueMicrotask(()=>this.onstop?.());}
      emit(){this.ondataavailable?.({data:{size:1,arrayBuffer:async()=>{await new Promise(resolve=>setTimeout(resolve,35));return Uint8Array.of(1).buffer;}}});}
    };
    window.__wormez.state.cameraStream={getTracks:()=>[]};
    document.getElementById('recordCamera').click();
  });
  await page.waitForFunction(()=>Boolean(window.testRecorder));
  await page.evaluate(()=>window.testRecorder.emit());
  await page.setInputFiles('#fileInput','samples/clean_worm.webm');
  await expect.poll(()=>page.evaluate(()=>window.captureEvents)).toContain('cancel');
  expect(await page.evaluate(()=>window.captureEvents.includes('finish'))).toBe(false);
  await page.waitForFunction(()=>window.__wormez.state.fileName==='clean_worm.webm');
  expect(await page.evaluate(()=>window.__wormez.state.cameraSession)).toBeNull();
});

test('closing camera returns to an empty workspace',async({page})=>{
  await page.goto('file://'+path.resolve('WormEZ.html'));
  await page.waitForFunction(()=>Boolean(window.__wormez));
  await page.evaluate(()=>{
    const state=window.__wormez.state;
    state.cameraStream={getTracks:()=>[{stop(){window.cameraTrackStopped=true;}}]};
    state.loaded=true;state.isCamera=true;
    document.getElementById('emptyState').classList.add('hide');
    document.getElementById('closeCamera').click();
  });
  expect(await page.evaluate(()=>({loaded:window.__wormez.state.loaded,stream:window.__wormez.state.cameraStream,stopped:window.cameraTrackStopped,empty:document.getElementById('emptyState').classList.contains('hide'),phase:window.__wormez.state.workflowPhase}))).toEqual({loaded:false,stream:null,stopped:true,empty:false,phase:'idle'});
});
