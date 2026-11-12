(function(root){
  'use strict';
  const units={mm:1,cm:10,um:.001,in:25.4};
  const presets={};
  function calibrate(value,unit,points){
    if(!Number.isFinite(value)||value<=0||!units[unit]||points.length!==2)return null;
    const pixels=Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y);
    const ratio=value*units[unit]/pixels;
    return pixels>=4&&Number.isFinite(ratio)&&ratio>0?ratio:null;
  }
  function fields(p,step,cumulative,speed,mmPerPixel,unit){
    const factor=mmPerPixel?mmPerPixel/units[unit]:null;
    return{physical_unit:factor?(unit==='um'?'µm':unit):'',x_physical:factor?p.x*factor:'',y_physical:factor?p.y*factor:'',step_physical:factor&&step!==''?step*factor:'',cumulative_physical:factor?cumulative*factor:'',speed_physical_per_s:factor&&speed!==''?speed*factor:''};
  }
  root.WormScale={units,presets,calibrate,fields};if(typeof module!=='undefined')module.exports=root.WormScale;
})(typeof window==='undefined'?globalThis:window);
