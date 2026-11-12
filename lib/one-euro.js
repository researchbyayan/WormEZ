/* Display-only One Euro filtering. Input points and their metadata are never mutated. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WormOneEuro = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const alpha = (cutoff, dt) => {
    const tau = 1 / (2 * Math.PI * cutoff);
    return dt / (dt + tau);
  };
  function filterSegment(points, fps, bodyLength, options = {}) {
    if (!Array.isArray(points) || points.length < 2) return (points || []).map(p => ({ ...p }));
    const hz = Number.isFinite(fps) && fps > 0 ? fps : 30;
    const length = Number.isFinite(bodyLength) && bodyLength > 0 ? bodyLength : 1;
    const minCutoff = options.minCutoff ?? 2;
    const beta = options.beta ?? 0.35;
    const derivativeCutoff = options.derivativeCutoff ?? 1;
    let previous = null, derivative = { x: 0, y: 0 };
    return points.map((point, index) => {
      const raw = { x: point.x / length, y: point.y / length };
      const before = points[index - 1], after = points[index + 1];
      let sharpTurn = false;
      if (before && after) {
        const ax = point.x - before.x, ay = point.y - before.y;
        const bx = after.x - point.x, by = after.y - point.y;
        const am = Math.hypot(ax, ay), bm = Math.hypot(bx, by);
        const cosine = (ax * bx + ay * by) / (am * bm);
        // Alternating stationary noise is a 180° reversal, not a path corner.
        sharpTurn = am > length * .12 && bm > length * .12 &&
          cosine < Math.cos(Math.PI / 6) && cosine > Math.cos(5 * Math.PI / 6);
      }
      // Explicit corrections are exact and begin a new filter history.
      if (!previous || point.origin === 'manual' || sharpTurn) {
        previous = { raw, filtered: raw, frame: point.frame };
        derivative = { x: 0, y: 0 };
        return { ...point };
      }
      const dt = Math.max(1 / hz, (point.frame - previous.frame) / hz);
      const aD = alpha(derivativeCutoff, dt);
      const nextDerivative = {
        x: aD * (raw.x - previous.raw.x) / dt + (1 - aD) * derivative.x,
        y: aD * (raw.y - previous.raw.y) / dt + (1 - aD) * derivative.y
      };
      const cutoff = minCutoff + beta * Math.hypot(nextDerivative.x, nextDerivative.y);
      const a = alpha(cutoff, dt);
      const filtered = {
        x: a * raw.x + (1 - a) * previous.filtered.x,
        y: a * raw.y + (1 - a) * previous.filtered.y
      };
      previous = { raw, filtered, frame: point.frame };
      derivative = nextDerivative;
      return { ...point, x: filtered.x * length, y: filtered.y * length };
    });
  }
  // Offline display smoother: symmetric local linear fit avoids causal lag.
  // Bounds displacement, preserves endpoints/corrections/meaningful turns and
  // never reads through a gap or an accepted manual anchor.
  function smoothSegment(points,fps,bodyLength){
    const L=Number.isFinite(bodyLength)&&bodyLength>0?bodyLength:20,n=points.length;
    const out=points.map(p=>({...p}));
    for(let i=1;i<n-1;i++){
      const p=points[i];if(p.origin==='manual')continue;
      let left=i,right=i;
      while(left>0&&i-left<5&&points[left].origin!=='manual'&&points[left].frame-points[left-1].frame===1)left--;
      while(right<n-1&&right-i<5&&points[right].origin!=='manual'&&points[right+1].frame-points[right].frame===1)right++;
      const a=points[left],b=points[right],ux=points[i-1].x-a.x,uy=points[i-1].y-a.y,vx=b.x-points[i+1].x,vy=b.y-points[i+1].y;
      const am=Math.hypot(ux,uy),bm=Math.hypot(vx,vy),cos=(ux*vx+uy*vy)/(am*bm);
      if(am>L*.15&&bm>L*.15&&cos<Math.cos(Math.PI/6)&&cos>Math.cos(5*Math.PI/6))continue;
      // Spread weight across the existing ±5-frame window; overly central
      // weighting left short-period pixel jitter visible when magnified.
      let w=0,t=0,tt=0,x=0,y=0,tx=0,ty=0;
      for(let j=left;j<=right;j++){const dt=points[j].frame-p.frame,k=Math.exp(-dt*dt/18);w+=k;t+=k*dt;tt+=k*dt*dt;x+=k*points[j].x;y+=k*points[j].y;tx+=k*dt*points[j].x;ty+=k*dt*points[j].y;}
      const den=w*tt-t*t;if(den<=1e-9)continue;
      const q={x:(x*tt-tx*t)/den,y:(y*tt-ty*t)/den},d=Math.hypot(q.x-p.x,q.y-p.y),scale=d>L*.08?L*.08/d:1;
      if(d<1e-9)continue;
      out[i].x=p.x+(q.x-p.x)*scale;out[i].y=p.y+(q.y-p.y)*scale;
    }
    return out;
  }
  return { filterSegment,smoothSegment };

});
