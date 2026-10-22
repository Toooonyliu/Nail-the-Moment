import {test} from 'node:test';
import assert from 'node:assert/strict';
import {addPhotoDesign,initialData,migrateData,createProject,inspirations} from '../src/studio-data.ts';
import {canonicalHand,inspirationPreview} from '../src/canonical-hand.ts';
import {timelinePosition,timelineIndex} from '../src/timeline-progress.ts';

test('a photo is saved as an editable design immediately, with the original retained once',()=>{
 const data=initialData();
 const photo={id:'upload-test',title:'My manicure',artist:'',image:'data:image/jpeg;base64,photo',palette:['#ff0088','#ffeeee'],source:'upload',color:'',style:'',tags:[]};
 const first=addPhotoDesign(data,photo);
 assert.equal(first.data.uploads[0].image,photo.image);
 assert.equal(first.data.projects[0].sourceId,photo.id);
 assert.equal(first.project.nails[0].color,'#ff0088');
 assert.equal(first.project.nails.length,5);
 assert.equal(data.projects.length,0);
 assert.equal(data.uploads.length,0);
 const changed={...first.project,name:'Edited by me'};
 const again=addPhotoDesign({...first.data,projects:[changed]},photo);
 assert.equal(again.data.projects.length,1);
 assert.equal(again.project.name,'Edited by me');
 assert.equal(again.data.uploads.length,1);
 assert.deepEqual(first.data.moments,data.moments);
});

test('older uploaded photos acquire a Design entry without replacing projects, memories or an empty collection',()=>{
 const raw=initialData();raw.version=5;
 const existing=createProject(inspirations[0]);raw.projects=[existing];raw.draft=existing;
 raw.savedIds=[];raw.moments=[];
 raw.uploads=[{id:'upload-old',title:'Older photo',image:'data:image/jpeg;base64,older',palette:['#225588'],source:'upload',artist:'',color:'',style:'',tags:[]}];
 const next=migrateData(raw);
 assert.equal(next.version,7);assert.equal(next.projects.length,2);
 assert.equal(next.projects[0].id,existing.id);assert.equal(next.draft.id,existing.id);
 assert.equal(next.projects[1].sourceId,'upload-old');assert.equal(next.projects[1].nails[0].color,'#225588');
 assert.deepEqual(next.savedIds,[]);assert.deepEqual(next.moments,[]);
 assert.equal(migrateData(next).projects.length,2);
});

test('Studio reference previews share the canonical hand while Saved keeps original photos',()=>{
 assert.equal(canonicalHand.side,'right');
 for(const source of inspirations){assert.match(inspirationPreview(source),/^\/assets\/canonical\//);assert.equal(inspirationPreview(source,true),source.image);}

});

test('timeline preserves continuous positions and reaches both ends across any collection size',()=>{
 assert.equal(timelinePosition(12.75,20),12.75);
 assert.equal(timelineIndex(12.75,20),13);
 assert.equal(timelinePosition(-50,20),0);assert.equal(timelinePosition(100,20),19);
 assert.equal(timelinePosition(1,0),0);assert.equal(timelinePosition(15,1),0);
 assert.equal(timelinePosition(NaN,20),0);
});
