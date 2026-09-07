import{Box3 as $,Matrix4 as O,BufferAttribute as ft,Vector3 as D,Vector2 as X,Plane as qn,Line3 as st,Triangle as G,REVISION as kt,BackSide as Wn,DoubleSide as ps,Ray as Ot,FrontSide as je,BufferGeometry as xt,Sphere as $n,Mesh as qt,Object3D as hs,Group as ms,LineBasicMaterial as ys,MeshBasicMaterial as xs,Line as Xn,LineSegments as Yn,LineLoop as Zn,Points as Kn,BatchedMesh as gs,RGBAFormat as fe,RGFormat as bs,RedFormat as vs,RGBAIntegerFormat as Je,RGIntegerFormat as Gn,RedIntegerFormat as ws,DataTexture as Qe,NearestFilter as _t,IntType as de,UnsignedIntType as Wt,FloatType as $t,UnsignedByteType as jn,UnsignedShortType as As,ByteType as Jn,ShortType as Bs,Vector4 as tn,Matrix3 as Ts}from"three";const en=0,Qn=1,ti=2,j=0,rt=1,nn=2,pe=1.25,sn=1,q=32,L=q/4,on=65535,Ps=on<<16,he=Math.pow(2,-24),St=Symbol("SKIP_GENERATION"),ei={strategy:en,maxDepth:40,targetLeafSize:10,useSharedArrayBuffer:!1,setBoundingBox:!0,onProgress:null,indirect:!1,verbose:!0,range:null,[St]:!1};function V(i,t,e){return e.min.x=t[i],e.min.y=t[i+1],e.min.z=t[i+2],e.max.x=t[i+3],e.max.y=t[i+4],e.max.z=t[i+5],e}function ur(i){i[0]=i[1]=i[2]=1/0,i[3]=i[4]=i[5]=-1/0}function rn(i){let t=-1,e=-1/0;for(let n=0;n<3;n++){const s=i[n+3]-i[n];s>e&&(e=s,t=n)}return t}function ni(i,t){t.set(i)}function ii(i,t,e){let n,s;for(let r=0;r<3;r++){const o=r+3;n=i[r],s=t[r],e[r]=n<s?n:s,n=i[o],s=t[o],e[o]=n>s?n:s}}function me(i,t,e){for(let n=0;n<3;n++){const s=t[i+2*n],r=t[i+2*n+1],o=s-r,l=s+r;o<e[n]&&(e[n]=o),l>e[n+3]&&(e[n+3]=l)}}function Xt(i){const t=i[3]-i[0],e=i[4]-i[1],n=i[5]-i[2];return 2*(t*e+e*n+n*t)}function R(i,t){return t[i+15]===on}function H(i,t){return t[i+6]}function Y(i,t){return t[i+14]}function U(i){return i+L}function k(i,t){const e=t[i+6];return i+e*L}function ye(i,t){return t[i+7]}function fr(i){return i}function cn(i,t,e,n,s){let r=1/0,o=1/0,l=1/0,c=-1/0,u=-1/0,f=-1/0,a=1/0,d=1/0,p=1/0,y=-1/0,g=-1/0,v=-1/0;const w=i.offset||0;for(let h=(t-w)*6,m=(t+e-w)*6;h<m;h+=6){const x=i[h+0],b=i[h+1],B=x-b,A=x+b;B<r&&(r=B),A>c&&(c=A),x<a&&(a=x),x>y&&(y=x);const P=i[h+2],_=i[h+3],T=P-_,S=P+_;T<o&&(o=T),S>u&&(u=S),P<d&&(d=P),P>g&&(g=P);const I=i[h+4],M=i[h+5],z=I-M,E=I+M;z<l&&(l=z),E>f&&(f=E),I<p&&(p=I),I>v&&(v=I)}n[0]=r,n[1]=o,n[2]=l,n[3]=c,n[4]=u,n[5]=f,s[0]=a,s[1]=d,s[2]=p,s[3]=y,s[4]=g,s[5]=v}const ct=32,Is=(i,t)=>i.candidate-t.candidate,dt=new Array(ct).fill().map(()=>({count:0,bounds:new Float32Array(6),rightCacheBounds:new Float32Array(6),leftCacheBounds:new Float32Array(6),candidate:0})),xe=new Float32Array(6);function _s(i,t,e,n,s,r){let o=-1,l=0;if(r===en)o=rn(t),o!==-1&&(l=(t[o]+t[o+3])/2);else if(r===Qn)o=rn(i),o!==-1&&(l=Ss(e,n,s,o));else if(r===ti){const c=Xt(i);let u=pe*s;const f=e.offset||0,a=(n-f)*6,d=(n+s-f)*6;for(let p=0;p<3;p++){const y=t[p],w=(t[p+3]-y)/ct;if(s<ct/4){const h=[...dt];h.length=s;let m=0;for(let b=a;b<d;b+=6,m++){const B=h[m];B.candidate=e[b+2*p],B.count=0;const{bounds:A,leftCacheBounds:P,rightCacheBounds:_}=B;for(let T=0;T<3;T++)_[T]=1/0,_[T+3]=-1/0,P[T]=1/0,P[T+3]=-1/0,A[T]=1/0,A[T+3]=-1/0;me(b,e,A)}h.sort(Is);let x=s;for(let b=0;b<x;b++){const B=h[b];for(;b+1<x&&h[b+1].candidate===B.candidate;)h.splice(b+1,1),x--}for(let b=a;b<d;b+=6){const B=e[b+2*p];for(let A=0;A<x;A++){const P=h[A];B>=P.candidate?me(b,e,P.rightCacheBounds):(me(b,e,P.leftCacheBounds),P.count++)}}for(let b=0;b<x;b++){const B=h[b],A=B.count,P=s-B.count,_=B.leftCacheBounds,T=B.rightCacheBounds;let S=0;A!==0&&(S=Xt(_)/c);let I=0;P!==0&&(I=Xt(T)/c);const M=sn+pe*(S*A+I*P);M<u&&(o=p,u=M,l=B.candidate)}}else{for(let x=0;x<ct;x++){const b=dt[x];b.count=0,b.candidate=y+w+x*w;const B=b.bounds;for(let A=0;A<3;A++)B[A]=1/0,B[A+3]=-1/0}for(let x=a;x<d;x+=6){let A=~~((e[x+2*p]-y)/w);A>=ct&&(A=ct-1);const P=dt[A];P.count++,me(x,e,P.bounds)}const h=dt[ct-1];ni(h.bounds,h.rightCacheBounds);for(let x=ct-2;x>=0;x--){const b=dt[x],B=dt[x+1];ii(b.bounds,B.rightCacheBounds,b.rightCacheBounds)}let m=0;for(let x=0;x<ct-1;x++){const b=dt[x],B=b.count,A=b.bounds,_=dt[x+1].rightCacheBounds;B!==0&&(m===0?ni(A,xe):ii(A,xe,xe)),m+=B;let T=0,S=0;m!==0&&(T=Xt(xe)/c);const I=s-m;I!==0&&(S=Xt(_)/c);const M=sn+pe*(T*m+S*I);M<u&&(o=p,u=M,l=b.candidate)}}}}else console.warn(`BVH: Invalid build strategy value ${r} used.`);return{axis:o,pos:l}}function Ss(i,t,e,n){let s=0;const r=i.offset;for(let o=t,l=t+e;o<l;o++)s+=i[(o-r)*6+n*2];return s/e}class an{constructor(){this.boundingData=new Float32Array(6)}}function Ms(i,t,e,n,s,r){let o=n,l=n+s-1;const c=r.pos,u=r.axis*2,f=e.offset||0;for(;;){for(;o<=l&&e[(o-f)*6+u]<c;)o++;for(;o<=l&&e[(l-f)*6+u]>=c;)l--;if(o<l){for(let a=0;a<t;a++){let d=i[o*t+a];i[o*t+a]=i[l*t+a],i[l*t+a]=d}for(let a=0;a<6;a++){const d=o-f,p=l-f,y=e[d*6+a];e[d*6+a]=e[p*6+a],e[p*6+a]=y}o++,l--}else return o}}let si,ge,ln,oi;const Ds=Math.pow(2,32);function un(i){return"count"in i?1:1+un(i.left)+un(i.right)}function zs(i,t,e){return si=new Float32Array(e),ge=new Uint32Array(e),ln=new Uint16Array(e),oi=new Uint8Array(e),fn(i,t)}function fn(i,t){const e=i/4,n=i/2,s="count"in t,r=t.boundingData;for(let o=0;o<6;o++)si[e+o]=r[o];if(s)return t.buffer?(oi.set(new Uint8Array(t.buffer),i),i+t.buffer.byteLength):(ge[e+6]=t.offset,ln[n+14]=t.count,ln[n+15]=on,i+q);{const{left:o,right:l,splitAxis:c}=t,u=i+q;let f=fn(u,o);const a=i/q,p=f/q-a;if(p>Ds)throw new Error("MeshBVH: Cannot store relative child node offset greater than 32 bits.");return ge[e+6]=p,ge[e+7]=c,fn(f,l)}}function Es(i,t,e,n,s,r){const{maxDepth:o,verbose:l,targetLeafSize:c,_strictLeafSize:u=1/0,strategy:f,onProgress:a}=s,d=i.primitiveBuffer,p=i.primitiveBufferStride,y=new Float32Array(6);let g=!1;const v=new an;return cn(t,e,n,v.boundingData,y),h(v,e,n,y),v;function w(m){a&&a((m-r.offset)/r.count)}function h(m,x,b,B=null,A=0){!g&&A>=o&&(g=!0,l&&console.warn(`BVH: Max depth of ${o} reached when generating BVH. Consider increasing maxDepth.`));const P=b>u;if(b<=c&&!P||A>=o)return w(x+b),m.offset=x,m.count=b,m;const _=_s(m.boundingData,B,t,x,b,f);let T=_.axis===-1?-1:Ms(d,p,t,x,b,_);if(_.axis===-1||T===x||T===x+b){if(!P)return w(x+b),m.offset=x,m.count=b,m;_.axis=Math.max(0,rn(m.boundingData)),T=x+Math.max(1,Math.floor(b/2))}m.splitAxis=_.axis;const S=new an,I=x,M=T-x;m.left=S,cn(t,I,M,S.boundingData,y),h(S,I,M,y,A+1);const z=new an,E=T,F=b-M;return m.right=z,cn(t,E,F,z.boundingData,y),h(z,E,F,y,A+1),m}}function Vs(i,t){const e=t.useSharedArrayBuffer?SharedArrayBuffer:ArrayBuffer,n=i.getRootRanges(t.range),s=n[0],r=n[n.length-1],o={offset:s.offset,count:r.offset+r.count-s.offset},l=new Float32Array(6*o.count);l.offset=o.offset,i.computePrimitiveBounds(o.offset,o.count,l),i._roots=n.map(c=>{const u=Es(i,l,c.offset,c.count,t,o),f=un(u),a=new e(q*f);return zs(0,u,a),a})}class Yt{constructor(t){this._getNewPrimitive=t,this._primitives=[]}getPrimitive(){const t=this._primitives;return t.length===0?this._getNewPrimitive():t.pop()}releasePrimitive(t){this._primitives.push(t)}}class Cs{constructor(){this.float32Array=null,this.uint16Array=null,this.uint32Array=null;const t=[];let e=null;this.setBuffer=n=>{e&&t.push(e),e=n,this.float32Array=new Float32Array(n),this.uint16Array=new Uint16Array(n),this.uint32Array=new Uint32Array(n)},this.clearBuffer=()=>{e=null,this.float32Array=null,this.uint16Array=null,this.uint32Array=null,t.length!==0&&this.setBuffer(t.pop())}}}const C=new Cs;let pt,Mt;const Dt=[],be=new Yt(()=>new $);function Fs(i,t,e,n,s,r){pt=be.getPrimitive(),Mt=be.getPrimitive(),Dt.push(pt,Mt),C.setBuffer(i._roots[t]);const o=dn(0,i.geometry,e,n,s,r);C.clearBuffer(),be.releasePrimitive(pt),be.releasePrimitive(Mt),Dt.pop(),Dt.pop();const l=Dt.length;return l>0&&(Mt=Dt[l-1],pt=Dt[l-2]),o}function dn(i,t,e,n,s=null,r=0,o=0){const{float32Array:l,uint16Array:c,uint32Array:u}=C;let f=i*2;if(R(f,c)){const d=H(i,u),p=Y(f,c);return V(i,l,pt),n(d,p,!1,o,r+i/L,pt)}else{let T=function(I){const{uint16Array:M,uint32Array:z}=C;let E=I*2;for(;!R(E,M);)I=U(I),E=I*2;return H(I,z)},S=function(I){const{uint16Array:M,uint32Array:z}=C;let E=I*2;for(;!R(E,M);)I=k(I,z),E=I*2;return H(I,z)+Y(E,M)};const d=U(i),p=k(i,u);let y=d,g=p,v,w,h,m;if(s&&(h=pt,m=Mt,V(y,l,h),V(g,l,m),v=s(h),w=s(m),w<v)){y=p,g=d;const I=v;v=w,w=I,h=m}h||(h=pt,V(y,l,h));const x=R(y*2,c),b=e(h,x,v,o+1,r+y/L);let B;if(b===nn){const I=T(y),z=S(y)-I;B=n(I,z,!0,o+1,r+y/L,h)}else B=b&&dn(y,t,e,n,s,r,o+1);if(B)return!0;m=Mt,V(g,l,m);const A=R(g*2,c),P=e(m,A,w,o+1,r+g/L);let _;if(P===nn){const I=T(g),z=S(g)-I;_=n(I,z,!0,o+1,r+g/L,m)}else _=P&&dn(g,t,e,n,s,r,o+1);return!!_}}const Zt=new C.constructor,ve=new C.constructor,ht=new Yt(()=>new $),zt=new $,Et=new $,pn=new $,hn=new $;let mn=!1;function Rs(i,t,e,n){if(mn)throw new Error("MeshBVH: Recursive calls to bvhcast not supported.");mn=!0;const s=i._roots,r=t._roots;let o,l=0,c=0;const u=new O().copy(e).invert();for(let f=0,a=s.length;f<a;f++){Zt.setBuffer(s[f]),c=0;const d=ht.getPrimitive();V(0,Zt.float32Array,d),d.applyMatrix4(u);for(let p=0,y=r.length;p<y&&(ve.setBuffer(r[p]),o=it(0,0,e,u,n,l,c,0,0,d),ve.clearBuffer(),c+=r[p].byteLength/q,!o);p++);if(ht.releasePrimitive(d),Zt.clearBuffer(),l+=s[f].byteLength/q,o)break}return mn=!1,o}function it(i,t,e,n,s,r=0,o=0,l=0,c=0,u=null,f=!1){let a,d;f?(a=ve,d=Zt):(a=Zt,d=ve);const p=a.float32Array,y=a.uint32Array,g=a.uint16Array,v=d.float32Array,w=d.uint32Array,h=d.uint16Array,m=i*2,x=t*2,b=R(m,g),B=R(x,h);let A=!1;if(B&&b)f?A=s(H(t,w),Y(t*2,h),H(i,y),Y(i*2,g),c,o+t/L,l,r+i/L):A=s(H(i,y),Y(i*2,g),H(t,w),Y(t*2,h),l,r+i/L,c,o+t/L);else if(B){const P=ht.getPrimitive();V(t,v,P),P.applyMatrix4(e);const _=U(i),T=k(i,y);V(_,p,zt),V(T,p,Et);const S=P.intersectsBox(zt),I=P.intersectsBox(Et);A=S&&it(t,_,n,e,s,o,r,c,l+1,P,!f)||I&&it(t,T,n,e,s,o,r,c,l+1,P,!f),ht.releasePrimitive(P)}else{const P=U(t),_=k(t,w);V(P,v,pn),V(_,v,hn);const T=u.intersectsBox(pn),S=u.intersectsBox(hn);if(T&&S)A=it(i,P,e,n,s,r,o,l,c+1,u,f)||it(i,_,e,n,s,r,o,l,c+1,u,f);else if(T)if(b)A=it(i,P,e,n,s,r,o,l,c+1,u,f);else{const I=ht.getPrimitive();I.copy(pn).applyMatrix4(e);const M=U(i),z=k(i,y);V(M,p,zt),V(z,p,Et);const E=I.intersectsBox(zt),F=I.intersectsBox(Et);A=E&&it(P,M,n,e,s,o,r,c,l+1,I,!f)||F&&it(P,z,n,e,s,o,r,c,l+1,I,!f),ht.releasePrimitive(I)}else if(S)if(b)A=it(i,_,e,n,s,r,o,l,c+1,u,f);else{const I=ht.getPrimitive();I.copy(hn).applyMatrix4(e);const M=U(i),z=k(i,y);V(M,p,zt),V(z,p,Et);const E=I.intersectsBox(zt),F=I.intersectsBox(Et);A=E&&it(_,M,n,e,s,o,r,c,l+1,I,!f)||F&&it(_,z,n,e,s,o,r,c,l+1,I,!f),ht.releasePrimitive(I)}}return A}const yn=new class{constructor(){let i=null,t=null,e=null,n=!1;this.root=null,this.buffer=null,this.uint32Array=null,this.uint16Array=null,this.setBVH=(r,o)=>{if(n)throw new Error("BVHTraversalHelper: cannot call setBVH during an active traversal.");this.root=o,this.buffer=i=r._roots[o],this.uint16Array=e=new Uint16Array(i),this.uint32Array=t=new Uint32Array(i)},this.reset=()=>{this.root=null,this.buffer=i=null,this.uint16Array=e=null,this.uint32Array=t=null},this.getRangeStart=r=>{let o=r*2;for(;!R(o,e);)r=U(r),o=r*2;return H(r,t)},this.getRangeEnd=r=>{let o=r*2;for(;!R(o,e);)r=k(r,t),o=r*2;return H(r,t)+Y(o,e)};const s=(r,o,l)=>{const c=o*2,u=R(c,e);if(!r(l,u,o)&&!u){const a=U(o),d=k(o,t);s(r,a,l+1),s(r,d,l+1)}};this.traverseBuffer=r=>{if(n)throw new Error("BVHTraversalHelper: cannot start a traversal during an active traversal.");n=!0;try{s(r,0,0)}finally{n=!1}},this.traverse=r=>{this.traverseBuffer((o,l,c)=>{if(l){const u=c*2,f=t[c+6],a=e[u+14];return r(o,l,new Float32Array(i,c*4,6),f,a)}else{const u=ye(c,t);return r(o,l,new Float32Array(i,c*4,6),u)}})}}},ri=new $,Vt=new Float32Array(6);class xn{constructor(){this._roots=null,this.primitiveBuffer=null,this.primitiveBufferStride=null}init(t){t={...ei,...t},"maxLeafSize"in t&&(console.warn('BVH: "maxLeafSize" option has been deprecated. Use "targetLeafSize", instead.'),t={...t,targetLeafSize:t.maxLeafSize}),Vs(this,t)}getRootRanges(){throw new Error("BVH: getRootRanges() not implemented")}writePrimitiveBounds(){throw new Error("BVH: writePrimitiveBounds() not implemented")}writePrimitiveRangeBounds(t,e,n,s){let r=1/0,o=1/0,l=1/0,c=-1/0,u=-1/0,f=-1/0;for(let a=t,d=t+e;a<d;a++){this.writePrimitiveBounds(a,Vt,0);const[p,y,g,v,w,h]=Vt;p<r&&(r=p),v>c&&(c=v),y<o&&(o=y),w>u&&(u=w),g<l&&(l=g),h>f&&(f=h)}return n[s+0]=r,n[s+1]=o,n[s+2]=l,n[s+3]=c,n[s+4]=u,n[s+5]=f,n}computePrimitiveBounds(t,e,n){const s=n.offset||0;for(let r=t,o=t+e;r<o;r++){this.writePrimitiveBounds(r,Vt,0);const[l,c,u,f,a,d]=Vt,p=(l+f)/2,y=(c+a)/2,g=(u+d)/2,v=(f-l)/2,w=(a-c)/2,h=(d-u)/2,m=(r-s)*6;n[m+0]=p,n[m+1]=v+(Math.abs(p)+v)*he,n[m+2]=y,n[m+3]=w+(Math.abs(y)+w)*he,n[m+4]=g,n[m+5]=h+(Math.abs(g)+h)*he}return n}shiftPrimitiveOffsets(t){const e=this._indirectBuffer;if(e)for(let n=0,s=e.length;n<s;n++)e[n]+=t;else{const n=this._roots;for(let s=0;s<n.length;s++){const r=n[s],o=new Uint32Array(r),l=new Uint16Array(r),c=r.byteLength/q;for(let u=0;u<c;u++){const f=L*u,a=2*f;R(a,l)&&(o[f+6]+=t)}}}}traverse(t,e=0){yn.setBVH(this,e),yn.traverse(t),yn.reset()}refit(){const t=this._roots;for(let e=0,n=t.length;e<n;e++){const s=t[e],r=new Uint32Array(s),o=new Uint16Array(s),l=new Float32Array(s),c=s.byteLength/q;for(let u=c-1;u>=0;u--){const f=u*L,a=f*2;if(R(a,o)){const p=H(f,r),y=Y(a,o);this.writePrimitiveRangeBounds(p,y,Vt,0),l.set(Vt,f)}else{const p=U(f),y=k(f,r);for(let g=0;g<3;g++){const v=l[p+g],w=l[p+g+3],h=l[y+g],m=l[y+g+3];l[f+g]=v<h?v:h,l[f+g+3]=w>m?w:m}}}}}getBoundingBox(t){return t.makeEmpty(),this._roots.forEach(n=>{V(0,new Float32Array(n),ri),t.union(ri)}),t}shapecast(t){let{boundsTraverseOrder:e,intersectsBounds:n,intersectsRange:s,intersectsPrimitive:r,scratchPrimitive:o,iterate:l}=t;if(s&&r){const a=s;s=(d,p,y,g,v)=>a(d,p,y,g,v)?!0:l(d,p,this,r,y,g,o)}else s||(r?s=(a,d,p,y)=>l(a,d,this,r,p,y,o):s=(a,d,p)=>p);let c=!1,u=0;const f=this._roots;for(let a=0,d=f.length;a<d;a++){const p=f[a];if(c=Fs(this,a,n,s,e,u),c)break;u+=p.byteLength/q}return c}bvhcast(t,e,n){let{intersectsRanges:s}=n;return Rs(this,t,e,s)}}function ci(){return typeof SharedArrayBuffer<"u"}function dr(i,t){if(i===null)return i;if(i.buffer){const e=i.buffer;if(e.constructor===t)return i;const n=i.constructor,s=new n(new t(e.byteLength));return s.set(i),s}else{if(i.constructor===t)return i;const e=new t(i.byteLength);return new Uint8Array(e).set(new Uint8Array(i)),e}}function we(i){return i.index?i.index.count:i.attributes.position.count}function Ae(i){return we(i)/3}function ai(i,t=ArrayBuffer){return i>65535?new Uint32Array(new t(4*i)):new Uint16Array(new t(2*i))}function Ns(i,t){if(!i.index){const e=i.attributes.position.count,n=t.useSharedArrayBuffer?SharedArrayBuffer:ArrayBuffer,s=ai(e,n);i.setIndex(new ft(s,1));for(let r=0;r<e;r++)s[r]=r}}function Ls(i,t,e){const n=we(i)/e,s=t||i.drawRange,r=s.start/e,o=(s.start+s.count)/e,l=Math.max(0,r),c=Math.min(n,o)-l;return{offset:Math.floor(l),count:Math.floor(c)}}function Hs(i,t){return i.groups.map(e=>({offset:e.start/t,count:e.count/t}))}function li(i,t,e){const n=Ls(i,t,e),s=Hs(i,e);if(!s.length)return[n];const r=[],o=n.offset,l=n.offset+n.count,c=we(i)/e,u=[];for(const d of s){const{offset:p,count:y}=d,g=p,v=isFinite(y)?y:c-p,w=p+v;g<l&&w>o&&(u.push({pos:Math.max(o,g),isStart:!0}),u.push({pos:Math.min(l,w),isStart:!1}))}u.sort((d,p)=>d.pos!==p.pos?d.pos-p.pos:d.type==="end"?-1:1);let f=0,a=null;for(const d of u){const p=d.pos;f!==0&&p!==a&&r.push({offset:a,count:p-a}),f+=d.isStart?1:-1,a=p}return r}function ui(i,t){const e=i[i.length-1],n=e.offset+e.count>2**16,s=i.reduce((u,f)=>u+f.count,0),r=n?4:2,o=t?new SharedArrayBuffer(s*r):new ArrayBuffer(s*r),l=n?new Uint32Array(o):new Uint16Array(o);let c=0;for(let u=0;u<i.length;u++){const{offset:f,count:a}=i[u];for(let d=0;d<a;d++)l[c+d]=f+d;c+=a}return l}class Kt extends xn{get indirect(){return!!this._indirectBuffer}get primitiveStride(){return null}get primitiveBufferStride(){return this.indirect?1:this.primitiveStride}set primitiveBufferStride(t){}get primitiveBuffer(){return this.indirect?this._indirectBuffer:this.geometry.index.array}set primitiveBuffer(t){}constructor(t,e={}){if(t.isBufferGeometry){if(t.index&&t.index.isInterleavedBufferAttribute)throw new Error("BVH: InterleavedBufferAttribute is not supported for the index attribute.")}else throw new Error("BVH: Only BufferGeometries are supported.");if(e.useSharedArrayBuffer&&!ci())throw new Error("BVH: SharedArrayBuffer is not available.");super(),this.geometry=t,this.resolvePrimitiveIndex=e.indirect?n=>this._indirectBuffer[n]:n=>n,this.primitiveBuffer=null,this.primitiveBufferStride=null,this._indirectBuffer=null,e={...ei,...e},e[St]||this.init(e)}init(t){const{geometry:e,primitiveStride:n}=this;if(t.indirect){const s=li(e,t.range,n),r=ui(s,t.useSharedArrayBuffer);this._indirectBuffer=r}else Ns(e,t);super.init(t),!e.boundingBox&&t.setBoundingBox&&(e.boundingBox=this.getBoundingBox(new $))}getRootRanges(t){return this.indirect?[{offset:0,count:this._indirectBuffer.length}]:li(this.geometry,t,this.primitiveStride)}raycastObject3D(){throw new Error("BVH: raycastObject3D() not implemented")}}class ot{constructor(){this.min=1/0,this.max=-1/0}setFromPointsField(t,e){let n=1/0,s=-1/0;for(let r=0,o=t.length;r<o;r++){const c=t[r][e];n=c<n?c:n,s=c>s?c:s}this.min=n,this.max=s}setFromPoints(t,e){let n=1/0,s=-1/0;for(let r=0,o=e.length;r<o;r++){const l=e[r],c=t.dot(l);n=c<n?c:n,s=c>s?c:s}this.min=n,this.max=s}isSeparated(t){return this.min>t.max||t.min>this.max}}ot.prototype.setFromBox=(function(){const i=new D;return function(e,n){const s=n.min,r=n.max;let o=1/0,l=-1/0;for(let c=0;c<=1;c++)for(let u=0;u<=1;u++)for(let f=0;f<=1;f++){i.x=s.x*c+r.x*(1-c),i.y=s.y*u+r.y*(1-u),i.z=s.z*f+r.z*(1-f);const a=e.dot(i);o=Math.min(a,o),l=Math.max(a,l)}this.min=o,this.max=l}})();const pr=(function(){const i=new ot;return function(e,n){const s=e.points,r=e.satAxes,o=e.satBounds,l=n.points,c=n.satAxes,u=n.satBounds;for(let f=0;f<3;f++){const a=o[f],d=r[f];if(i.setFromPoints(d,l),a.isSeparated(i))return!1}for(let f=0;f<3;f++){const a=u[f],d=c[f];if(i.setFromPoints(d,s),a.isSeparated(i))return!1}}})(),Us=(function(){const i=new D,t=new D,e=new D;return function(s,r,o){const l=s.start,c=i,u=r.start,f=t;e.subVectors(l,u),i.subVectors(s.end,s.start),t.subVectors(r.end,r.start);const a=e.dot(f),d=f.dot(c),p=f.dot(f),y=e.dot(c),v=c.dot(c)*p-d*d;let w,h;v!==0?w=(a*d-y*p)/v:w=0,h=(a+w*d)/p,o.x=w,o.y=h}})(),gn=(function(){const i=new X,t=new D,e=new D;return function(s,r,o,l){Us(s,r,i);let c=i.x,u=i.y;if(c>=0&&c<=1&&u>=0&&u<=1){s.at(c,o),r.at(u,l);return}else if(c>=0&&c<=1){u<0?r.at(0,l):r.at(1,l),s.closestPointToPoint(l,!0,o);return}else if(u>=0&&u<=1){c<0?s.at(0,o):s.at(1,o),r.closestPointToPoint(o,!0,l);return}else{let f;c<0?f=s.start:f=s.end;let a;u<0?a=r.start:a=r.end;const d=t,p=e;if(s.closestPointToPoint(a,!0,t),r.closestPointToPoint(f,!0,e),d.distanceToSquared(a)<=p.distanceToSquared(f)){o.copy(d),l.copy(a);return}else{o.copy(f),l.copy(p);return}}}})(),ks=(function(){const i=new D,t=new D,e=new qn,n=new st;return function(r,o){const{radius:l,center:c}=r,{a:u,b:f,c:a}=o;if(n.start=u,n.end=f,n.closestPointToPoint(c,!0,i).distanceTo(c)<=l||(n.start=u,n.end=a,n.closestPointToPoint(c,!0,i).distanceTo(c)<=l)||(n.start=f,n.end=a,n.closestPointToPoint(c,!0,i).distanceTo(c)<=l))return!0;const g=o.getPlane(e);if(Math.abs(g.distanceToPoint(c))<=l){const w=g.projectPoint(c,t);if(o.containsPoint(w))return!0}return!1}})(),Os=["x","y","z"],at=1e-15,fi=at*at;function Q(i){return Math.abs(i)<at}class J extends G{constructor(...t){super(...t),this.isExtendedTriangle=!0,this.satAxes=new Array(4).fill().map(()=>new D),this.satBounds=new Array(4).fill().map(()=>new ot),this.points=[this.a,this.b,this.c],this.plane=new qn,this.isDegenerateIntoSegment=!1,this.isDegenerateIntoPoint=!1,this.degenerateSegment=new st,this.needsUpdate=!0}intersectsSphere(t){return ks(t,this)}update(){const t=this.a,e=this.b,n=this.c,s=this.points,r=this.satAxes,o=this.satBounds,l=r[0],c=o[0];this.getNormal(l),c.setFromPoints(l,s);const u=r[1],f=o[1];u.subVectors(t,e),f.setFromPoints(u,s);const a=r[2],d=o[2];a.subVectors(e,n),d.setFromPoints(a,s);const p=r[3],y=o[3];p.subVectors(n,t),y.setFromPoints(p,s);const g=u.length(),v=a.length(),w=p.length();this.isDegenerateIntoPoint=!1,this.isDegenerateIntoSegment=!1,g<at?v<at||w<at?this.isDegenerateIntoPoint=!0:(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(t),this.degenerateSegment.end.copy(n)):v<at?w<at?this.isDegenerateIntoPoint=!0:(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(e),this.degenerateSegment.end.copy(t)):w<at&&(this.isDegenerateIntoSegment=!0,this.degenerateSegment.start.copy(n),this.degenerateSegment.end.copy(e)),this.plane.setFromNormalAndCoplanarPoint(l,t),this.needsUpdate=!1}}J.prototype.closestPointToSegment=(function(){const i=new D,t=new D,e=new st;return function(s,r=null,o=null){const{start:l,end:c}=s,u=this.points;let f,a=1/0;for(let d=0;d<3;d++){const p=(d+1)%3;e.start.copy(u[d]),e.end.copy(u[p]),gn(e,s,i,t),f=i.distanceToSquared(t),f<a&&(a=f,r&&r.copy(i),o&&o.copy(t))}return this.closestPointToPoint(l,i),f=l.distanceToSquared(i),f<a&&(a=f,r&&r.copy(i),o&&o.copy(l)),this.closestPointToPoint(c,i),f=c.distanceToSquared(i),f<a&&(a=f,r&&r.copy(i),o&&o.copy(c)),Math.sqrt(a)}})(),J.prototype.intersectsTriangle=(function(){const i=new J,t=new ot,e=new ot,n=new D,s=new D,r=new D,o=new D,l=new st,c=new st,u=new D,f=new X,a=new X;function d(m,x,b,B){const A=n;!m.isDegenerateIntoPoint&&!m.isDegenerateIntoSegment?A.copy(m.plane.normal):A.copy(x.plane.normal);const P=m.satBounds,_=m.satAxes;for(let I=1;I<4;I++){const M=P[I],z=_[I];if(t.setFromPoints(z,x.points),M.isSeparated(t)||(o.copy(A).cross(z),t.setFromPoints(o,m.points),e.setFromPoints(o,x.points),t.isSeparated(e)))return!1}const T=x.satBounds,S=x.satAxes;for(let I=1;I<4;I++){const M=T[I],z=S[I];if(t.setFromPoints(z,m.points),M.isSeparated(t)||(o.crossVectors(A,z),t.setFromPoints(o,m.points),e.setFromPoints(o,x.points),t.isSeparated(e)))return!1}return b&&(B||console.warn("ExtendedTriangle.intersectsTriangle: Triangles are coplanar which does not support an output edge. Setting edge to 0, 0, 0."),b.start.set(0,0,0),b.end.set(0,0,0)),!0}function p(m,x,b,B,A,P,_,T,S,I,M){let z=_/(_-T);I.x=B+(A-B)*z,M.start.subVectors(x,m).multiplyScalar(z).add(m),z=_/(_-S),I.y=B+(P-B)*z,M.end.subVectors(b,m).multiplyScalar(z).add(m)}function y(m,x,b,B,A,P,_,T,S,I,M){if(A>0)p(m.c,m.a,m.b,B,x,b,S,_,T,I,M);else if(P>0)p(m.b,m.a,m.c,b,x,B,T,_,S,I,M);else if(T*S>0||_!=0)p(m.a,m.b,m.c,x,b,B,_,T,S,I,M);else if(T!=0)p(m.b,m.a,m.c,b,x,B,T,_,S,I,M);else if(S!=0)p(m.c,m.a,m.b,B,x,b,S,_,T,I,M);else return!0;return!1}function g(m,x,b,B){const A=x.degenerateSegment,P=m.plane.distanceToPoint(A.start),_=m.plane.distanceToPoint(A.end);return Q(P)?Q(_)?d(m,x,b,B):(b&&(b.start.copy(A.start),b.end.copy(A.start)),m.containsPoint(A.start)):Q(_)?(b&&(b.start.copy(A.end),b.end.copy(A.end)),m.containsPoint(A.end)):m.plane.intersectLine(A,n)!=null?(b&&(b.start.copy(n),b.end.copy(n)),m.containsPoint(n)):!1}function v(m,x,b){const B=x.a;return Q(m.plane.distanceToPoint(B))&&m.containsPoint(B)?(b&&(b.start.copy(B),b.end.copy(B)),!0):!1}function w(m,x,b){const B=m.degenerateSegment,A=x.a;return B.closestPointToPoint(A,!0,n),A.distanceToSquared(n)<fi?(b&&(b.start.copy(A),b.end.copy(A)),!0):!1}function h(m,x,b,B){if(m.isDegenerateIntoSegment)if(x.isDegenerateIntoSegment){const A=m.degenerateSegment,P=x.degenerateSegment,_=s,T=r;A.delta(_),P.delta(T);const S=n.subVectors(P.start,A.start),I=_.x*T.y-_.y*T.x;if(Q(I))return!1;const M=(S.x*T.y-S.y*T.x)/I,z=-(_.x*S.y-_.y*S.x)/I;if(M<0||M>1||z<0||z>1)return!1;const E=A.start.z+_.z*M,F=P.start.z+T.z*z;return Q(E-F)?(b&&(b.start.copy(A.start).addScaledVector(_,M),b.end.copy(A.start).addScaledVector(_,M)),!0):!1}else return x.isDegenerateIntoPoint?w(m,x,b):g(x,m,b,B);else{if(m.isDegenerateIntoPoint)return x.isDegenerateIntoPoint?x.a.distanceToSquared(m.a)<fi?(b&&(b.start.copy(m.a),b.end.copy(m.a)),!0):!1:x.isDegenerateIntoSegment?w(x,m,b):v(x,m,b);if(x.isDegenerateIntoPoint)return v(m,x,b);if(x.isDegenerateIntoSegment)return g(m,x,b,B)}}return function(x,b=null,B=!1){this.needsUpdate&&this.update(),x.isExtendedTriangle?x.needsUpdate&&x.update():(i.copy(x),i.update(),x=i);const A=h(this,x,b,B);if(A!==void 0)return A;const P=this.plane,_=x.plane;let T=_.distanceToPoint(this.a),S=_.distanceToPoint(this.b),I=_.distanceToPoint(this.c);Q(T)&&(T=0),Q(S)&&(S=0),Q(I)&&(I=0);const M=T*S,z=T*I;if(M>0&&z>0)return!1;let E=P.distanceToPoint(x.a),F=P.distanceToPoint(x.b),ue=P.distanceToPoint(x.c);Q(E)&&(E=0),Q(F)&&(F=0),Q(ue)&&(ue=0);const Un=E*F,kn=E*ue;if(Un>0&&kn>0)return!1;s.copy(P.normal),r.copy(_.normal);const Ye=s.cross(r);let Ze=0,Ke=Math.abs(Ye.x);const On=Math.abs(Ye.y);On>Ke&&(Ke=On,Ze=1),Math.abs(Ye.z)>Ke&&(Ze=2);const It=Os[Ze],cs=this.a[It],as=this.b[It],ls=this.c[It],us=x.a[It],fs=x.b[It],ds=x.c[It];if(y(this,cs,as,ls,M,z,T,S,I,f,l))return d(this,x,b,B);if(y(x,us,fs,ds,Un,kn,E,F,ue,a,c))return d(this,x,b,B);if(f.y<f.x){const Ge=f.y;f.y=f.x,f.x=Ge,u.copy(l.start),l.start.copy(l.end),l.end.copy(u)}if(a.y<a.x){const Ge=a.y;a.y=a.x,a.x=Ge,u.copy(c.start),c.start.copy(c.end),c.end.copy(u)}return f.y<a.x||a.y<f.x?!1:(b&&(a.x>f.x?b.start.copy(c.start):b.start.copy(l.start),a.y<f.y?b.end.copy(c.end):b.end.copy(l.end)),!0)}})(),J.prototype.distanceToPoint=(function(){const i=new D;return function(e){return this.closestPointToPoint(e,i),e.distanceTo(i)}})(),J.prototype.distanceToTriangle=(function(){const i=new D,t=new D,e=["a","b","c"],n=new st,s=new st;return function(o,l=null,c=null){const u=l||c?n:null;if(this.intersectsTriangle(o,u,!0))return(l||c)&&(l&&u.getCenter(l),c&&u.getCenter(c)),0;let f=1/0;for(let a=0;a<3;a++){let d;const p=e[a],y=o[p];this.closestPointToPoint(y,i),d=y.distanceToSquared(i),d<f&&(f=d,l&&l.copy(i),c&&c.copy(y));const g=this[p];o.closestPointToPoint(g,i),d=g.distanceToSquared(i),d<f&&(f=d,l&&l.copy(g),c&&c.copy(i))}for(let a=0;a<3;a++){const d=e[a],p=e[(a+1)%3];n.set(this[d],this[p]);for(let y=0;y<3;y++){const g=e[y],v=e[(y+1)%3];s.set(o[g],o[v]),gn(n,s,i,t);const w=i.distanceToSquared(t);w<f&&(f=w,l&&l.copy(i),c&&c.copy(t))}}return Math.sqrt(f)}})();class K{constructor(t,e,n){this.isOrientedBox=!0,this.min=new D,this.max=new D,this.matrix=new O,this.invMatrix=new O,this.points=new Array(8).fill().map(()=>new D),this.satAxes=new Array(3).fill().map(()=>new D),this.satBounds=new Array(3).fill().map(()=>new ot),this.alignedSatBounds=new Array(3).fill().map(()=>new ot),this.needsUpdate=!1,t&&this.min.copy(t),e&&this.max.copy(e),n&&this.matrix.copy(n)}set(t,e,n){this.min.copy(t),this.max.copy(e),this.matrix.copy(n),this.needsUpdate=!0}copy(t){this.min.copy(t.min),this.max.copy(t.max),this.matrix.copy(t.matrix),this.needsUpdate=!0}}K.prototype.update=(function(){return function(){const t=this.matrix,e=this.min,n=this.max,s=this.points;for(let u=0;u<=1;u++)for(let f=0;f<=1;f++)for(let a=0;a<=1;a++){const d=1*u|2*f|4*a,p=s[d];p.x=u?n.x:e.x,p.y=f?n.y:e.y,p.z=a?n.z:e.z,p.applyMatrix4(t)}const r=this.satBounds,o=this.satAxes,l=s[0];for(let u=0;u<3;u++){const f=o[u],a=r[u],d=1<<u,p=s[d];f.subVectors(l,p),a.setFromPoints(f,s)}const c=this.alignedSatBounds;c[0].setFromPointsField(s,"x"),c[1].setFromPointsField(s,"y"),c[2].setFromPointsField(s,"z"),this.invMatrix.copy(this.matrix).invert(),this.needsUpdate=!1}})(),K.prototype.intersectsBox=(function(){const i=new ot;return function(e){this.needsUpdate&&this.update();const n=e.min,s=e.max,r=this.satBounds,o=this.satAxes,l=this.alignedSatBounds;if(i.min=n.x,i.max=s.x,l[0].isSeparated(i)||(i.min=n.y,i.max=s.y,l[1].isSeparated(i))||(i.min=n.z,i.max=s.z,l[2].isSeparated(i)))return!1;for(let c=0;c<3;c++){const u=o[c],f=r[c];if(i.setFromBox(u,e),f.isSeparated(i))return!1}return!0}})(),K.prototype.intersectsTriangle=(function(){const i=new J,t=new Array(3),e=new ot,n=new ot,s=new D;return function(o){this.needsUpdate&&this.update(),o.isExtendedTriangle?o.needsUpdate&&o.update():(i.copy(o),i.update(),o=i);const l=this.satBounds,c=this.satAxes;t[0]=o.a,t[1]=o.b,t[2]=o.c;for(let d=0;d<3;d++){const p=l[d],y=c[d];if(e.setFromPoints(y,t),p.isSeparated(e))return!1}const u=o.satBounds,f=o.satAxes,a=this.points;for(let d=0;d<3;d++){const p=u[d],y=f[d];if(e.setFromPoints(y,a),p.isSeparated(e))return!1}for(let d=0;d<3;d++){const p=c[d];for(let y=0;y<4;y++){const g=f[y];if(s.crossVectors(p,g),e.setFromPoints(s,t),n.setFromPoints(s,a),e.isSeparated(n))return!1}}return!0}})(),K.prototype.closestPointToPoint=(function(){return function(t,e){return this.needsUpdate&&this.update(),e.copy(t).applyMatrix4(this.invMatrix).clamp(this.min,this.max).applyMatrix4(this.matrix),e}})(),K.prototype.distanceToPoint=(function(){const i=new D;return function(e){return this.closestPointToPoint(e,i),e.distanceTo(i)}})(),K.prototype.distanceToBox=(function(){const i=["x","y","z"],t=new Array(12).fill().map(()=>new st),e=new Array(12).fill().map(()=>new st),n=new D,s=new D;return function(o,l=0,c=null,u=null){if(this.needsUpdate&&this.update(),this.intersectsBox(o))return(c||u)&&(o.getCenter(s),this.closestPointToPoint(s,n),o.closestPointToPoint(n,s),c&&c.copy(n),u&&u.copy(s)),0;const f=l*l,a=o.min,d=o.max,p=this.points;let y=1/0;for(let v=0;v<8;v++){const w=p[v];s.copy(w).clamp(a,d);const h=w.distanceToSquared(s);if(h<y&&(y=h,c&&c.copy(w),u&&u.copy(s),h<f))return Math.sqrt(h)}let g=0;for(let v=0;v<3;v++)for(let w=0;w<=1;w++)for(let h=0;h<=1;h++){const m=(v+1)%3,x=(v+2)%3,b=w<<m|h<<x,B=1<<v|w<<m|h<<x,A=p[b],P=p[B];t[g].set(A,P);const T=i[v],S=i[m],I=i[x],M=e[g],z=M.start,E=M.end;z[T]=a[T],z[S]=w?a[S]:d[S],z[I]=h?a[I]:d[S],E[T]=d[T],E[S]=w?a[S]:d[S],E[I]=h?a[I]:d[S],g++}for(let v=0;v<=1;v++)for(let w=0;w<=1;w++)for(let h=0;h<=1;h++){s.x=v?d.x:a.x,s.y=w?d.y:a.y,s.z=h?d.z:a.z,this.closestPointToPoint(s,n);const m=s.distanceToSquared(n);if(m<y&&(y=m,c&&c.copy(n),u&&u.copy(s),m<f))return Math.sqrt(m)}for(let v=0;v<12;v++){const w=t[v];for(let h=0;h<12;h++){const m=e[h];gn(w,m,n,s);const x=n.distanceToSquared(s);if(x<y&&(y=x,c&&c.copy(n),u&&u.copy(s),x<f))return Math.sqrt(x)}}return Math.sqrt(y)}})();class qs extends Yt{constructor(){super(()=>new J)}}const tt=new qs,Gt=new D,bn=new D;function Ws(i,t,e={},n=0,s=1/0){const r=n*n,o=s*s;let l=1/0,c=null;if(i.shapecast({boundsTraverseOrder:f=>(Gt.copy(t).clamp(f.min,f.max),Gt.distanceToSquared(t)),intersectsBounds:(f,a,d)=>d<l&&d<o,intersectsTriangle:(f,a)=>{f.closestPointToPoint(t,Gt);const d=t.distanceToSquared(Gt);return d<l&&(bn.copy(Gt),l=d,c=a),d<r}}),l===1/0)return null;const u=Math.sqrt(l);return e.point?e.point.copy(bn):e.point=bn.clone(),e.distance=u,e.faceIndex=c,e}const Be=parseInt(kt)>=169,$s=parseInt(kt)<=161,gt=new D,bt=new D,vt=new D,Te=new X,Pe=new X,Ie=new X,di=new D,pi=new D,hi=new D,jt=new D;function Xs(i,t,e,n,s,r,o,l){let c;if(r===Wn?c=i.intersectTriangle(n,e,t,!0,s):c=i.intersectTriangle(t,e,n,r!==ps,s),c===null)return null;const u=i.origin.distanceTo(s);return u<o||u>l?null:{distance:u,point:s.clone()}}function mi(i,t,e,n,s,r,o,l,c,u,f){gt.fromBufferAttribute(t,r),bt.fromBufferAttribute(t,o),vt.fromBufferAttribute(t,l);const a=Xs(i,gt,bt,vt,jt,c,u,f);if(a){if(n){Te.fromBufferAttribute(n,r),Pe.fromBufferAttribute(n,o),Ie.fromBufferAttribute(n,l),a.uv=new X;const p=G.getInterpolation(jt,gt,bt,vt,Te,Pe,Ie,a.uv);Be||(a.uv=p)}if(s){Te.fromBufferAttribute(s,r),Pe.fromBufferAttribute(s,o),Ie.fromBufferAttribute(s,l),a.uv1=new X;const p=G.getInterpolation(jt,gt,bt,vt,Te,Pe,Ie,a.uv1);Be||(a.uv1=p),$s&&(a.uv2=a.uv1)}if(e){di.fromBufferAttribute(e,r),pi.fromBufferAttribute(e,o),hi.fromBufferAttribute(e,l),a.normal=new D;const p=G.getInterpolation(jt,gt,bt,vt,di,pi,hi,a.normal);a.normal.dot(i.direction)>0&&a.normal.multiplyScalar(-1),Be||(a.normal=p)}const d={a:r,b:o,c:l,normal:new D,materialIndex:0};if(G.getNormal(gt,bt,vt,d.normal),a.face=d,a.faceIndex=r,Be){const p=new D;G.getBarycoord(jt,gt,bt,vt,p),a.barycoord=p}}return a}function yi(i){return i&&i.isMaterial?i.side:i}function _e(i,t,e,n,s,r,o){const l=n*3;let c=l+0,u=l+1,f=l+2;const{index:a,groups:d}=i;i.index&&(c=a.getX(c),u=a.getX(u),f=a.getX(f));const{position:p,normal:y,uv:g,uv1:v}=i.attributes;if(Array.isArray(t)){const w=n*3;for(let h=0,m=d.length;h<m;h++){const{start:x,count:b,materialIndex:B}=d[h];if(w>=x&&w<x+b){const A=yi(t[B]),P=mi(e,p,y,g,v,c,u,f,A,r,o);if(P)if(P.faceIndex=n,P.face.materialIndex=B,s)s.push(P);else return P}}}else{const w=yi(t),h=mi(e,p,y,g,v,c,u,f,w,r,o);if(h)if(h.faceIndex=n,h.face.materialIndex=0,s)s.push(h);else return h}return null}function N(i,t,e,n){const s=i.a,r=i.b,o=i.c;let l=t,c=t+1,u=t+2;e&&(l=e.getX(l),c=e.getX(c),u=e.getX(u)),s.x=n.getX(l),s.y=n.getY(l),s.z=n.getZ(l),r.x=n.getX(c),r.y=n.getY(c),r.z=n.getZ(c),o.x=n.getX(u),o.y=n.getY(u),o.z=n.getZ(u)}const Jt=new D,Qt=new D,te=new D,xi=new X,gi=new X,bi=new X;function Ys(i,t,e,n){const s=t.getIndex().array,r=t.getAttribute("position"),o=t.getAttribute("uv"),l=s[e*3],c=s[e*3+1],u=s[e*3+2];Jt.fromBufferAttribute(r,l),Qt.fromBufferAttribute(r,c),te.fromBufferAttribute(r,u);let f=0;const a=t.groups,d=e*3;for(let g=0,v=a.length;g<v;g++){const w=a[g],{start:h,count:m}=w;if(d>=h&&d<h+m){f=w.materialIndex;break}}const p=n&&n.barycoord?n.barycoord:new D;G.getBarycoord(i,Jt,Qt,te,p);let y=null;return o&&(xi.fromBufferAttribute(o,l),gi.fromBufferAttribute(o,c),bi.fromBufferAttribute(o,u),n&&n.uv?y=n.uv:y=new X,G.getInterpolation(i,Jt,Qt,te,xi,gi,bi,y)),n?(n.face||(n.face={}),n.face.a=l,n.face.b=c,n.face.c=u,n.face.materialIndex=f,n.face.normal||(n.face.normal=new D),G.getNormal(Jt,Qt,te,n.face.normal),y&&(n.uv=y),n.barycoord=p,n):{face:{a:l,b:c,c:u,materialIndex:f,normal:G.getNormal(Jt,Qt,te,new D)},uv:y,barycoord:p}}function Zs(i,t,e,n,s,r,o,l){const{geometry:c,_indirectBuffer:u}=i;for(let f=n,a=n+s;f<a;f++)_e(c,t,e,f,r,o,l)}function Ks(i,t,e,n,s,r,o){const{geometry:l,_indirectBuffer:c}=i;let u=1/0,f=null;for(let a=n,d=n+s;a<d;a++){let p;p=_e(l,t,e,a,null,r,o),p&&p.distance<u&&(f=p,u=p.distance)}return f}function Gs(i,t,e,n,s,r,o){const{geometry:l}=e,{index:c}=l,u=l.attributes.position;for(let f=i,a=t+i;f<a;f++){let d;if(d=f,N(o,d*3,c,u),o.needsUpdate=!0,n(o,d,s,r))return!0}return!1}function js(i,t=null){t&&Array.isArray(t)&&(t=new Set(t));const e=i.geometry,n=e.index?e.index.array:null,s=e.attributes.position;let r,o,l,c,u=0;const f=i._roots;for(let d=0,p=f.length;d<p;d++)r=f[d],o=new Uint32Array(r),l=new Uint16Array(r),c=new Float32Array(r),a(0,u),u+=r.byteLength;function a(d,p,y=!1){const g=d*2;if(R(g,l)){const v=H(d,o),w=Y(g,l);let h=1/0,m=1/0,x=1/0,b=-1/0,B=-1/0,A=-1/0;for(let P=3*v,_=3*(v+w);P<_;P++){let T=n[P];const S=s.getX(T),I=s.getY(T),M=s.getZ(T);S<h&&(h=S),S>b&&(b=S),I<m&&(m=I),I>B&&(B=I),M<x&&(x=M),M>A&&(A=M)}return c[d+0]!==h||c[d+1]!==m||c[d+2]!==x||c[d+3]!==b||c[d+4]!==B||c[d+5]!==A?(c[d+0]=h,c[d+1]=m,c[d+2]=x,c[d+3]=b,c[d+4]=B,c[d+5]=A,!0):!1}else{const v=U(d),w=k(d,o);let h=y,m=!1,x=!1;if(t){if(!h){const T=v/L+p/q,S=w/L+p/q;m=t.has(T),x=t.has(S),h=!m&&!x}}else m=!0,x=!0;const b=h||m,B=h||x;let A=!1;b&&(A=a(v,p,h));let P=!1;B&&(P=a(w,p,h));const _=A||P;if(_)for(let T=0;T<3;T++){const S=v+T,I=w+T,M=c[S],z=c[S+3],E=c[I],F=c[I+3];c[d+T]=M<E?M:E,c[d+T+3]=z>F?z:F}return _}}}function mt(i,t,e,n,s){let r,o,l,c,u,f;const a=1/e.direction.x,d=1/e.direction.y,p=1/e.direction.z,y=e.origin.x,g=e.origin.y,v=e.origin.z;let w=t[i],h=t[i+3],m=t[i+1],x=t[i+3+1],b=t[i+2],B=t[i+3+2];return a>=0?(r=(w-y)*a,o=(h-y)*a):(r=(h-y)*a,o=(w-y)*a),d>=0?(l=(m-g)*d,c=(x-g)*d):(l=(x-g)*d,c=(m-g)*d),r>c||l>o||((l>r||isNaN(r))&&(r=l),(c<o||isNaN(o))&&(o=c),p>=0?(u=(b-v)*p,f=(B-v)*p):(u=(B-v)*p,f=(b-v)*p),r>f||u>o)?!1:((u>r||r!==r)&&(r=u),(f<o||o!==o)&&(o=f),r<=s&&o>=n)}function Js(i,t,e,n,s,r,o,l){const{geometry:c,_indirectBuffer:u}=i;for(let f=n,a=n+s;f<a;f++){let d=u?u[f]:f;_e(c,t,e,d,r,o,l)}}function Qs(i,t,e,n,s,r,o){const{geometry:l,_indirectBuffer:c}=i;let u=1/0,f=null;for(let a=n,d=n+s;a<d;a++){let p;p=_e(l,t,e,c?c[a]:a,null,r,o),p&&p.distance<u&&(f=p,u=p.distance)}return f}function to(i,t,e,n,s,r,o){const{geometry:l}=e,{index:c}=l,u=l.attributes.position;for(let f=i,a=t+i;f<a;f++){let d;if(d=e.resolveTriangleIndex(f),N(o,d*3,c,u),o.needsUpdate=!0,n(o,d,s,r))return!0}return!1}function eo(i,t,e,n,s,r,o){C.setBuffer(i._roots[t]),vn(0,i,e,n,s,r,o),C.clearBuffer()}function vn(i,t,e,n,s,r,o){const{float32Array:l,uint16Array:c,uint32Array:u}=C,f=i*2;if(R(f,c)){const d=H(i,u),p=Y(f,c);Zs(t,e,n,d,p,s,r,o)}else{const d=U(i);mt(d,l,n,r,o)&&vn(d,t,e,n,s,r,o);const p=k(i,u);mt(p,l,n,r,o)&&vn(p,t,e,n,s,r,o)}}const no=["x","y","z"];function io(i,t,e,n,s,r){C.setBuffer(i._roots[t]);const o=wn(0,i,e,n,s,r);return C.clearBuffer(),o}function wn(i,t,e,n,s,r){const{float32Array:o,uint16Array:l,uint32Array:c}=C;let u=i*2;if(R(u,l)){const a=H(i,c),d=Y(u,l);return Ks(t,e,n,a,d,s,r)}else{const a=ye(i,c),d=no[a],y=n.direction[d]>=0;let g,v;y?(g=U(i),v=k(i,c)):(g=k(i,c),v=U(i));const h=mt(g,o,n,s,r)?wn(g,t,e,n,s,r):null;if(h){const b=h.point[d];if(y?b<=o[v+a]:b>=o[v+a+3])return h}const x=mt(v,o,n,s,r)?wn(v,t,e,n,s,r):null;return h&&x?h.distance<=x.distance?h:x:h||x||null}}const Se=new $,Ct=new J,Ft=new J,ee=new O,vi=new K,Me=new K;function so(i,t,e,n){C.setBuffer(i._roots[t]);const s=An(0,i,e,n);return C.clearBuffer(),s}function An(i,t,e,n,s=null){const{float32Array:r,uint16Array:o,uint32Array:l}=C;let c=i*2;if(s===null&&(e.boundingBox||e.computeBoundingBox(),vi.set(e.boundingBox.min,e.boundingBox.max,n),s=vi),R(c,o)){const f=t.geometry,a=f.index,d=f.attributes.position,p=e.index,y=e.attributes.position,g=H(i,l),v=Y(c,o);if(ee.copy(n).invert(),e.boundsTree)return V(i,r,Me),Me.matrix.copy(ee),Me.needsUpdate=!0,e.boundsTree.shapecast({intersectsBounds:h=>Me.intersectsBox(h),intersectsTriangle:h=>{h.a.applyMatrix4(n),h.b.applyMatrix4(n),h.c.applyMatrix4(n),h.needsUpdate=!0;for(let m=g*3,x=(v+g)*3;m<x;m+=3)if(N(Ft,m,a,d),Ft.needsUpdate=!0,h.intersectsTriangle(Ft))return!0;return!1}});{const w=Ae(e);for(let h=g*3,m=(v+g)*3;h<m;h+=3){N(Ct,h,a,d),Ct.a.applyMatrix4(ee),Ct.b.applyMatrix4(ee),Ct.c.applyMatrix4(ee),Ct.needsUpdate=!0;for(let x=0,b=w*3;x<b;x+=3)if(N(Ft,x,p,y),Ft.needsUpdate=!0,Ct.intersectsTriangle(Ft))return!0}}}else{const f=U(i),a=k(i,l);return V(f,r,Se),!!(s.intersectsBox(Se)&&An(f,t,e,n,s)||(V(a,r,Se),s.intersectsBox(Se)&&An(a,t,e,n,s)))}}const De=new O,Bn=new K,ne=new K,oo=new D,ro=new D,co=new D,ao=new D;function lo(i,t,e,n={},s={},r=0,o=1/0){t.boundingBox||t.computeBoundingBox(),Bn.set(t.boundingBox.min,t.boundingBox.max,e),Bn.needsUpdate=!0;const l=i.geometry,c=l.attributes.position,u=l.index,f=t.attributes.position,a=t.index,d=tt.getPrimitive(),p=tt.getPrimitive();let y=oo,g=ro,v=null,w=null;s&&(v=co,w=ao);let h=1/0,m=null,x=null;return De.copy(e).invert(),ne.matrix.copy(De),i.shapecast({boundsTraverseOrder:b=>Bn.distanceToBox(b),intersectsBounds:(b,B,A)=>A<h&&A<o?(B&&(ne.min.copy(b.min),ne.max.copy(b.max),ne.needsUpdate=!0),!0):!1,intersectsRange:(b,B)=>{if(t.boundsTree)return t.boundsTree.shapecast({boundsTraverseOrder:P=>ne.distanceToBox(P),intersectsBounds:(P,_,T)=>T<h&&T<o,intersectsRange:(P,_)=>{for(let T=P,S=P+_;T<S;T++){N(p,3*T,a,f),p.a.applyMatrix4(e),p.b.applyMatrix4(e),p.c.applyMatrix4(e),p.needsUpdate=!0;for(let I=b,M=b+B;I<M;I++){N(d,3*I,u,c),d.needsUpdate=!0;const z=d.distanceToTriangle(p,y,v);if(z<h&&(g.copy(y),w&&w.copy(v),h=z,m=I,x=T),z<r)return!0}}}});{const A=Ae(t);for(let P=0,_=A;P<_;P++){N(p,3*P,a,f),p.a.applyMatrix4(e),p.b.applyMatrix4(e),p.c.applyMatrix4(e),p.needsUpdate=!0;for(let T=b,S=b+B;T<S;T++){N(d,3*T,u,c),d.needsUpdate=!0;const I=d.distanceToTriangle(p,y,v);if(I<h&&(g.copy(y),w&&w.copy(v),h=I,m=T,x=P),I<r)return!0}}}}}),tt.releasePrimitive(d),tt.releasePrimitive(p),h===1/0?null:(n.point?n.point.copy(g):n.point=g.clone(),n.distance=h,n.faceIndex=m,s&&(s.point?s.point.copy(w):s.point=w.clone(),s.point.applyMatrix4(De),g.applyMatrix4(De),s.distance=g.sub(s.point).length(),s.faceIndex=x),n)}function uo(i,t=null){t&&Array.isArray(t)&&(t=new Set(t));const e=i.geometry,n=e.index?e.index.array:null,s=e.attributes.position;let r,o,l,c,u=0;const f=i._roots;for(let d=0,p=f.length;d<p;d++)r=f[d],o=new Uint32Array(r),l=new Uint16Array(r),c=new Float32Array(r),a(0,u),u+=r.byteLength;function a(d,p,y=!1){const g=d*2;if(R(g,l)){const v=H(d,o),w=Y(g,l);let h=1/0,m=1/0,x=1/0,b=-1/0,B=-1/0,A=-1/0;for(let P=v,_=v+w;P<_;P++){const T=3*i.resolveTriangleIndex(P);for(let S=0;S<3;S++){let I=T+S;I=n?n[I]:I;const M=s.getX(I),z=s.getY(I),E=s.getZ(I);M<h&&(h=M),M>b&&(b=M),z<m&&(m=z),z>B&&(B=z),E<x&&(x=E),E>A&&(A=E)}}return c[d+0]!==h||c[d+1]!==m||c[d+2]!==x||c[d+3]!==b||c[d+4]!==B||c[d+5]!==A?(c[d+0]=h,c[d+1]=m,c[d+2]=x,c[d+3]=b,c[d+4]=B,c[d+5]=A,!0):!1}else{const v=U(d),w=k(d,o);let h=y,m=!1,x=!1;if(t){if(!h){const T=v/L+p/q,S=w/L+p/q;m=t.has(T),x=t.has(S),h=!m&&!x}}else m=!0,x=!0;const b=h||m,B=h||x;let A=!1;b&&(A=a(v,p,h));let P=!1;B&&(P=a(w,p,h));const _=A||P;if(_)for(let T=0;T<3;T++){const S=v+T,I=w+T,M=c[S],z=c[S+3],E=c[I],F=c[I+3];c[d+T]=M<E?M:E,c[d+T+3]=z>F?z:F}return _}}}function fo(i,t,e,n,s,r,o){C.setBuffer(i._roots[t]),Tn(0,i,e,n,s,r,o),C.clearBuffer()}function Tn(i,t,e,n,s,r,o){const{float32Array:l,uint16Array:c,uint32Array:u}=C,f=i*2;if(R(f,c)){const d=H(i,u),p=Y(f,c);Js(t,e,n,d,p,s,r,o)}else{const d=U(i);mt(d,l,n,r,o)&&Tn(d,t,e,n,s,r,o);const p=k(i,u);mt(p,l,n,r,o)&&Tn(p,t,e,n,s,r,o)}}const po=["x","y","z"];function ho(i,t,e,n,s,r){C.setBuffer(i._roots[t]);const o=Pn(0,i,e,n,s,r);return C.clearBuffer(),o}function Pn(i,t,e,n,s,r){const{float32Array:o,uint16Array:l,uint32Array:c}=C;let u=i*2;if(R(u,l)){const a=H(i,c),d=Y(u,l);return Qs(t,e,n,a,d,s,r)}else{const a=ye(i,c),d=po[a],y=n.direction[d]>=0;let g,v;y?(g=U(i),v=k(i,c)):(g=k(i,c),v=U(i));const h=mt(g,o,n,s,r)?Pn(g,t,e,n,s,r):null;if(h){const b=h.point[d];if(y?b<=o[v+a]:b>=o[v+a+3])return h}const x=mt(v,o,n,s,r)?Pn(v,t,e,n,s,r):null;return h&&x?h.distance<=x.distance?h:x:h||x||null}}const ze=new $,Rt=new J,Nt=new J,ie=new O,wi=new K,Ee=new K;function mo(i,t,e,n){C.setBuffer(i._roots[t]);const s=In(0,i,e,n);return C.clearBuffer(),s}function In(i,t,e,n,s=null){const{float32Array:r,uint16Array:o,uint32Array:l}=C;let c=i*2;if(s===null&&(e.boundingBox||e.computeBoundingBox(),wi.set(e.boundingBox.min,e.boundingBox.max,n),s=wi),R(c,o)){const f=t.geometry,a=f.index,d=f.attributes.position,p=e.index,y=e.attributes.position,g=H(i,l),v=Y(c,o);if(ie.copy(n).invert(),e.boundsTree)return V(i,r,Ee),Ee.matrix.copy(ie),Ee.needsUpdate=!0,e.boundsTree.shapecast({intersectsBounds:h=>Ee.intersectsBox(h),intersectsTriangle:h=>{h.a.applyMatrix4(n),h.b.applyMatrix4(n),h.c.applyMatrix4(n),h.needsUpdate=!0;for(let m=g,x=v+g;m<x;m++)if(N(Nt,3*t.resolveTriangleIndex(m),a,d),Nt.needsUpdate=!0,h.intersectsTriangle(Nt))return!0;return!1}});{const w=Ae(e);for(let h=g,m=v+g;h<m;h++){const x=t.resolveTriangleIndex(h);N(Rt,3*x,a,d),Rt.a.applyMatrix4(ie),Rt.b.applyMatrix4(ie),Rt.c.applyMatrix4(ie),Rt.needsUpdate=!0;for(let b=0,B=w*3;b<B;b+=3)if(N(Nt,b,p,y),Nt.needsUpdate=!0,Rt.intersectsTriangle(Nt))return!0}}}else{const f=U(i),a=k(i,l);return V(f,r,ze),!!(s.intersectsBox(ze)&&In(f,t,e,n,s)||(V(a,r,ze),s.intersectsBox(ze)&&In(a,t,e,n,s)))}}const Ve=new O,_n=new K,se=new K,yo=new D,xo=new D,go=new D,bo=new D;function vo(i,t,e,n={},s={},r=0,o=1/0){t.boundingBox||t.computeBoundingBox(),_n.set(t.boundingBox.min,t.boundingBox.max,e),_n.needsUpdate=!0;const l=i.geometry,c=l.attributes.position,u=l.index,f=t.attributes.position,a=t.index,d=tt.getPrimitive(),p=tt.getPrimitive();let y=yo,g=xo,v=null,w=null;s&&(v=go,w=bo);let h=1/0,m=null,x=null;return Ve.copy(e).invert(),se.matrix.copy(Ve),i.shapecast({boundsTraverseOrder:b=>_n.distanceToBox(b),intersectsBounds:(b,B,A)=>A<h&&A<o?(B&&(se.min.copy(b.min),se.max.copy(b.max),se.needsUpdate=!0),!0):!1,intersectsRange:(b,B)=>{if(t.boundsTree){const A=t.boundsTree;return A.shapecast({boundsTraverseOrder:P=>se.distanceToBox(P),intersectsBounds:(P,_,T)=>T<h&&T<o,intersectsRange:(P,_)=>{for(let T=P,S=P+_;T<S;T++){const I=A.resolveTriangleIndex(T);N(p,3*I,a,f),p.a.applyMatrix4(e),p.b.applyMatrix4(e),p.c.applyMatrix4(e),p.needsUpdate=!0;for(let M=b,z=b+B;M<z;M++){const E=i.resolveTriangleIndex(M);N(d,3*E,u,c),d.needsUpdate=!0;const F=d.distanceToTriangle(p,y,v);if(F<h&&(g.copy(y),w&&w.copy(v),h=F,m=M,x=T),F<r)return!0}}}})}else{const A=Ae(t);for(let P=0,_=A;P<_;P++){N(p,3*P,a,f),p.a.applyMatrix4(e),p.b.applyMatrix4(e),p.c.applyMatrix4(e),p.needsUpdate=!0;for(let T=b,S=b+B;T<S;T++){const I=i.resolveTriangleIndex(T);N(d,3*I,u,c),d.needsUpdate=!0;const M=d.distanceToTriangle(p,y,v);if(M<h&&(g.copy(y),w&&w.copy(v),h=M,m=T,x=P),M<r)return!0}}}}}),tt.releasePrimitive(d),tt.releasePrimitive(p),h===1/0?null:(n.point?n.point.copy(g):n.point=g.clone(),n.distance=h,n.faceIndex=m,s&&(s.point?s.point.copy(w):s.point=w.clone(),s.point.applyMatrix4(Ve),g.applyMatrix4(Ve),s.distance=g.sub(s.point).length(),s.faceIndex=x),n)}function Ai(i,t,e){return i===null?null:(i.point.applyMatrix4(t.matrixWorld),i.distance=i.point.distanceTo(e.ray.origin),i.object=t,i)}const Ce=new K,Fe=new Ot,Bi=new D,Ti=new O,Pi=new D,Sn=["getX","getY","getZ"];class yt extends Kt{static serialize(t,e={}){e={cloneBuffers:!0,...e};const n=t.geometry,s=t._roots,r=t._indirectBuffer,o=n.getIndex(),l={version:1,roots:null,index:null,indirectBuffer:null};return e.cloneBuffers?(l.roots=s.map(c=>c.slice()),l.index=o?o.array.slice():null,l.indirectBuffer=r?r.slice():null):(l.roots=s,l.index=o?o.array:null,l.indirectBuffer=r),l}static deserialize(t,e,n={}){n={setIndex:!0,indirect:!!t.indirectBuffer,...n};const{index:s,roots:r,indirectBuffer:o}=t;t.version||(console.warn("MeshBVH.deserialize: Serialization format has been changed and will be fixed up. It is recommended to regenerate any stored serialized data."),c(r));const l=new yt(e,{...n,[St]:!0});if(l._roots=r,l._indirectBuffer=o||null,n.setIndex){const u=e.getIndex();if(u===null){const f=new ft(t.index,1,!1);e.setIndex(f)}else u.array!==s&&(u.array.set(s),u.needsUpdate=!0)}return l;function c(u){for(let f=0;f<u.length;f++){const a=u[f],d=new Uint32Array(a),p=new Uint16Array(a);for(let y=0,g=a.byteLength/q;y<g;y++){const v=L*y,w=2*v;R(w,p)||(d[v+6]=d[v+6]/L-y)}}}}get primitiveStride(){return 3}get resolveTriangleIndex(){return this.resolvePrimitiveIndex}constructor(t,e={}){e.maxLeafTris&&(console.warn('MeshBVH: "maxLeafTris" option has been deprecated. Use "targetLeafSize", instead.'),e={...e,targetLeafSize:e.maxLeafTris}),super(t,e)}shiftTriangleOffsets(t){return super.shiftPrimitiveOffsets(t)}writePrimitiveBounds(t,e,n){const s=this.geometry,r=this._indirectBuffer,o=s.attributes.position,l=s.index?s.index.array:null,u=(r?r[t]:t)*3;let f=u+0,a=u+1,d=u+2;l&&(f=l[f],a=l[a],d=l[d]);for(let p=0;p<3;p++){const y=o[Sn[p]](f),g=o[Sn[p]](a),v=o[Sn[p]](d);let w=y;g<w&&(w=g),v<w&&(w=v);let h=y;g>h&&(h=g),v>h&&(h=v),e[n+p]=w,e[n+p+3]=h}return e}computePrimitiveBounds(t,e,n){const s=this.geometry,r=this._indirectBuffer,o=s.attributes.position,l=s.index?s.index.array:null,c=o.normalized;if(t<0||e+t-n.offset>n.length/6)throw new Error("MeshBVH: compute triangle bounds range is invalid.");const u=o.array,f=o.offset||0;let a=3;o.isInterleavedBufferAttribute&&(a=o.data.stride);const d=["getX","getY","getZ"],p=n.offset;for(let y=t,g=t+e;y<g;y++){const w=(r?r[y]:y)*3,h=(y-p)*6;let m=w+0,x=w+1,b=w+2;l&&(m=l[m],x=l[x],b=l[b]),c||(m=m*a+f,x=x*a+f,b=b*a+f);for(let B=0;B<3;B++){let A,P,_;c?(A=o[d[B]](m),P=o[d[B]](x),_=o[d[B]](b)):(A=u[m+B],P=u[x+B],_=u[b+B]);let T=A;P<T&&(T=P),_<T&&(T=_);let S=A;P>S&&(S=P),_>S&&(S=_);const I=(S-T)/2,M=B*2;n[h+M+0]=T+I,n[h+M+1]=I+(Math.abs(T)+I)*he}}return n}raycastObject3D(t,e,n=[]){const{material:s}=t;if(s===void 0)return;Ti.copy(t.matrixWorld).invert(),Fe.copy(e.ray).applyMatrix4(Ti),Pi.setFromMatrixScale(t.matrixWorld),Bi.copy(Fe.direction).multiply(Pi);const r=Bi.length(),o=e.near/r,l=e.far/r;if(e.firstHitOnly===!0){let c=this.raycastFirst(Fe,s,o,l);c=Ai(c,t,e),c&&n.push(c)}else{const c=this.raycast(Fe,s,o,l);for(let u=0,f=c.length;u<f;u++){const a=Ai(c[u],t,e);a&&n.push(a)}}return n}refit(t=null){return(this.indirect?uo:js)(this,t)}raycast(t,e=je,n=0,s=1/0){const r=this._roots,o=[],l=this.indirect?fo:eo;for(let c=0,u=r.length;c<u;c++)l(this,c,e,t,o,n,s);return o}raycastFirst(t,e=je,n=0,s=1/0){const r=this._roots;let o=null;const l=this.indirect?ho:io;for(let c=0,u=r.length;c<u;c++){const f=l(this,c,e,t,n,s);f!=null&&(o==null||f.distance<o.distance)&&(o=f)}return o}intersectsGeometry(t,e){let n=!1;const s=this._roots,r=this.indirect?mo:so;for(let o=0,l=s.length;o<l&&(n=r(this,o,t,e),!n);o++);return n}shapecast(t){const e=tt.getPrimitive(),n=super.shapecast({...t,intersectsPrimitive:t.intersectsTriangle,scratchPrimitive:e,iterate:this.indirect?to:Gs});return tt.releasePrimitive(e),n}bvhcast(t,e,n){let{intersectsRanges:s,intersectsTriangles:r}=n;const o=tt.getPrimitive(),l=this.geometry.index,c=this.geometry.attributes.position,u=this.indirect?y=>{const g=this.resolveTriangleIndex(y);N(o,g*3,l,c)}:y=>{N(o,y*3,l,c)},f=tt.getPrimitive(),a=t.geometry.index,d=t.geometry.attributes.position,p=t.indirect?y=>{const g=t.resolveTriangleIndex(y);N(f,g*3,a,d)}:y=>{N(f,y*3,a,d)};if(r){if(!(t instanceof yt))throw new Error('MeshBVH: "intersectsTriangles" callback can only be used with another MeshBVH.');const y=(g,v,w,h,m,x,b,B)=>{for(let A=w,P=w+h;A<P;A++){p(A),f.a.applyMatrix4(e),f.b.applyMatrix4(e),f.c.applyMatrix4(e),f.needsUpdate=!0;for(let _=g,T=g+v;_<T;_++)if(u(_),o.needsUpdate=!0,r(o,f,_,A,m,x,b,B))return!0}return!1};if(s){const g=s;s=function(v,w,h,m,x,b,B,A){return g(v,w,h,m,x,b,B,A)?!0:y(v,w,h,m,x,b,B,A)}}else s=y}return super.bvhcast(t,e,{intersectsRanges:s})}intersectsBox(t,e){return Ce.set(t.min,t.max,e),Ce.needsUpdate=!0,this.shapecast({intersectsBounds:n=>Ce.intersectsBox(n),intersectsTriangle:n=>Ce.intersectsTriangle(n)})}intersectsSphere(t){return this.shapecast({intersectsBounds:e=>t.intersectsBox(e),intersectsTriangle:e=>e.intersectsSphere(t)})}closestPointToGeometry(t,e,n={},s={},r=0,o=1/0){return(this.indirect?vo:lo)(this,t,e,n,s,r,o)}closestPointToPoint(t,e={},n=0,s=1/0){return Ws(this,t,e,n,s)}}const Ii=new O,Lt=new Ot,_i=new Yt(()=>new st),Mn=new D,Si=new D,Re=new $,Dn=new D,Mi=["getX","getY","getZ"];class Di extends Kt{get primitiveStride(){return 2}writePrimitiveBounds(t,e,n){const s=this._indirectBuffer,{geometry:r,primitiveStride:o}=this,l=r.attributes.position,c=r.index,u=c?c.count:l.count;let a=(s?s[t]:t)*o,d=(a+1)%u;c&&(a=c.getX(a),d=c.getX(d));for(let p=0;p<3;p++){const y=l[Mi[p]](a),g=l[Mi[p]](d),v=y<g?y:g,w=y>g?y:g;e[n+p]=v,e[n+p+3]=w}return e}shapecast(t){const e=_i.getPrimitive(),n=super.shapecast({...t,intersectsPrimitive:t.intersectsLine,scratchPrimitive:e,iterate:Ao});return _i.releasePrimitive(e),n}raycastObject3D(t,e,n=[]){const{matrixWorld:s}=t,{firstHitOnly:r}=e;Ii.copy(s).invert(),Lt.copy(e.ray).applyMatrix4(Ii);const l=e.params.Line.threshold/((t.scale.x+t.scale.y+t.scale.z)/3),c=l*l;let u=null,f=1/0;return this.shapecast({boundsTraverseOrder:a=>a.distanceToPoint(Lt.origin),intersectsBounds:a=>{if(Re.copy(a).expandByScalar(l),r){if(!Lt.intersectBox(Re,Dn))return j;let d;return Re.containsPoint(Lt.origin)?d=0:(Dn.applyMatrix4(s),d=e.ray.origin.distanceTo(Dn)),d<f?rt:j}else return Lt.intersectsBox(Re)?rt:j},intersectsLine:(a,d)=>{if(Lt.distanceSqToSegment(a.start,a.end,Mn,Si)>c)return;Mn.applyMatrix4(t.matrixWorld);const y=e.ray.origin.distanceTo(Mn);y<e.near||y>e.far||r&&y>=f||(f=y,d=this.resolvePrimitiveIndex(d),u={distance:y,point:Si.clone().applyMatrix4(s),index:d*this.primitiveStride,face:null,faceIndex:null,barycoord:null,object:t},r||n.push(u))}}),r&&u&&n.push(u),n}}class zi extends Di{get primitiveStride(){return 1}constructor(t,e={}){e={...e,indirect:!0},super(t,e)}}class wo extends zi{getRootRanges(...t){const e=super.getRootRanges(...t);return e.forEach(n=>n.count--),e}}function Ao(i,t,e,n,s,r,o){const{geometry:l,primitiveStride:c}=e,{index:u}=l,f=l.attributes.position,a=u?u.count:f.count;for(let d=i,p=t+i;d<p;d++){let g=e.resolvePrimitiveIndex(d)*c,v=(g+1)%a;if(u&&(g=u.getX(g),v=u.getX(v)),o.start.fromBufferAttribute(f,g),o.end.fromBufferAttribute(f,v),n(o,d,s,r))return!0}return!1}const Ei=new O,wt=new Ot,Vi=new Yt(()=>new D),Ne=new $,zn=new D;class Bo extends Kt{get primitiveStride(){return 1}writePrimitiveBounds(t,e,n){const s=this._indirectBuffer,{geometry:r}=this,o=r.attributes.position,l=r.index;let c=s?s[t]:t;l&&(c=l.getX(c));const u=o.getX(c),f=o.getY(c),a=o.getZ(c);return e[n+0]=u,e[n+1]=f,e[n+2]=a,e[n+3]=u,e[n+4]=f,e[n+5]=a,e}shapecast(t){const e=Vi.getPrimitive(),n=super.shapecast({...t,intersectsPrimitive:t.intersectsPoint,scratchPrimitive:e,iterate:To});return Vi.releasePrimitive(e),n}raycastObject3D(t,e,n=[]){const{geometry:s}=this,{matrixWorld:r}=t,{firstHitOnly:o}=e;Ei.copy(r).invert(),wt.copy(e.ray).applyMatrix4(Ei);const c=e.params.Points.threshold/((t.scale.x+t.scale.y+t.scale.z)/3),u=c*c;let f=null,a=1/0;return this.shapecast({boundsTraverseOrder:d=>d.distanceToPoint(wt.origin),intersectsBounds:d=>{if(Ne.copy(d).expandByScalar(c),o){if(!wt.intersectBox(Ne,zn))return j;let p;return Ne.containsPoint(wt.origin)?p=0:(zn.applyMatrix4(r),p=e.ray.origin.distanceTo(zn)),p<a?rt:j}else return wt.intersectsBox(Ne)?rt:j},intersectsPoint:(d,p)=>{const y=wt.distanceSqToPoint(d);if(y<u){const g=new D;wt.closestPointToPoint(d,g),g.applyMatrix4(r);const v=e.ray.origin.distanceTo(g);if(v<e.near||v>e.far||o&&v>=a)return;a=v,p=this.resolvePrimitiveIndex(p),f={distance:v,distanceToRay:Math.sqrt(y),point:g,index:s.index?s.index.getX(p):p,face:null,faceIndex:null,barycoord:null,object:t},o||n.push(f)}}}),o&&f&&n.push(f),n}}function To(i,t,e,n,s,r,o){const{geometry:l}=e,{index:c}=l,u=l.attributes.position;for(let f=i,a=t+i;f<a;f++){const d=e.resolvePrimitiveIndex(f),p=c?c.array[d]:d;if(o.fromBufferAttribute(u,p),n(o,f,s,r))return!0}return!1}const et=new xt,W=new O,oe=new O,Ci=new $,Ht=new $n,lt=new D,re=new Ot,nt=new qt,Fi={};class Po extends xn{constructor(t,e={}){e={precise:!1,includeInstances:!0,matrixWorld:Array.isArray(t)?new O:t.matrixWorld,targetLeafSize:1,...e},super();const n=new Set;Ri(t,n);const s=Array.from(n),r=Math.ceil(Math.log2(s.length)),o=(1<<r)-1;this.objects=s,this.idBits=r,this.idMask=o,this.primitiveBuffer=null,this.primitiveBufferStride=1,this.precise=e.precise,this.includeInstances=e.includeInstances,this.matrixWorld=e.matrixWorld,this.init(e)}getObjectFromId(t){const{idMask:e,objects:n}=this,s=En(t,e);return n[s]}getInstanceFromId(t){const{idMask:e,idBits:n}=this;return Vn(t,n,e)}init(t){const{objects:e,idBits:n,matrixWorld:s}=this;oe.copy(s).invert(),this.primitiveBuffer=new Uint32Array(this._countPrimitives(e)),this._fillPrimitiveBuffer(e,n,this.primitiveBuffer),super.init(t)}refit(...t){oe.copy(this.matrixWorld).invert(),super.refit(...t)}writePrimitiveBounds(t,e,n){const{primitiveBuffer:s}=this;this._getPrimitiveBoundingBox(s[t],oe,Ci);const{min:r,max:o}=Ci;e[n+0]=r.x,e[n+1]=r.y,e[n+2]=r.z,e[n+3]=o.x,e[n+4]=o.y,e[n+5]=o.z}getRootRanges(){return[{offset:0,count:this.primitiveBuffer.length}]}shapecast(t){return super.shapecast({...t,intersectsPrimitive:t.intersectsObject,scratchPrimitive:null,iterate:Io})}raycast(t,e=[]){const{matrixWorld:n,includeInstances:s}=this,{firstHitOnly:r}=t,o=[];oe.copy(n).invert(),re.copy(t.ray).applyMatrix4(oe);let l=1/0,c=null;return this.shapecast({boundsTraverseOrder:u=>u.distanceToPoint(re.origin),intersectsBounds:u=>{if(r){if(!re.intersectBox(u,lt))return j;let f;return u.containsPoint(re.origin)?f=0:(lt.applyMatrix4(n),f=t.ray.origin.distanceTo(lt)),f<l?rt:j}else return re.intersectsBox(u)?rt:j},intersectsObject(u,f){if(u.visible){if(o.length=0,u.isInstancedMesh&&s)nt.geometry=u.geometry,nt.material=u.material,u.getMatrixAt(f,nt.matrixWorld),nt.matrixWorld.premultiply(u.matrixWorld),nt.raycast(t,o),o.forEach(a=>{a.object=u,a.instanceId=f}),nt.material=null;else if(u.isBatchedMesh&&s){if(!u.getVisibleAt(f))return;const a=u.getGeometryIdAt(f),d=u.getGeometryRangeAt(a,Fi);et.index=u.geometry.index,et.attributes=u.geometry.attributes,et.setDrawRange(d.start,d.count),nt.geometry=et,nt.material=u.material,u.getMatrixAt(f,nt.matrixWorld),nt.matrixWorld.premultiply(u.matrixWorld),nt.raycast(t,o),o.forEach(p=>{p.object=u,p.batchId=f}),nt.material=null,et.index=null,et.attributes=null,et.setDrawRange(0,1/0)}else u.raycast(t,o);r?o.forEach(a=>{a.distance<l&&(l=a.distance,c=a)}):e.push(...o)}}}),r&&c&&e.push(c),e}_getPrimitiveBoundingBox(t,e,n){const{objects:s,idMask:r,idBits:o,precise:l,includeInstances:c}=this,u=En(t,r),f=Vn(t,o,r),a=s[u];if(!c&&(a.isInstancedMesh||a.isBatchedMesh))a.boundingBox||a.computeBoundingBox(),a.boundingSphere||a.computeBoundingSphere(),W.copy(a.matrixWorld).premultiply(e),Ht.copy(a.boundingSphere).applyMatrix4(W),n.copy(a.boundingBox).applyMatrix4(W),Cn(n,Ht);else if(l)if(a.isInstancedMesh)a.getMatrixAt(f,W),W.premultiply(a.matrixWorld).premultiply(e),Ni(a.geometry,W,n);else if(a.isBatchedMesh){const d=a.getGeometryIdAt(f),p=a.getGeometryRangeAt(d,Fi);et.index=a.geometry.index,et.attributes=a.geometry.attributes,et.setDrawRange(p.start,p.count),a.getMatrixAt(f,W),W.premultiply(a.matrixWorld).premultiply(e),Ni(et,W,n),et.attributes=null}else W.copy(a.matrixWorld).premultiply(e),n.setFromObject(a,!0).applyMatrix4(e);else if(a.isInstancedMesh)a.geometry.boundingBox||a.geometry.computeBoundingBox(),a.geometry.boundingSphere||a.geometry.computeBoundingSphere(),a.getMatrixAt(f,W),W.premultiply(a.matrixWorld).premultiply(e),Ht.copy(a.geometry.boundingSphere).applyMatrix4(W),n.copy(a.geometry.boundingBox).applyMatrix4(W),Cn(n,Ht);else if(a.isBatchedMesh){const d=a.getGeometryIdAt(f);a.getMatrixAt(f,W),W.premultiply(a.matrixWorld).premultiply(e),a.getBoundingSphereAt(d,Ht).applyMatrix4(W),a.getBoundingBoxAt(d,n).applyMatrix4(W),Cn(n,Ht)}else n.setFromObject(a,!1).applyMatrix4(e)}_countPrimitives(t){const{includeInstances:e}=this;let n=0;return t.forEach(s=>{if(s.isInstancedMesh&&e)n+=s.count;else if(s.isBatchedMesh&&e){if(!("instanceCount"in s))throw new Error("ObjectBVH: Three.js revision >= r169 is required to use BatchedMesh.");n+=s.instanceCount}else n++}),n}_fillPrimitiveBuffer(t,e,n){const{includeInstances:s}=this;let r=0;t.forEach((o,l)=>{if(o.isInstancedMesh&&s){const c=o.count;for(let u=0;u<c;u++)n[r]=u<<e|l,r++}else if(o.isBatchedMesh&&s){const{instanceCount:c,maxInstanceCount:u}=o;let f=0,a=0;for(;f<c&&a<u;){try{o.getVisibleAt(a),n[r]=a<<e|l,f++,r++}catch{}a++}}else n[r]=l,r++})}}function En(i,t){return i&t}function Vn(i,t,e){return(i&~e)>>>t}function Ri(i,t=new Set){Array.isArray(i)?i.forEach(e=>Ri(e,t)):i.traverse(e=>{(e.isMesh||e.isLine||e.isPoints)&&t.add(e)})}function Ni(i,t,e){e.makeEmpty();const n=i.drawRange,s=i.index,r=i.attributes.position,o=n.start,l=s?s.count:r.count,c=Math.min(l-o,n.count);for(let u=o,f=o+c;u<f;u++){let a=u;s&&(a=s.getX(a)),lt.fromBufferAttribute(r,a).applyMatrix4(t),e.expandByPoint(lt)}return e}function Io(i,t,e,n,s,r){const{primitiveBuffer:o,objects:l,idMask:c,idBits:u}=e;for(let f=i,a=t+i;f<a;f++){const d=o[f],p=En(d,c),y=Vn(d,u,c),g=l[p];if(n(g,y,s,r))return!0}return!1}function Cn(i,t){lt.copy(t.center).addScalar(-t.radius),i.min.max(lt),lt.copy(t.center).addScalar(t.radius),i.max.min(lt)}const Li=new D,Hi=new D,Ui=new D,ut=new Ot,ki=new O,At=new D,Fn=new D,_o=["x","y","z"],Le=parseInt(kt)>=169,So=parseInt(kt)<=161,He=new X,Ue=new X,ke=new X,Oi=new D,qi=new D,Wi=new D;class Mo extends Kt{get primitiveStride(){return 3}constructor(t,e={}){if(!t.isMesh)throw new Error("SkinnedMeshBVH: First argument must be a Mesh.");super(t.geometry,{...e,[St]:!0}),this.mesh=t,e[St]||this.init(e)}writePrimitiveBounds(t,e,n){const{mesh:s,geometry:r}=this,o=this._indirectBuffer,l=r.index?r.index.array:null,u=(o?o[t]:t)*3;let f=u+0,a=u+1,d=u+2;l&&(f=l[f],a=l[a],d=l[d]),s.getVertexPosition(f,Li),s.getVertexPosition(a,Hi),s.getVertexPosition(d,Ui);for(let p=0;p<3;p++){const y=_o[p],g=Li[y],v=Hi[y],w=Ui[y];let h=g;v<h&&(h=v),w<h&&(h=w);let m=g;v>m&&(m=v),w>m&&(m=w),e[n+p]=h,e[n+p+3]=m}return e}shapecast(t){const e=new J;return super.shapecast({...t,intersectsPrimitive:t.intersectsTriangle,scratchPrimitive:e,iterate:Do})}raycastObject3D(t,e,n=[]){const{material:s}=t;if(s===void 0)return;const{matrixWorld:r}=t,{firstHitOnly:o}=e;ki.copy(r).invert(),ut.copy(e.ray).applyMatrix4(ki);let l=null,c=1/0;return this.shapecast({boundsTraverseOrder:u=>u.distanceToPoint(ut.origin),intersectsBounds:u=>{if(o){if(!ut.intersectBox(u,Fn))return j;let f;return u.containsPoint(ut.origin)?f=0:(Fn.applyMatrix4(r),f=e.ray.origin.distanceTo(Fn)),f<c?rt:j}else return ut.intersectsBox(u)?rt:j},intersectsTriangle:(u,f)=>{let a=null;if(s.side===je?a=ut.intersectTriangle(u.a,u.b,u.c,!0,At):s.side===Wn?a=ut.intersectTriangle(u.c,u.b,u.a,!0,At):a=ut.intersectTriangle(u.a,u.b,u.c,!1,At),!a)return;a=a.clone().applyMatrix4(r);const d=e.ray.origin.distanceTo(a);if(d>=e.near&&d<=e.far){if(o&&d>=c)return;const{geometry:p}=this,{index:y}=p,g=this.resolvePrimitiveIndex(f),v=g*3;let w=v+0,h=v+1,m=v+2;y&&(w=y.array[w],h=y.array[h],m=y.array[m]);const x={distance:d,point:a.clone(),object:t,uv:null,uv1:null,normal:null,face:{a:w,b:h,c:m,normal:G.getNormal(u.a,u.b,u.c,new D),materialIndex:0},faceIndex:g};if(Le){const P=new D;G.getBarycoord(At,u.a,u.b,u.c,P),x.barycoord=P}const b=p.attributes.uv,B=p.attributes.uv1,A=p.attributes.normal;if(b){He.fromBufferAttribute(b,w),Ue.fromBufferAttribute(b,h),ke.fromBufferAttribute(b,m),x.uv=new X;const P=G.getInterpolation(At,u.a,u.b,u.c,He,Ue,ke,x.uv);Le||(x.uv=P)}if(B){He.fromBufferAttribute(B,w),Ue.fromBufferAttribute(B,h),ke.fromBufferAttribute(B,m),x.uv1=new X;const P=G.getInterpolation(At,u.a,u.b,u.c,He,Ue,ke,x.uv1);Le||(x.uv1=P),So&&(x.uv2=x.uv1)}if(A){Oi.fromBufferAttribute(A,w),qi.fromBufferAttribute(A,h),Wi.fromBufferAttribute(A,m),x.normal=new D;const P=G.getInterpolation(At,u.a,u.b,u.c,Oi,qi,Wi,x.normal);x.normal.dot(ut.direction)>0&&x.normal.multiplyScalar(-1),Le||(x.normal=P)}c=x.distance,l=x,o||n.push(x)}}}),o&&l&&n.push(l),n}}function Do(i,t,e,n,s,r,o){const{mesh:l,geometry:c}=e,u=c.index?c.index.array:null;for(let f=i,a=t+i;f<a;f++){const d=e.resolvePrimitiveIndex(f);let p=3*d+0,y=3*d+1,g=3*d+2;if(u&&(p=u[p],y=u[y],g=u[g]),l.getVertexPosition(p,o.a),l.getVertexPosition(y,o.b),l.getVertexPosition(g,o.c),o.needsUpdate=!0,n(o,f,s,r))return!0}return!1}const $i=new $,Xi=new O,Rn=new D;class zo extends hs{get isMesh(){return!this.displayEdges}get isLineSegments(){return this.displayEdges}get isLine(){return this.displayEdges}getVertexPosition(...t){return qt.prototype.getVertexPosition.call(this,...t)}constructor(t,e,n=10,s=0){super(),this.material=e,this.geometry=new xt,this.name="BVHRootHelper",this.depth=n,this.displayParents=!1,this.bvh=t,this.displayEdges=!0,this._group=s}raycast(){}update(){const t=this.bvh;this.geometry.dispose(),this.visible=!1,t&&(this.geometry=this.getGeometry(t),this.visible=!0)}getGeometry(t){const e=this._group;let n=null;if(e!==-1)n=this.getBVHBoundPositions(t,e);else{const o=t._roots.map((u,f)=>this.getBVHBoundPositions(t,f)),l=o.reduce((u,f)=>u+f.length,0);n=new Float32Array(l);let c=0;o.forEach(u=>{n.set(u,c),c+=u.length})}const s=this.getBVHBoundIndices(n),r=new xt;return r.setIndex(new ft(s,1,!1)),r.setAttribute("position",new ft(n,3,!1)),r}getBVHBoundIndices(t){const e=t.length/24;let n,s;this.displayEdges?s=new Uint8Array([0,4,1,5,2,6,3,7,0,2,1,3,4,6,5,7,0,1,2,3,4,5,6,7]):s=new Uint8Array([0,1,2,2,1,3,4,6,5,6,7,5,1,4,5,0,4,1,2,3,6,3,7,6,0,2,4,2,6,4,1,5,3,3,5,7]),t.length>65535?n=new Uint32Array(s.length*e):n=new Uint16Array(s.length*e);const r=s.length;for(let o=0;o<e;o++){const l=o*8,c=o*r;for(let u=0;u<r;u++)n[c+u]=l+s[u]}return n}getBVHBoundPositions(t,e=0,n=null){const s=this.depth-1,r=this.displayParents;let o=0;t.traverse((u,f)=>{if(u>=s||f)return o++,!0;r&&o++},e);let l=0;const c=new Float32Array(24*o);return t.traverse((u,f,a)=>{const d=u>=s||f;if(d||r){V(0,a,$i);const{min:p,max:y}=$i;for(let g=-1;g<=1;g+=2){const v=g<0?p.x:y.x;for(let w=-1;w<=1;w+=2){const h=w<0?p.y:y.y;for(let m=-1;m<=1;m+=2){const x=m<0?p.z:y.z;Rn.set(v,h,x),n&&Rn.applyMatrix4(n),Rn.toArray(c,l),l+=3}}}return d}},e),c}}class Xe extends ms{get color(){return this.edgeMaterial.color}get opacity(){return this.edgeMaterial.opacity}set opacity(t){this.edgeMaterial.opacity=t,this.meshMaterial.opacity=t}get objectIndex(){return console.warn('BVHHelper: "objectIndex" has been renamed "instanceId".'),this.instanceId}set objectIndex(t){console.warn('BVHHelper: "objectIndex" has been renamed "instanceId".'),this.instanceId=t}constructor(t=null,e=null,n=10){t instanceof yt&&(n=e||10,e=t,t=null),typeof e=="number"&&(n=e,e=null),super(),this.name="BVHHelper",this.depth=n,this.mesh=t,this.bvh=e,this.displayParents=!1,this.displayEdges=!0,this.instanceId=0,this._roots=[];const s=new ys({color:65416,transparent:!0,opacity:.3,depthWrite:!1}),r=new xs({color:65416,transparent:!0,opacity:.3,depthWrite:!1});r.color=s.color,this.edgeMaterial=s,this.meshMaterial=r,this.update()}update(){const t=this.mesh,e=this.instanceId;let n=this.bvh||t.boundsTree||t.geometry&&t.geometry.boundsTree||null;if(t&&t.isBatchedMesh&&t.boundsTrees&&!n&&e>=0){const r=t._drawInfo[e];r&&(n=t.boundsTrees[r.geometryIndex]||n)}const s=n?n._roots.length:0;for(;this._roots.length>s;){const r=this._roots.pop();r.geometry.dispose(),this.remove(r)}for(let r=0;r<s;r++){const{depth:o,edgeMaterial:l,meshMaterial:c,displayParents:u,displayEdges:f}=this;if(r>=this._roots.length){const d=new zo(n,l,o,r);this.add(d),this._roots.push(d)}const a=this._roots[r];a.bvh=n,a.depth=o,a.displayParents=u,a.displayEdges=f,a.material=f?l:c,a.update()}}updateMatrixWorld(...t){const e=this.mesh,n=this.parent,s=this.instanceId;e!==null&&(e.updateWorldMatrix(!0,!1),n?this.matrix.copy(n.matrixWorld).invert().multiply(e.matrixWorld):this.matrix.copy(e.matrixWorld),(e.isInstancedMesh||e.isBatchedMesh)&&s>=0&&(e.getMatrixAt(s,Xi),this.matrix.multiply(Xi)),this.matrix.decompose(this.position,this.quaternion,this.scale)),super.updateMatrixWorld(...t)}copy(t){this.depth=t.depth,this.mesh=t.mesh,this.bvh=t.bvh,this.opacity=t.opacity,this.color.copy(t.color)}clone(){return new Xe().copy(this)}dispose(){this.edgeMaterial.dispose(),this.meshMaterial.dispose();const t=this.children;for(let e=0,n=t.length;e<n;e++)t[e].geometry.dispose()}}class Eo extends Xe{constructor(...t){console.warn("MeshBVHHelper: Class has been deprecated. Use BVHHelper instead."),super(...t)}}const Nn=new $,ce=new $;function Yi(i){switch(typeof i){case"number":return 8;case"string":return i.length*2;case"boolean":return 4;default:return 0}}function Vo(i){return/(Uint|Int|Float)(8|16|32)Array/.test(i.constructor.name)}function Co(i,t){const e={nodeCount:0,leafNodeCount:0,depth:{min:1/0,max:-1/0},primitives:{min:1/0,max:-1/0},splits:[0,0,0],surfaceAreaScore:0};return i.traverse((n,s,r,o,l)=>{const c=r[3]-r[0],u=r[4]-r[1],f=r[5]-r[2],a=2*(c*u+u*f+f*c);e.nodeCount++,s?(e.leafNodeCount++,e.depth.min=Math.min(n,e.depth.min),e.depth.max=Math.max(n,e.depth.max),e.primitives.min=Math.min(l,e.primitives.min),e.primitives.max=Math.max(l,e.primitives.max),e.surfaceAreaScore+=a*pe*l):(e.splits[o]++,e.surfaceAreaScore+=a*sn)},t),e.primitives.min===1/0&&(e.primitives.min=0,e.primitives.max=0),e.depth.min===1/0&&(e.depth.min=0,e.depth.max=0),e}function Fo(i){return i._roots.map((t,e)=>Co(i,e))}function Ro(i){const t=new Set,e=[i];let n=0;for(;e.length;){const s=e.pop();if(!t.has(s)){t.add(s);for(let r in s){if(!Object.hasOwn(s,r))continue;n+=Yi(r);const o=s[r];o&&(typeof o=="object"||typeof o=="function")?Vo(o)||ci()&&o instanceof SharedArrayBuffer||o instanceof ArrayBuffer?n+=o.byteLength:e.push(o):n+=Yi(o)}}}return n}function No(i){const t=[],e=new Float32Array(6);let n=!0;return i.traverse((s,r,o,l,c)=>{const u={depth:s,isLeaf:r,boundingData:o,offset:l,count:c};t[s]=u,V(0,o,Nn);const f=t[s-1];if(r){i.writePrimitiveRangeBounds(l,c,e,0),ce.min.set(e[0],e[1],e[2]),ce.max.set(e[3],e[4],e[5]);const a=Nn.containsBox(ce);console.assert(a,"Leaf bounds does not fully contain primitives."),n=n&&a}if(f){V(0,f.boundingData,ce);const a=ce.containsBox(Nn);console.assert(a,"Parent bounds does not fully contain child."),n=n&&a}}),n}function Lo(i){const t=[];return i.traverse((e,n,s,r,o)=>{const l={bounds:V(0,s,new $)};n?(l.count=o,l.offset=r):(l.left=null,l.right=null),t[e]=l;const c=t[e-1];c&&(c.left===null?c.left=l:c.right=l)}),t[0]}const Ho=parseInt(kt)>=166,Ut={Mesh:qt.prototype.raycast,Line:Xn.prototype.raycast,LineSegments:Yn.prototype.raycast,LineLoop:Zn.prototype.raycast,Points:Kn.prototype.raycast,BatchedMesh:gs.prototype.raycast},Z=new qt,Oe=[];function Uo(i,t){if(this.isBatchedMesh)ko.call(this,i,t);else{const{geometry:e}=this;if(e.boundsTree)e.boundsTree.raycastObject3D(this,i,t);else{let n;if(this instanceof qt)n=Ut.Mesh;else if(this instanceof Yn)n=Ut.LineSegments;else if(this instanceof Zn)n=Ut.LineLoop;else if(this instanceof Xn)n=Ut.Line;else if(this instanceof Kn)n=Ut.Points;else throw new Error("BVH: Fallback raycast function not found.");n.call(this,i,t)}}}function ko(i,t){if(this.boundsTrees){const e=this.boundsTrees,n=this._drawInfo||this._instanceInfo,s=this._drawRanges||this._geometryInfo,r=this.matrixWorld;Z.material=this.material,Z.geometry=this.geometry;const o=Z.geometry.boundsTree,l=Z.geometry.drawRange;Z.geometry.boundingSphere===null&&(Z.geometry.boundingSphere=new $n);for(let c=0,u=n.length;c<u;c++){if(!this.getVisibleAt(c))continue;const f=n[c].geometryIndex;if(Z.geometry.boundsTree=e[f],this.getMatrixAt(c,Z.matrixWorld).premultiply(r),!Z.geometry.boundsTree){this.getBoundingBoxAt(f,Z.geometry.boundingBox),this.getBoundingSphereAt(f,Z.geometry.boundingSphere);const a=s[f];Z.geometry.setDrawRange(a.start,a.count)}Z.raycast(i,Oe);for(let a=0,d=Oe.length;a<d;a++){const p=Oe[a];p.object=this,p.batchId=c,t.push(p)}Oe.length=0}Z.geometry.boundsTree=o,Z.geometry.drawRange=l,Z.material=null,Z.geometry=null}else Ut.BatchedMesh.call(this,i,t)}function Oo(i={}){const{type:t=yt}=i;return this.boundsTree=new t(this,i),this.boundsTree}function qo(){this.boundsTree=null}function Wo(i=-1,t={}){if(!Ho)throw new Error("BatchedMesh: Three r166+ is required to compute bounds trees.");t={...t,range:null};const e=this._drawRanges||this._geometryInfo,n=this._geometryCount;this.boundsTrees||(this.boundsTrees=new Array(n).fill(null));const s=this.boundsTrees;for(;s.length<n;)s.push(null);if(i<0){for(let r=0;r<n;r++)t.range=e[r],s[r]=new yt(this.geometry,t);return s}else return i<e.length&&(t.range=e[i],s[i]=new yt(this.geometry,t)),s[i]||null}function $o(i=-1){i<0?this.boundsTrees.fill(null):i<this.boundsTrees.length&&(this.boundsTrees[i]=null)}function Xo(i){switch(i){case 1:return"R";case 2:return"RG";case 3:return"RGBA";case 4:return"RGBA"}throw new Error}function Yo(i){switch(i){case 1:return vs;case 2:return bs;case 3:return fe;case 4:return fe}}function Zi(i){switch(i){case 1:return ws;case 2:return Gn;case 3:return Je;case 4:return Je}}class qe extends Qe{constructor(){super(),this.minFilter=_t,this.magFilter=_t,this.generateMipmaps=!1,this.overrideItemSize=null,this._forcedType=null}updateFrom(t){const e=this.overrideItemSize,n=t.itemSize,s=t.count;if(e!==null){if(n*s%e!==0)throw new Error("VertexAttributeTexture: overrideItemSize must divide evenly into buffer length.");t.itemSize=e,t.count=s*n/e}const r=t.itemSize,o=t.count,l=t.normalized,c=t.array.constructor,u=c.BYTES_PER_ELEMENT;let f=this._forcedType,a=r;if(f===null)switch(c){case Float32Array:f=$t;break;case Uint8Array:case Uint16Array:case Uint32Array:f=Wt;break;case Int8Array:case Int16Array:case Int32Array:f=de;break}let d,p,y,g,v=Xo(r);switch(f){case $t:y=1,p=Yo(r),l&&u===1?(g=c,v+="8",c===Uint8Array?d=jn:(d=Jn,v+="_SNORM")):(g=Float32Array,v+="32F",d=$t);break;case de:v+=u*8+"I",y=l?Math.pow(2,c.BYTES_PER_ELEMENT*8-1):1,p=Zi(r),u===1?(g=Int8Array,d=Jn):u===2?(g=Int16Array,d=Bs):(g=Int32Array,d=de);break;case Wt:v+=u*8+"UI",y=l?Math.pow(2,c.BYTES_PER_ELEMENT*8-1):1,p=Zi(r),u===1?(g=Uint8Array,d=jn):u===2?(g=Uint16Array,d=As):(g=Uint32Array,d=Wt);break}a===3&&(p===fe||p===Je)&&(a=4);const w=Math.ceil(Math.sqrt(o))||1,h=a*w*w,m=new g(h),x=t.normalized;t.normalized=!1;for(let b=0;b<o;b++){const B=a*b;m[B]=t.getX(b)/y,r>=2&&(m[B+1]=t.getY(b)/y),r>=3&&(m[B+2]=t.getZ(b)/y,a===4&&(m[B+3]=1)),r>=4&&(m[B+3]=t.getW(b)/y)}t.normalized=x,this.internalFormat=v,this.format=p,this.type=d,this.image.width=w,this.image.height=w,this.image.data=m,this.needsUpdate=!0,this.dispose(),t.itemSize=n,t.count=s}}class Ki extends qe{constructor(){super(),this._forcedType=Wt}}class Zo extends qe{constructor(){super(),this._forcedType=de}}class Gi extends qe{constructor(){super(),this._forcedType=$t}}class Ko{constructor(){this.index=new Ki,this.position=new Gi,this.bvhBounds=new Qe,this.bvhContents=new Qe,this._cachedIndexAttr=null,this.index.overrideItemSize=3}updateFrom(t){const{geometry:e}=t;if(jo(t,this.bvhBounds,this.bvhContents),this.position.updateFrom(e.attributes.position),t.indirect){const n=t._indirectBuffer;if(this._cachedIndexAttr===null||this._cachedIndexAttr.count!==n.length)if(e.index)this._cachedIndexAttr=e.index.clone();else{const s=ai(we(e));this._cachedIndexAttr=new ft(s,1,!1)}Go(e,n,this._cachedIndexAttr),this.index.updateFrom(this._cachedIndexAttr)}else this.index.updateFrom(e.index)}dispose(){const{index:t,position:e,bvhBounds:n,bvhContents:s}=this;t&&t.dispose(),e&&e.dispose(),n&&n.dispose(),s&&s.dispose()}}function Go(i,t,e){const n=e.array,s=i.index?i.index.array:null;for(let r=0,o=t.length;r<o;r++){const l=3*r,c=3*t[r];for(let u=0;u<3;u++)n[l+u]=s?s[c+u]:c+u}}function jo(i,t,e){const n=i._roots;if(n.length!==1)throw new Error("MeshBVHUniformStruct: Multi-root BVHs not supported.");const s=n[0],r=new Uint16Array(s),o=new Uint32Array(s),l=new Float32Array(s),c=s.byteLength/q,u=2*Math.ceil(Math.sqrt(c/2)),f=new Float32Array(4*u*u),a=Math.ceil(Math.sqrt(c)),d=new Uint32Array(2*a*a);for(let p=0;p<c;p++){const y=p*q/4,g=y*2,v=y;for(let w=0;w<3;w++)f[8*p+0+w]=l[v+0+w],f[8*p+4+w]=l[v+3+w];if(R(g,r)){const w=Y(g,r),h=H(y,o),m=Ps|w;d[p*2+0]=m,d[p*2+1]=h}else{const w=o[y+6],h=ye(y,o);d[p*2+0]=h,d[p*2+1]=w}}t.image.data=f,t.image.width=u,t.image.height=u,t.format=fe,t.type=$t,t.internalFormat="RGBA32F",t.minFilter=_t,t.magFilter=_t,t.generateMipmaps=!1,t.needsUpdate=!0,t.dispose(),e.image.data=d,e.image.width=a,e.image.height=a,e.format=Gn,e.type=Wt,e.internalFormat="RG32UI",e.minFilter=_t,e.magFilter=_t,e.generateMipmaps=!1,e.needsUpdate=!0,e.dispose()}const Bt=new D,Tt=new D,Pt=new D,ji=new tn,We=new D,Ln=new D,Ji=new tn,Qi=new tn,$e=new O,ts=new O;function ae(i,t){if(!i&&!t)return;const e=i.count===t.count,n=i.normalized===t.normalized,s=i.array.constructor===t.array.constructor,r=i.itemSize===t.itemSize;if(!e||!n||!s||!r)throw new Error}function le(i,t=null){const e=i.array.constructor,n=i.normalized,s=i.itemSize,r=t===null?i.count:t;return new ft(new e(s*r),s,n)}function es(i,t,e=0){if(i.isInterleavedBufferAttribute){const n=i.itemSize;for(let s=0,r=i.count;s<r;s++){const o=s+e;t.setX(o,i.getX(s)),n>=2&&t.setY(o,i.getY(s)),n>=3&&t.setZ(o,i.getZ(s)),n>=4&&t.setW(o,i.getW(s))}}else{const n=t.array,s=n.constructor,r=n.BYTES_PER_ELEMENT*i.itemSize*e;new s(n.buffer,r,i.array.length).set(i.array)}}function Jo(i,t,e){const n=i.elements,s=t.elements;for(let r=0,o=s.length;r<o;r++)n[r]+=s[r]*e}function ns(i,t,e){const n=i.skeleton,s=i.geometry,r=n.bones,o=n.boneInverses;Ji.fromBufferAttribute(s.attributes.skinIndex,t),Qi.fromBufferAttribute(s.attributes.skinWeight,t),$e.elements.fill(0);for(let l=0;l<4;l++){const c=Qi.getComponent(l);if(c!==0){const u=Ji.getComponent(l);ts.multiplyMatrices(r[u].matrixWorld,o[u]),Jo($e,ts,c)}}return $e.multiply(i.bindMatrix).premultiply(i.bindMatrixInverse),e.transformDirection($e),e}function Hn(i,t,e,n,s){We.set(0,0,0);for(let r=0,o=i.length;r<o;r++){const l=t[r],c=i[r];l!==0&&(Ln.fromBufferAttribute(c,n),e?We.addScaledVector(Ln,l):We.addScaledVector(Ln.sub(s),l))}s.add(We)}function Qo(i,t={useGroups:!1,updateIndex:!1,skipAttributes:[]},e=new xt){const n=i[0].index!==null,{useGroups:s=!1,updateIndex:r=!1,skipAttributes:o=[]}=t,l=new Set(Object.keys(i[0].attributes)),c={};let u=0;e.clearGroups();for(let f=0;f<i.length;++f){const a=i[f];let d=0;if(n!==(a.index!==null))throw new Error("StaticGeometryGenerator: All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.");for(const p in a.attributes){if(!l.has(p))throw new Error('StaticGeometryGenerator: All geometries must have compatible attributes; make sure "'+p+'" attribute exists among all geometries, or in none of them.');c[p]===void 0&&(c[p]=[]),c[p].push(a.attributes[p]),d++}if(d!==l.size)throw new Error("StaticGeometryGenerator: Make sure all geometries have the same number of attributes.");if(s){let p;if(n)p=a.index.count;else if(a.attributes.position!==void 0)p=a.attributes.position.count;else throw new Error("StaticGeometryGenerator: The geometry must have either an index or a position attribute");e.addGroup(u,p,f),u+=p}}if(n){let f=!1;if(!e.index){let a=0;for(let d=0;d<i.length;++d)a+=i[d].index.count;e.setIndex(new ft(new Uint32Array(a),1,!1)),f=!0}if(r||f){const a=e.index;let d=0,p=0;for(let y=0;y<i.length;++y){const g=i[y],v=g.index;if(o[y]!==!0)for(let w=0;w<v.count;++w)a.setX(d,v.getX(w)+p),d++;p+=g.attributes.position.count}}}for(const f in c){const a=c[f];if(!(f in e.attributes)){let y=0;for(const g in a)y+=a[g].count;e.setAttribute(f,le(c[f][0],y))}const d=e.attributes[f];let p=0;for(let y=0,g=a.length;y<g;y++){const v=a[y];o[y]!==!0&&es(v,d,p),p+=v.count}}return e}function tr(i,t){if(i===null||t===null)return i===t;if(i.length!==t.length)return!1;for(let e=0,n=i.length;e<n;e++)if(i[e]!==t[e])return!1;return!0}function er(i){const{index:t,attributes:e}=i;if(t)for(let n=0,s=t.count;n<s;n+=3){const r=t.getX(n),o=t.getX(n+2);t.setX(n,o),t.setX(n+2,r)}else for(const n in e){const s=e[n],r=s.itemSize;for(let o=0,l=s.count;o<l;o+=3)for(let c=0;c<r;c++){const u=s.getComponent(o,c),f=s.getComponent(o+2,c);s.setComponent(o,c,f),s.setComponent(o+2,c,u)}}return i}class nr{constructor(t){this.matrixWorld=new O,this.geometryHash=null,this.boneMatrices=null,this.primitiveCount=-1,this.mesh=t,this.update()}update(){const t=this.mesh,e=t.geometry,n=t.skeleton,s=(e.index?e.index.count:e.attributes.position.count)/3;if(this.matrixWorld.copy(t.matrixWorld),this.geometryHash=e.attributes.position.version,this.primitiveCount=s,n){n.boneTexture||n.computeBoneTexture(),n.update();const r=n.boneMatrices;!this.boneMatrices||this.boneMatrices.length!==r.length?this.boneMatrices=r.slice():this.boneMatrices.set(r)}else this.boneMatrices=null}didChange(){const t=this.mesh,e=t.geometry,n=(e.index?e.index.count:e.attributes.position.count)/3;return!(this.matrixWorld.equals(t.matrixWorld)&&this.geometryHash===e.attributes.position.version&&tr(t.skeleton&&t.skeleton.boneMatrices||null,this.boneMatrices)&&this.primitiveCount===n)}}class ir{constructor(t){Array.isArray(t)||(t=[t]);const e=[];t.forEach(n=>{n.traverseVisible(s=>{s.isMesh&&e.push(s)})}),this.meshes=e,this.useGroups=!0,this.applyWorldTransforms=!0,this.attributes=["position","normal","color","tangent","uv","uv2"],this._intermediateGeometry=new Array(e.length).fill().map(()=>new xt),this._diffMap=new WeakMap}getMaterials(){const t=[];return this.meshes.forEach(e=>{Array.isArray(e.material)?t.push(...e.material):t.push(e.material)}),t}generate(t=new xt){let e=[];const{meshes:n,useGroups:s,_intermediateGeometry:r,_diffMap:o}=this;for(let l=0,c=n.length;l<c;l++){const u=n[l],f=r[l],a=o.get(u);!a||a.didChange(u)?(this._convertToStaticGeometry(u,f),e.push(!1),a?a.update():o.set(u,new nr(u))):e.push(!0)}if(r.length===0){t.setIndex(null);const l=t.attributes;for(const c in l)t.deleteAttribute(c);for(const c in this.attributes)t.setAttribute(this.attributes[c],new ft(new Float32Array(0),4,!1))}else Qo(r,{useGroups:s,skipAttributes:e},t);for(const l in t.attributes)t.attributes[l].needsUpdate=!0;return t}_convertToStaticGeometry(t,e=new xt){const n=t.geometry,s=this.applyWorldTransforms,r=this.attributes.includes("normal"),o=this.attributes.includes("tangent"),l=n.attributes,c=e.attributes;!e.index&&n.index&&(e.index=n.index.clone()),c.position||e.setAttribute("position",le(l.position)),r&&!c.normal&&l.normal&&e.setAttribute("normal",le(l.normal)),o&&!c.tangent&&l.tangent&&e.setAttribute("tangent",le(l.tangent)),ae(n.index,e.index),ae(l.position,c.position),r&&ae(l.normal,c.normal),o&&ae(l.tangent,c.tangent);const u=l.position,f=r?l.normal:null,a=o?l.tangent:null,d=n.morphAttributes.position,p=n.morphAttributes.normal,y=n.morphAttributes.tangent,g=n.morphTargetsRelative,v=t.morphTargetInfluences,w=new Ts;w.getNormalMatrix(t.matrixWorld),n.index&&e.index.array.set(n.index.array);for(let h=0,m=l.position.count;h<m;h++)Bt.fromBufferAttribute(u,h),f&&Tt.fromBufferAttribute(f,h),a&&(ji.fromBufferAttribute(a,h),Pt.fromBufferAttribute(a,h)),v&&(d&&Hn(d,v,g,h,Bt),p&&Hn(p,v,g,h,Tt),y&&Hn(y,v,g,h,Pt)),t.isSkinnedMesh&&(t.applyBoneTransform(h,Bt),f&&ns(t,h,Tt),a&&ns(t,h,Pt)),s&&Bt.applyMatrix4(t.matrixWorld),c.position.setXYZ(h,Bt.x,Bt.y,Bt.z),f&&(s&&Tt.applyNormalMatrix(w),c.normal.setXYZ(h,Tt.x,Tt.y,Tt.z)),a&&(s&&Pt.transformDirection(t.matrixWorld),c.tangent.setXYZW(h,Pt.x,Pt.y,Pt.z,ji.w));for(const h in this.attributes){const m=this.attributes[h];m==="position"||m==="tangent"||m==="normal"||!(m in l)||(c[m]||e.setAttribute(m,le(l[m])),ae(l[m],c[m]),es(l[m],c[m]))}return t.matrixWorld.determinant()<0&&er(e),e}}const is=`

// A stack of uint32 indices can can store the indices for
// a perfectly balanced tree with a depth up to 31. Lower stack
// depth gets higher performance.
//
// However not all trees are balanced. Best value to set this to
// is the trees max depth.
#ifndef BVH_STACK_DEPTH
#define BVH_STACK_DEPTH 60
#endif

#ifndef INFINITY
#define INFINITY 1e20
#endif

// Utilities
uvec4 uTexelFetch1D( usampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

ivec4 iTexelFetch1D( isampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

vec4 texelFetch1D( sampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

vec4 textureSampleBarycoord( sampler2D tex, vec3 barycoord, uvec3 faceIndices ) {

	return
		barycoord.x * texelFetch1D( tex, faceIndices.x ) +
		barycoord.y * texelFetch1D( tex, faceIndices.y ) +
		barycoord.z * texelFetch1D( tex, faceIndices.z );

}

void ndcToCameraRay(
	vec2 coord, mat4 cameraWorld, mat4 invProjectionMatrix,
	out vec3 rayOrigin, out vec3 rayDirection
) {

	// get camera look direction and near plane for camera clipping
	vec4 lookDirection = cameraWorld * vec4( 0.0, 0.0, - 1.0, 0.0 );
	vec4 nearVector = invProjectionMatrix * vec4( 0.0, 0.0, - 1.0, 1.0 );
	float near = abs( nearVector.z / nearVector.w );

	// get the camera direction and position from camera matrices
	vec4 origin = cameraWorld * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec4 direction = invProjectionMatrix * vec4( coord, 0.5, 1.0 );
	direction /= direction.w;
	direction = cameraWorld * direction - origin;

	// slide the origin along the ray until it sits at the near clip plane position
	origin.xyz += direction.xyz * near / dot( direction, lookDirection );

	rayOrigin = origin.xyz;
	rayDirection = direction.xyz;

}
`,ss=`

float dot2( vec3 v ) {

	return dot( v, v );

}

// implementation from https://www.shadertoy.com/view/ttfGWl, though method 2 has been removed
// and is now available at this fork: https://www.shadertoy.com/view/WlB3zW
vec3 closestPointToTriangle( vec3 p, vec3 v0, vec3 v1, vec3 v2, out vec3 barycoord ) {

    vec3 v10 = v1 - v0;
    vec3 v21 = v2 - v1;
    vec3 v02 = v0 - v2;

	vec3 p0 = p - v0;
	vec3 p1 = p - v1;
	vec3 p2 = p - v2;

    vec3 nor = cross( v10, v02 );

    // method 2, in barycentric space
    vec3  q = cross( nor, p0 );
    float d = 1.0 / dot2( nor );
    float u = d * dot( q, v02 );
    float v = d * dot( q, v10 );
    float w = 1.0 - u - v;

	if( u < 0.0 ) {

		w = clamp( dot( p2, v02 ) / dot2( v02 ), 0.0, 1.0 );
		u = 0.0;
		v = 1.0 - w;

	} else if( v < 0.0 ) {

		u = clamp( dot( p0, v10 ) / dot2( v10 ), 0.0, 1.0 );
		v = 0.0;
		w = 1.0 - u;

	} else if( w < 0.0 ) {

		v = clamp( dot( p1, v21 ) / dot2( v21 ), 0.0, 1.0 );
		w = 0.0;
		u = 1.0 - v;

	}

	// output the barycoord in v0, v1, v2 weight order
	barycoord = vec3( w, u, v );
    return u * v1 + v * v2 + w * v0;

}

float distanceToTriangles(
	// geometry info and triangle range
	sampler2D positionAttr, usampler2D indexAttr, uint offset, uint count,

	// point and cut off range
	vec3 point, float closestDistanceSquared,

	// outputs
	inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord, inout float side, inout vec3 outPoint
) {

	bool found = false;
	vec3 localBarycoord;
	for ( uint i = offset, l = offset + count; i < l; i ++ ) {

		uvec3 indices = uTexelFetch1D( indexAttr, i ).xyz;
		vec3 a = texelFetch1D( positionAttr, indices.x ).rgb;
		vec3 b = texelFetch1D( positionAttr, indices.y ).rgb;
		vec3 c = texelFetch1D( positionAttr, indices.z ).rgb;

		// get the closest point and barycoord
		vec3 closestPoint = closestPointToTriangle( point, a, b, c, localBarycoord );
		vec3 delta = point - closestPoint;
		float sqDist = dot2( delta );
		if ( sqDist < closestDistanceSquared ) {

			// set the output results
			closestDistanceSquared = sqDist;
			faceIndices = uvec4( indices.xyz, i );
			faceNormal = normalize( cross( a - b, b - c ) );
			barycoord = localBarycoord;
			outPoint = closestPoint;
			side = sign( dot( faceNormal, delta ) );

		}

	}

	return closestDistanceSquared;

}

float distanceSqToBounds( vec3 point, vec3 boundsMin, vec3 boundsMax ) {

	vec3 clampedPoint = clamp( point, boundsMin, boundsMax );
	vec3 delta = point - clampedPoint;
	return dot( delta, delta );

}

float distanceSqToBVHNodeBoundsPoint( vec3 point, sampler2D bvhBounds, uint currNodeIndex ) {

	uint cni2 = currNodeIndex * 2u;
	vec3 boundsMin = texelFetch1D( bvhBounds, cni2 ).xyz;
	vec3 boundsMax = texelFetch1D( bvhBounds, cni2 + 1u ).xyz;
	return distanceSqToBounds( point, boundsMin, boundsMax );

}

// use a macro to hide the fact that we need to expand the struct into separate fields
#define	bvhClosestPointToPoint(		bvh,		point, maxDistance, faceIndices, faceNormal, barycoord, side, outPoint	)	_bvhClosestPointToPoint(		bvh.position, bvh.index, bvh.bvhBounds, bvh.bvhContents,		point, maxDistance, faceIndices, faceNormal, barycoord, side, outPoint	)

float _bvhClosestPointToPoint(
	// bvh info
	sampler2D bvh_position, usampler2D bvh_index, sampler2D bvh_bvhBounds, usampler2D bvh_bvhContents,

	// point to check
	vec3 point, float maxDistance,

	// output variables
	inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord,
	inout float side, inout vec3 outPoint
 ) {

	// stack needs to be twice as long as the deepest tree we expect because
	// we push both the left and right child onto the stack every traversal
	int pointer = 0;
	uint stack[ BVH_STACK_DEPTH ];
	stack[ 0 ] = 0u;

	float closestDistanceSquared = maxDistance * maxDistance;
	bool found = false;
	while ( pointer > - 1 && pointer < BVH_STACK_DEPTH ) {

		uint currNodeIndex = stack[ pointer ];
		pointer --;

		// check if we intersect the current bounds
		float boundsHitDistance = distanceSqToBVHNodeBoundsPoint( point, bvh_bvhBounds, currNodeIndex );
		if ( boundsHitDistance > closestDistanceSquared ) {

			continue;

		}

		uvec2 boundsInfo = uTexelFetch1D( bvh_bvhContents, currNodeIndex ).xy;
		bool isLeaf = bool( boundsInfo.x & 0xffff0000u );
		if ( isLeaf ) {

			uint count = boundsInfo.x & 0x0000ffffu;
			uint offset = boundsInfo.y;
			closestDistanceSquared = distanceToTriangles(
				bvh_position, bvh_index, offset, count, point, closestDistanceSquared,

				// outputs
				faceIndices, faceNormal, barycoord, side, outPoint
			);

		} else {

			uint leftIndex = currNodeIndex + 1u;
			uint splitAxis = boundsInfo.x & 0x0000ffffu;
			uint rightIndex = currNodeIndex + boundsInfo.y;
			bool leftToRight = distanceSqToBVHNodeBoundsPoint( point, bvh_bvhBounds, leftIndex ) < distanceSqToBVHNodeBoundsPoint( point, bvh_bvhBounds, rightIndex );//rayDirection[ splitAxis ] >= 0.0;
			uint c1 = leftToRight ? leftIndex : rightIndex;
			uint c2 = leftToRight ? rightIndex : leftIndex;

			// set c2 in the stack so we traverse it later. We need to keep track of a pointer in
			// the stack while we traverse. The second pointer added is the one that will be
			// traversed first
			pointer ++;
			stack[ pointer ] = c2;
			pointer ++;
			stack[ pointer ] = c1;

		}

	}

	return sqrt( closestDistanceSquared );

}
`,os=`

#ifndef TRI_INTERSECT_EPSILON
#define TRI_INTERSECT_EPSILON 1e-5
#endif

// Raycasting
bool intersectsBounds( vec3 rayOrigin, vec3 rayDirection, vec3 boundsMin, vec3 boundsMax, out float dist ) {

	// https://www.reddit.com/r/opengl/comments/8ntzz5/fast_glsl_ray_box_intersection/
	// https://tavianator.com/2011/ray_box.html
	vec3 invDir = 1.0 / rayDirection;

	// find intersection distances for each plane
	vec3 tMinPlane = invDir * ( boundsMin - rayOrigin );
	vec3 tMaxPlane = invDir * ( boundsMax - rayOrigin );

	// get the min and max distances from each intersection
	vec3 tMinHit = min( tMaxPlane, tMinPlane );
	vec3 tMaxHit = max( tMaxPlane, tMinPlane );

	// get the furthest hit distance
	vec2 t = max( tMinHit.xx, tMinHit.yz );
	float t0 = max( t.x, t.y );

	// get the minimum hit distance
	t = min( tMaxHit.xx, tMaxHit.yz );
	float t1 = min( t.x, t.y );

	// set distance to 0.0 if the ray starts inside the box
	dist = max( t0, 0.0 );

	return t1 >= dist;

}

bool intersectsTriangle(
	vec3 rayOrigin, vec3 rayDirection, vec3 a, vec3 b, vec3 c,
	out vec3 barycoord, out vec3 norm, out float dist, out float side
) {

	// https://stackoverflow.com/questions/42740765/intersection-between-line-and-triangle-in-3d
	vec3 edge1 = b - a;
	vec3 edge2 = c - a;
	norm = cross( edge1, edge2 );

	float det = - dot( rayDirection, norm );
	float invdet = 1.0 / det;

	vec3 AO = rayOrigin - a;
	vec3 DAO = cross( AO, rayDirection );

	vec4 uvt;
	uvt.x = dot( edge2, DAO ) * invdet;
	uvt.y = - dot( edge1, DAO ) * invdet;
	uvt.z = dot( AO, norm ) * invdet;
	uvt.w = 1.0 - uvt.x - uvt.y;

	// set the hit information
	barycoord = uvt.wxy; // arranged in A, B, C order
	dist = uvt.z;
	side = sign( det );
	norm = side * normalize( norm );

	// add an epsilon to avoid misses between triangles
	uvt += vec4( TRI_INTERSECT_EPSILON );

	return all( greaterThanEqual( uvt, vec4( 0.0 ) ) );

}

bool intersectTriangles(
	// geometry info and triangle range
	sampler2D positionAttr, usampler2D indexAttr, uint offset, uint count,

	// ray
	vec3 rayOrigin, vec3 rayDirection,

	// outputs
	inout float minDistance, inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord,
	inout float side, inout float dist
) {

	bool found = false;
	vec3 localBarycoord, localNormal;
	float localDist, localSide;
	for ( uint i = offset, l = offset + count; i < l; i ++ ) {

		uvec3 indices = uTexelFetch1D( indexAttr, i ).xyz;
		vec3 a = texelFetch1D( positionAttr, indices.x ).rgb;
		vec3 b = texelFetch1D( positionAttr, indices.y ).rgb;
		vec3 c = texelFetch1D( positionAttr, indices.z ).rgb;

		if (
			intersectsTriangle( rayOrigin, rayDirection, a, b, c, localBarycoord, localNormal, localDist, localSide )
			&& localDist < minDistance
		) {

			found = true;
			minDistance = localDist;

			faceIndices = uvec4( indices.xyz, i );
			faceNormal = localNormal;

			side = localSide;
			barycoord = localBarycoord;
			dist = localDist;

		}

	}

	return found;

}

bool intersectsBVHNodeBounds( vec3 rayOrigin, vec3 rayDirection, sampler2D bvhBounds, uint currNodeIndex, out float dist ) {

	uint cni2 = currNodeIndex * 2u;
	vec3 boundsMin = texelFetch1D( bvhBounds, cni2 ).xyz;
	vec3 boundsMax = texelFetch1D( bvhBounds, cni2 + 1u ).xyz;
	return intersectsBounds( rayOrigin, rayDirection, boundsMin, boundsMax, dist );

}

// use a macro to hide the fact that we need to expand the struct into separate fields
#define	bvhIntersectFirstHit(		bvh,		rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist	)	_bvhIntersectFirstHit(		bvh.position, bvh.index, bvh.bvhBounds, bvh.bvhContents,		rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist	)

bool _bvhIntersectFirstHit(
	// bvh info
	sampler2D bvh_position, usampler2D bvh_index, sampler2D bvh_bvhBounds, usampler2D bvh_bvhContents,

	// ray
	vec3 rayOrigin, vec3 rayDirection,

	// output variables split into separate variables due to output precision
	inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord,
	inout float side, inout float dist
) {

	// stack needs to be twice as long as the deepest tree we expect because
	// we push both the left and right child onto the stack every traversal
	int pointer = 0;
	uint stack[ BVH_STACK_DEPTH ];
	stack[ 0 ] = 0u;

	float triangleDistance = INFINITY;
	bool found = false;
	while ( pointer > - 1 && pointer < BVH_STACK_DEPTH ) {

		uint currNodeIndex = stack[ pointer ];
		pointer --;

		// check if we intersect the current bounds
		float boundsHitDistance;
		if (
			! intersectsBVHNodeBounds( rayOrigin, rayDirection, bvh_bvhBounds, currNodeIndex, boundsHitDistance )
			|| boundsHitDistance > triangleDistance
		) {

			continue;

		}

		uvec2 boundsInfo = uTexelFetch1D( bvh_bvhContents, currNodeIndex ).xy;
		bool isLeaf = bool( boundsInfo.x & 0xffff0000u );

		if ( isLeaf ) {

			uint count = boundsInfo.x & 0x0000ffffu;
			uint offset = boundsInfo.y;

			found = intersectTriangles(
				bvh_position, bvh_index, offset, count,
				rayOrigin, rayDirection, triangleDistance,
				faceIndices, faceNormal, barycoord, side, dist
			) || found;

		} else {

			uint leftIndex = currNodeIndex + 1u;
			uint splitAxis = boundsInfo.x & 0x0000ffffu;
			uint rightIndex = currNodeIndex + boundsInfo.y;

			bool leftToRight = rayDirection[ splitAxis ] >= 0.0;
			uint c1 = leftToRight ? leftIndex : rightIndex;
			uint c2 = leftToRight ? rightIndex : leftIndex;

			// set c2 in the stack so we traverse it later. We need to keep track of a pointer in
			// the stack while we traverse. The second pointer added is the one that will be
			// traversed first
			pointer ++;
			stack[ pointer ] = c2;

			pointer ++;
			stack[ pointer ] = c1;

		}

	}

	return found;

}
`,rs=`
struct BVH {

	usampler2D index;
	sampler2D position;

	sampler2D bvhBounds;
	usampler2D bvhContents;

};
`;var sr=Object.freeze({__proto__:null,bvh_distance_functions:ss,bvh_ray_functions:os,bvh_struct_definitions:rs,common_functions:is});const or=rs,rr=ss,cr=`
	${is}
	${os}
`;export{Qn as AVERAGE,xn as BVH,Xe as BVHHelper,sr as BVHShaderGLSL,en as CENTER,nn as CONTAINED,J as ExtendedTriangle,Gi as FloatVertexAttributeTexture,Kt as GeometryBVH,rt as INTERSECTED,Zo as IntVertexAttributeTexture,wo as LineBVH,zi as LineLoopBVH,Di as LineSegmentsBVH,yt as MeshBVH,Eo as MeshBVHHelper,Ko as MeshBVHUniformStruct,j as NOT_INTERSECTED,Po as ObjectBVH,K as OrientedBox,Bo as PointsBVH,ti as SAH,St as SKIP_GENERATION,Mo as SkinnedMeshBVH,ir as StaticGeometryGenerator,Ki as UIntVertexAttributeTexture,qe as VertexAttributeTexture,Uo as acceleratedRaycast,Wo as computeBatchedBoundsTree,Oo as computeBoundsTree,$o as disposeBatchedBoundsTree,qo as disposeBoundsTree,Ro as estimateMemoryInBytes,ui as generateIndirectBuffer,Fo as getBVHExtremes,Lo as getJSONStructure,Ys as getTriangleHitPointInfo,rr as shaderDistanceFunction,cr as shaderIntersectFunction,or as shaderStructs,No as validateBounds};
