// Gera os mapas de ruas (máscaras SVG) a partir do OpenStreetMap, com a casa ao centro.
// Dados: curl https://overpass-api.de/api/interpreter --data-urlencode 'data=[out:json];way["highway"](39.8240,-7.2740,39.8460,-7.2460);out geom;' > osm.json
// Uso: node scripts/ruas.cjs osm.json public/img
const fs=require("fs");const d=JSON.parse(fs.readFileSync(process.argv[2]));const dest=process.argv[3];
const lat0=39.834889, lon0=-7.260222, R=6371000*Math.PI/180, c=Math.cos(lat0*Math.PI/180);
const P=p=>[Math.round((p.lon-lon0)*R*c),Math.round(-(p.lat-lat0)*R)];
const grupos={g:[],m:[],p:[]};
for(const w of d.elements){const h=w.tags.highway;
 const k=/^(primary|secondary|tertiary|trunk)/.test(h)?"g":/^(residential|unclassified|living_street|pedestrian)$/.test(h)?"m":/^(service|track|footway|path|steps|cycleway)$/.test(h)?"p":null; if(!k)continue;
 const pts=w.geometry.map(P),out=[pts[0]];for(const q of pts.slice(1)){const l=out[out.length-1];if(Math.hypot(q[0]-l[0],q[1]-l[1])>=4)out.push(q)}
 grupos[k].push("M"+out.map(q=>q.join(" ")).join("L"));}
const st={g:'stroke-width="2.6"',m:'stroke-width="1.4"',p:'stroke-width="1" stroke-opacity=".5"'};
const corpo=`<g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round">${["p","m","g"].map(k=>`<path vector-effect="non-scaling-stroke" ${st[k]} d="${grupos[k].join("")}"/>`).join("")}</g>`;
const ficheiro=(nome,vb)=>fs.writeFileSync(`${dest}/${nome}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="xMidYMid slice"><!-- Ruas: © contribuidores do OpenStreetMap (ODbL) -->${corpo}</svg>`);
ficheiro("ruas-faixa","-1200 -400 2400 800");
ficheiro("ruas-postal","-500 -500 1000 1000");
