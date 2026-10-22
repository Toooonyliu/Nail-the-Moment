import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeArAdjustments } from '../src/ar-design.ts';

const source=()=>Array.from({length:5},(_,i)=>({color:['#9f283f','#f5d8db','#b9bac6','#ffffff','#532a39'][i],length:.72,shape:i===0?'coffin':'almond',finish:'chrome',pattern:'french',accent:'#ffffff',elements:[{id:`pearl-${i}`,kind:'pearl',x:.1,y:.2,scale:1,rotation:20,color:'#fff'}]}));
const preview=(nails)=>nails.map(n=>({...n,color:'#b72e50',length:.74,shape:'round',finish:'gloss',pattern:'solid',elements:[]}));

test('AR length adjustments preserve original chrome, patterns, shapes, colors and movable details',()=>{
  const original=source(),before=structuredClone(original);
  const merged=mergeArAdjustments(original,preview(original),['length']);
  assert.deepEqual(merged,original.map(n=>({...n,length:.74})));
  assert.deepEqual(original,before);
});
test('sequential AR edits and a controls-mode continuation retain prior intentional edits',()=>{
  const original=source();
  const length=mergeArAdjustments(original,preview(original),['length']);
  const color=mergeArAdjustments(length,preview(length),['base']);
  assert.deepEqual(color,original.map(n=>({...n,length:.74,color:'#b72e50'})));
});
test('only explicit shape or material controls replace those source fields',()=>{
  const original=source(),rendered=preview(original);
  assert.deepEqual(mergeArAdjustments(original,rendered,['shape','material']),original.map(n=>({...n,shape:'round',finish:'gloss'})));
  assert.deepEqual(mergeArAdjustments(original,rendered,['unknown','pattern','elements']),original);
});
