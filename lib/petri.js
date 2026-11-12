/* A detector box is only a search region; calibration uses a confirmed rim. */
(function(root){
  function valid(e,width,height){
    if(!e||!['x','y','width','height','angle'].every(k=>Number.isFinite(e[k]))||e.width<4||e.height<4)return false;
    const rx=Math.hypot(e.width/2*Math.cos(e.angle),e.height/2*Math.sin(e.angle));
    const ry=Math.hypot(e.width/2*Math.sin(e.angle),e.height/2*Math.cos(e.angle));
    return e.x-rx>=1&&e.y-ry>=1&&e.x+rx<=width-1&&e.y+ry<=height-1;
  }
  function fit(cv,pixels,box){
    const image=cv.matFromImageData(pixels),gray=new cv.Mat(),edges=new cv.Mat(),contours=new cv.MatVector(),hierarchy=new cv.Mat();
    try{
      cv.cvtColor(image,gray,cv.COLOR_RGBA2GRAY);cv.GaussianBlur(gray,gray,new cv.Size(5,5),1.2);cv.Canny(gray,edges,40,120);
      cv.findContours(edges,contours,hierarchy,cv.RETR_LIST,cv.CHAIN_APPROX_SIMPLE);
      const candidates=[];
      for(let i=0;i<contours.size();i++){
        const contour=contours.get(i);
        try{
          if(contour.rows<20)continue;
          const e=cv.fitEllipse(contour),a=e.size.width,b=e.size.height,c=e.center;
          if(!Number.isFinite(a*b)||Math.min(a,b)/Math.max(a,b)<.65)continue;
          if(a*b<box.width*box.height*.45||a*b>box.width*box.height*1.35)continue;
          if(Math.hypot(c.x-box.x-box.width/2,c.y-box.y-box.height/2)>Math.max(box.width,box.height)*.15)continue;
          const angle=e.angle*Math.PI/180,cs=Math.cos(angle),sn=Math.sin(angle);let error=0;
          const points=contour.data32S;
          for(let j=0;j<points.length;j+=2){const x=points[j]-c.x,y=points[j+1]-c.y;error+=Math.abs(Math.hypot((x*cs+y*sn)/(a/2),(-x*sn+y*cs)/(b/2))-1);}
          error/=points.length/2;
          if(error>.08)continue;
          const ellipse={x:c.x,y:c.y,width:a,height:b,angle,error};
          if(valid(ellipse,pixels.width,pixels.height))candidates.push(ellipse);
        }finally{contour.delete();}
      }
      return candidates.sort((a,b)=>a.error-b.error)[0]||null;
    }finally{image.delete();gray.delete();edges.delete();contours.delete();hierarchy.delete();}
  }
  function fromPoints(cv,points){
    if(points.length<5)return null;
    const mat=cv.matFromArray(points.length,1,cv.CV_32FC2,points.flatMap(p=>[p.x,p.y]));
    try{
      const fit=cv.fitEllipse(mat),e={x:fit.center.x,y:fit.center.y,width:fit.size.width,height:fit.size.height,angle:fit.angle*Math.PI/180};
      if(!Object.values(e).every(Number.isFinite)||Math.min(e.width,e.height)<8)return null;
      const cs=Math.cos(e.angle),sn=Math.sin(e.angle),angles=[];let error=0;
      for(const p of points){const x=p.x-e.x,y=p.y-e.y,u=(x*cs+y*sn)/(e.width/2),v=(-x*sn+y*cs)/(e.height/2);angles.push(Math.atan2(v,u));error+=Math.abs(Math.hypot(u,v)-1);}
      angles.sort((a,b)=>a-b);let gap=angles[0]+Math.PI*2-angles.at(-1);
      for(let i=1;i<angles.length;i++)gap=Math.max(gap,angles[i]-angles[i-1]);
      if(gap>Math.PI||error/points.length>.05)return null;
      return {...e,manual:true};
    }catch{return null;}finally{mat.delete();}
  }
  function ratio(ellipse,value,unit,measure){
    if(!ellipse||!Number.isFinite(value)||value<=0||!root.WormScale.units[unit])return null;
    const a=ellipse.width,b=ellipse.height;
    if(!Number.isFinite(a)||!Number.isFinite(b)||a<4||b<4||!['area','diameter'].includes(measure||'diameter'))return null;
    // A tilted circular dish needs perspective correction before metric calibration.
    if(Math.min(a,b)/Math.max(a,b)<.92)return null;
    const mm=root.WormScale.units[unit];
    return measure==='area'?Math.sqrt(value*mm*mm/(Math.PI*a*b/4)):value*mm/((a+b)/2);
  }
  root.WormPetri={fit,ratio,valid,fromPoints};if(typeof module!=='undefined')module.exports={fit,ratio,valid,fromPoints};
})(typeof window==='undefined'?globalThis:window);
