export function parseObjModel(source: string) {
  if (source.length > 4 * 1024 * 1024) throw new Error("Use an OBJ model smaller than 4 MB.");
  const points: number[][] = []; const faces: number[][] = [];
  for (const line of source.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "v") {
      const point = parts.slice(1,4).map(Number);
      if (point.length !== 3 || point.some(value => !Number.isFinite(value) || Math.abs(value) > 1e12)) throw new Error("Invalid model coordinates.");
      points.push(point); if (points.length > 50000) throw new Error("Use a model with at most 50,000 vertices.");
    } else if (parts[0] === "f") {
      if (parts.length < 4 || parts.length > 65) throw new Error("Unsupported model face.");
      const face = parts.slice(1).map(part => { const raw = part.split("/")[0]; if (!/^-?\d+$/.test(raw)) throw new Error("Invalid model index."); const index=Number(raw); return index < 0 ? points.length+index : index-1; });
      if (face.some(index => index < 0 || index >= points.length)) throw new Error("Model references a missing vertex.");
      for (let i=1;i<face.length-1;i++) { faces.push([face[0],face[i],face[i+1]]); if (faces.length>100000) throw new Error("Use a model with at most 100,000 triangles."); }
    }
  }
  if (!points.length || !faces.length) throw new Error("No supported OBJ mesh was found.");
  const minimum=[Infinity,Infinity,Infinity],maximum=[-Infinity,-Infinity,-Infinity];
  for(const point of points)for(let axis=0;axis<3;axis++){minimum[axis]=Math.min(minimum[axis],point[axis]);maximum[axis]=Math.max(maximum[axis],point[axis]);}
  const center=minimum.map((value,index)=>(value+maximum[index])/2),extent=Math.max(...maximum.map((value,index)=>value-minimum[index]));
  if(extent<1e-12)throw new Error("This model has no visible extent.");
  const vertices:number[]=[];
  for(const face of faces){const [a,b,c]=face.map(index=>points[index].map((value,axis)=>(value-center[axis])/extent*1.5));const u=b.map((value,axis)=>value-a[axis]),v=c.map((value,axis)=>value-a[axis]);const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const length=Math.hypot(...normal)||1;for(const point of [a,b,c])vertices.push(...point,...normal.map(value=>value/length));}
  return new Float32Array(vertices);
}
