import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {initialData,migrateData,createMoment} from '../src/studio-data.ts';
import {samplePhotoCredit} from '../src/moment-photo-credits.ts';

test('every bundled memory points at an existing real photograph, including early sample records',()=>{
 for(const moment of initialData().moments){
  assert.match(moment.photo,/^\/assets\/moments\/(?:imgPhoto\d*\.png|[\w-]+\.jpg)$/);
  assert.ok(existsSync(new URL(`../public${moment.photo}`,import.meta.url)));
 }
 const manifest=JSON.parse(readFileSync(new URL('../public/assets/moments/SOURCES.json',import.meta.url)));
 assert.equal(manifest.photos.length,11);
});

test('old bundled model photos migrate to real sample photos without changing their history or personal records',()=>{
 const data=initialData();
 const old={...data.moments.find(m=>m.id==='demo-birthday'),photo:'my-chrome-look.png',note:'Keep my note',title:'My edited title'};
 const personal=createMoment({title:'My actual manicure',photo:'data:image/jpeg;base64,personal',date:'2025-12-31',note:'My own hand'});
 const editedSample={...data.moments[0],photo:'data:image/jpeg;base64,changed-photo',occasion:'My occasion'};
 data.moments=[old,personal,editedSample];
 const next=migrateData(data);
 assert.equal(next.moments[0].photo,'/assets/moments/kris-atomic-manicure.jpg');
 assert.equal(next.moments[0].title,old.title);assert.equal(next.moments[0].date,old.date);assert.equal(next.moments[0].note,old.note);
 assert.deepEqual(next.moments[1],personal);assert.deepEqual(next.moments[2],editedSample);
 assert.deepEqual(migrateData(next),next);
 assert.deepEqual(migrateData({...data,moments:[]}).moments,[]);
});

test('photographer credits describe only known sample photographs',()=>{
 const web=initialData().moments.find(m=>m.id==='demo-reset');
 assert.equal(samplePhotoCredit(web).name,'Iwaria Inc. on Unsplash');
 assert.equal(samplePhotoCredit({...web,isDemo:false}),null);
 assert.equal(samplePhotoCredit(initialData().moments[0]),null);
});
