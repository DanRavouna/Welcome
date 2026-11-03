async (target) => { const W=WORLD; const TS=W.TS;
      const goal=target; const start=[Math.floor(W.pos().x/TS), Math.floor(W.pos().y/TS)];
      const prev=new Map([[start.join(),null]]); const q=[start]; let found=null;
      while(q.length){ const [x,y]=q.shift(); if(x===goal[0]&&y===goal[1]){found=[x,y];break;} for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx, ny=y+dy, k=nx+','+ny; if(prev.has(k)||W.solidAt(nx,ny)) continue; prev.set(k,[x,y]); q.push([nx,ny]); } }
      if(!found) return 'no path';
      const path=[]; let c=found; while(c){ path.unshift(c); c=prev.get(c.join()); }
      for (const [tx,ty] of path) { for (let i=0;i<120;i++){ const p=W.pos(); const gx=(tx+0.5)*TS, gy=(ty+0.6)*TS; const dx=gx-p.x, dy=gy-p.y; if (Math.hypot(dx,dy)<3) break; const d=Math.hypot(dx,dy); W.input.jx=dx/d; W.input.jy=dy/d; W.step(1/60); } }
      W.input.jx=0; W.input.jy=0; W.step(1/60); const n=W.nearest(); return n ? (n.place? n.place.id : 'sign') : 'none'; }