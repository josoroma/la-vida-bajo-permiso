export const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function backCover(book,theme='dark'){
 const bg=theme==='dark'?'#141414':'#fafafa',fg=theme==='dark'?'#f6f6f6':'#171717',blue=theme==='dark'?'#8bb5ff':'#2443bb';
 const lines=[
 'Una empresa puede conservar a su dueño y perder su',
 'independencia. Una mayoría puede ganar una votación',
 'y negar a otros el derecho a disentir. Una promesa de',
 'protección puede terminar decidiendo quién trabaja,',
 'quién pertenece y quién debe desaparecer.',
 '',
 'La vida bajo permiso examina el fascismo desde las',
 'libertades concretas de las personas. Recorre su historia,',
 'los negocios del privilegio y las alianzas que convierten',
 'la economía en un instrumento de subordinación.',
 'Después lleva esas preguntas al mundo de los datos,',
 'las plataformas y las decisiones automatizadas.',
 '',
 'La libertad también se mide por lo que podemos hacer',
 'cuando no estamos de acuerdo.'
 ];
 return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200" role="img" aria-labelledby="back-title back-desc"><title id="back-title">${escape(book.title)}. Contraportada.</title><desc id="back-desc">Sinopsis y dedicatoria a Isa Orozco Gros-Desormeaux.</desc><rect width="800" height="1200" fill="${bg}"/><path d="M42 55V1145" stroke="${blue}" stroke-width="2"/><text x="80" y="90" fill="${fg}" font-family="Arial,sans-serif" font-size="12" letter-spacing="3">LA VIDA BAJO PERMISO · 2026</text><g fill="${fg}" font-family="Georgia,serif"><text x="78" y="190" font-size="49" letter-spacing="-1">¿Cuánta vida cabe</text><text x="78" y="250" font-size="49" letter-spacing="-1">en una autorización?</text>${lines.map((line,i)=>`<text x="80" y="${345+i*33}" font-size="23">${escape(line)}</text>`).join('')}<path d="M80 940H715" stroke="${fg}" opacity=".25"/><text x="80" y="998" font-size="22" font-style="italic">A la persona más increíble de mi vida, mi hija:</text><text x="80" y="1040" font-size="24">Isa Orozco Gros-Desormeaux.</text></g><text x="80" y="1140" fill="${blue}" font-family="Arial,sans-serif" font-size="11" letter-spacing="2">FASCISMO, PRIVILEGIOS Y LIBERTAD EN EL SIGLO XXI</text></svg>`;
}
export function motif(number,part=false){
 const id=(part?'parte-':'capitulo-')+String(number).padStart(2,'0');
 const gate=230+(number%4)*125,open=105+(number%3)*20;
 let lines='';
 for(let i=0;i<23;i++){const y=12+i*9;const pinch=116+(i-11)*(2.2+number%3);lines+=`<path d="M0 ${y} C${gate*.45} ${y},${gate*.7} ${pinch},${gate} ${pinch} S${gate+150} ${y},900 ${y}" opacity="${.18+(i%4)*.06}"/>`}
 return `<svg class="chapter-motif" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 230" role="img" aria-labelledby="${id}-motif-title"><title id="${id}-motif-title">Variación ${number} de La trama y el cerco: una metáfora de autonomía y límites.</title><g fill="none" stroke="currentColor" stroke-width=".7">${lines}</g><path d="M${gate-6} 0h12v${open-38}h-12z M${gate-6} ${open+38}h12v${230-open-38}h-12z" fill="var(--primary,#2443bb)"/><path d="M${gate+20} 0v${open-38} M${gate+20} ${open+38}V230" stroke="var(--link,#2443bb)" stroke-width=".75"/></svg>`;
}
export function artwork(id='cover'){
 let paths='';
 for(let i=0;i<54;i++){
  const y=80+i*11.4, pinch=342+(i-27)*1.25;
  paths+=`<path d="M -25 ${y} C 135 ${y-72}, 206 ${pinch-75}, 333 ${pinch} C 449 ${pinch+75}, 505 ${y+65}, 755 ${y+8}" opacity="${.17+(i%5)*.065}"/>`;
 }
 let grid='';for(let i=0;i<10;i++)grid+=`<path d="M ${70+i*66} 70 V 700 M 40 ${100+i*66} H 680"/>`;
 return `<svg class="artwork" viewBox="0 0 720 780" xmlns="http://www.w3.org/2000/svg" aria-labelledby="${id}-title ${id}-desc" role="img"><title id="${id}-title">La trama y el cerco</title><desc id="${id}-desc">Decenas de líneas independientes se estrechan al pasar por una abertura en una estructura azul. Una metáfora de la vida sometida a permiso.</desc><g class="ink" fill="none" stroke-width=".5" opacity=".07">${grid}</g><g transform="translate(0 35)" class="ink" fill="none" stroke-width="1.1">${paths}</g><path class="blue" d="M 310 107 L 487 167 L 487 611 L 310 671 L 310 457 L 399 424 L 399 345 L 310 315 Z"/><path class="edge" fill="none" stroke-width=".8" d="M 310 107 L 260 127 L 260 321 L 310 315 M 260 479 L 260 652 L 310 671 M 487 167 L 437 187 L 437 594 L 487 611 M 260 127 L 437 187 M 260 652 L 437 594" opacity=".75"/><path class="paper" d="M 310 315 L 399 345 L 399 424 L 310 457 Z"/><g class="ink" fill="none" stroke-width=".8">${Array.from({length:25},(_,i)=>`<path d="M 303 ${337+i*3.6} Q 352 ${345+i*3.5} 405 ${356+i*2.6}" opacity=".6"/>`).join('')}</g><g class="ink" fill="none" opacity=".35"><path d="M 106 119 h 20 M 116 109 v 20 M 604 660 h 20 M 614 650 v 20"/></g></svg>`;
}
export function cover(book,theme='dark'){
 const bg=theme==='dark'?'#141414':'#fafafa',fg=theme==='dark'?'#f6f6f6':'#171717';
 const art=artwork('cover-export').replace('<svg class="artwork"','<svg x="35" y="330" width="730" height="790"');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200" role="img" aria-labelledby="title desc"><title id="title">${escape(book.title)}. Portada ${theme==='dark'?'oscura':'clara'}.</title><desc id="desc">Cubierta editorial con título, subtítulo y la ilustración La trama y el cerco.</desc><style>.ink{stroke:${fg}}.blue{fill:#2545c2}.paper{fill:${bg}}.edge{stroke:#6e8fff}text{fill:${fg};font-family:Georgia,serif}</style><rect width="800" height="1200" fill="${bg}"/><text x="60" y="62" font-family="Arial,sans-serif" font-size="12" letter-spacing="3">ENSAYO · 2026</text><text x="57" y="157" font-size="76" letter-spacing="-3">La vida</text><text x="57" y="240" font-size="76" letter-spacing="-3">bajo permiso</text><text x="62" y="294" font-size="20">Fascismo, privilegios y libertad en el siglo XXI</text>${art}<line x1="60" y1="1120" x2="740" y2="1120" stroke="${fg}" opacity=".25"/><text x="60" y="1160" font-size="17">${escape(book.author||'La vida bajo permiso')}</text><text x="740" y="1160" text-anchor="end" font-family="Arial,sans-serif" font-size="11" letter-spacing="2">EDICIÓN DIGITAL</text></svg>`;
}
export function diagramSvg(f,standalone=false){
 const nodeById=new Map(f.nodes.map(x=>[x.id,x]));
 const edges=f.edges.map((x,i)=>{
  const a=nodeById.get(x.from),b=nodeById.get(x.to);let sx=a.x,sy=a.y,tx=b.x,ty=b.y;
  const horizontal=Math.abs(tx-sx)>Math.abs(ty-sy);
  if(horizontal){sx+=Math.sign(tx-sx)*83;tx-=Math.sign(tx-a.x)*87}else{sy+=Math.sign(ty-sy)*28;ty-=Math.sign(ty-a.y)*32}
  const mx=(sx+tx)/2,my=(sy+ty)/2;
  const spanning=a.y===b.y&&Math.abs(a.x-b.x)>300;
  const route=spanning?`M ${a.x} ${a.y+28} V 132 H ${b.x} V ${b.y+32}`:`M ${sx} ${sy} L ${tx} ${ty}`;
  const ly=spanning?124:a.y===b.y?a.y-40:my-9;
  return `<path class="edge" d="${route}" stroke-width="1" marker-end="url(#${f.id}-arrow)"/><text class="edge-label" x="${mx}" y="${ly}" text-anchor="middle">${escape(x.label)}</text>`;
 }).join('');
 const nodes=f.nodes.map(x=>{
  const lines=[''];for(const word of x.label.split(' ')){const i=lines.length-1;if(lines[i]&&lines[i].length+word.length+1>18)lines.push(word);else lines[i]+=(lines[i]?' ':'')+word;}
  return `<g data-node="${escape(x.id)}" data-description="${escape(x.description)}" data-label="${escape(x.label)}" aria-label="${escape(x.label)}"><rect class="node-rect" x="${x.x-85}" y="${x.y-27}" width="170" height="54" rx="4"/><circle class="node-dot" cx="${x.x-68}" cy="${x.y}" r="3"/><text class="node-label" text-anchor="middle">${lines.map((line,i)=>`<tspan x="${x.x+8}" y="${x.y+4-(lines.length-1)*7.5+i*15}">${escape(line)}</tspan>`).join('')}</text></g>`;
 }).join('');
 const styles=standalone?'<style>text{font-family:Arial,sans-serif;fill:#171717}.node-rect{fill:#fff;stroke:#ccc}.node-label{font-size:13px}.node-dot{fill:#24735b}.edge{stroke:#666;fill:none}.edge-label{font-size:10px;fill:#555;paint-order:stroke;stroke:#fafafa;stroke-width:4px;stroke-linejoin:round}</style><rect width="670" height="290" fill="#fafafa"/>':'';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 670 290" width="670" height="290" role="group" aria-labelledby="${f.id}-title ${f.id}-desc"><title id="${f.id}-title">${escape(f.title)}</title><desc id="${f.id}-desc">${escape(f.question)} ${f.edges.map(x=>`${nodeById.get(x.from).label}: ${x.label}, hacia ${nodeById.get(x.to).label}.`).join(' ')}</desc>${styles}<defs><marker id="${f.id}-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 8 4 L 0 8 Z" fill="${standalone?'#666':'var(--muted-foreground)'}"/></marker></defs>${edges}${nodes}</svg>`;
}
