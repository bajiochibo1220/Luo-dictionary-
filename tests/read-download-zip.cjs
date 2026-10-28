const assert=require('node:assert/strict');
module.exports=function unzip(buffer){
 const end=buffer.lastIndexOf(Buffer.from('504b0606','hex'));assert.ok(end>=0,'ZIP64 directory exists');let pos=Number(buffer.readBigUInt64LE(end+48));const count=Number(buffer.readBigUInt64LE(end+32)),files={};
 for(let i=0;i<count;i++){assert.equal(buffer.readUInt32LE(pos),0x02014b50);const method=buffer.readUInt16LE(pos+10),size=buffer.readUInt32LE(pos+20),nameLength=buffer.readUInt16LE(pos+28),extra=buffer.readUInt16LE(pos+30),comment=buffer.readUInt16LE(pos+32),offset=buffer.readUInt32LE(pos+42),name=buffer.subarray(pos+46,pos+46+nameLength).toString();const start=offset+30+buffer.readUInt16LE(offset+26)+buffer.readUInt16LE(offset+28);let bytes=buffer.subarray(start,start+size);if(method===8)bytes=require('node:zlib').inflateRawSync(bytes);files[name]=bytes;pos+=46+nameLength+extra+comment;}
 return files;
};
