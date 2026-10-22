import test from 'node:test';
import assert from 'node:assert/strict';
import {initialData,migrateData,personalTryOns,createProject,inspirations,addPhotoDesign} from '../src/studio-data.ts';

test('personal try-ons contain real personal records, never 3D drafts, inspiration or bundled memories',()=>{
 const data=initialData();
 data.projects=[{...createProject(inspirations[0]),preview:'data:image/png;base64,render'}];
 data.tryOnPhotos=[{id:'mine',title:'My fingers',image:'data:image/jpeg;base64,real-photo',date:'2026-10-21'}];
 data.moments.push({id:'real',title:'Same photo in diary',photo:'data:image/jpeg;base64,real-photo',date:'2026-10-21',note:'',isDemo:false});
 data.moments.push({id:'other-real',title:'Another pose',photo:'data:image/jpeg;base64,other-pose',date:'2026-10-20',note:'',isDemo:false});
 const photos=personalTryOns(data);
 assert.equal(photos.length,2);assert.equal(photos[0].id,'mine');
 assert.ok(photos.every(photo=>!photo.image.includes('render')&&!photo.image.includes('/canonical/')));
 assert.equal(personalTryOns(initialData()).length,0);
});

test('v6 migration keeps uploads and editable projects recoverable in separate collections',()=>{
 const data=initialData();data.version=6;
 const source={id:'old-upload',title:'My inspiration',artist:'',image:'data:image/jpeg;base64,original',source:'upload',palette:['#112233'],color:'',style:'',tags:[]};
 data.uploads=[source];const project=createProject(source);project.name='My edited draft';data.projects=[project];data.draft=project;
 const next=migrateData(data);
 assert.equal(next.version,7);assert.ok(next.savedIds.includes(source.id));
 assert.equal(next.projects.length,1);assert.equal(next.projects[0].name,project.name);
 assert.equal(next.uploads[0].image,source.image);assert.equal(next.draft.id,project.id);
 assert.deepEqual(personalTryOns(next),[]);assert.deepEqual(migrateData(next),next);
});

test('new personal photos survive reload and ordinary inspiration never becomes a try-on or automatic draft',()=>{
 const data=initialData();data.tryOnPhotos=[{id:'photo',title:'My manicure',image:'data:image/jpeg;base64,real',date:'2026-10-21',palette:['#112233']}];
 data.uploads=[{id:'inspo',title:'Reference',image:'data:image/jpeg;base64,inspo',source:'upload',artist:'',color:'',style:'',tags:[]}];data.savedIds=['inspo'];
 const next=migrateData(data);
 assert.equal(next.projects.length,0);assert.equal(next.tryOnPhotos[0].image,data.tryOnPhotos[0].image);
 assert.equal(personalTryOns(next).length,1);
 const imported=addPhotoDesign(next,data.uploads[0]);
 assert.equal(imported.data.projects.length,1);assert.equal(personalTryOns(imported.data).length,1);
});


test('the early two-sample archive regains Gamma years once, while personal and empty diaries stay intact',()=>{
 const old=initialData();delete old.sampleArchiveRevision;
 old.moments=old.moments.filter(m=>['demo-birthday','demo-reset'].includes(m.id));old.moments[0].note='My edited sample note';
 const next=migrateData(old);
 assert.deepEqual([...new Set(next.moments.map(m=>m.date.slice(0,4)))].sort(),['2024','2025','2026']);
 assert.equal(next.moments.find(m=>m.id===old.moments[0].id).note,'My edited sample note');
 assert.equal(next.sampleArchiveRevision,1);
 assert.deepEqual(migrateData({...next,moments:next.moments.filter(m=>m.id==='demo-birthday')}).moments,next.moments.filter(m=>m.id==='demo-birthday'));
 assert.deepEqual(migrateData({...old,moments:[]}).moments,[]);
 const personal={id:'mine',title:'My real set',photo:'data:image/jpeg;base64,mine',date:'2026-10-21',note:'',isDemo:false};
 assert.deepEqual(migrateData({...old,moments:[personal]}).moments,[personal]);
});
