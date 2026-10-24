export type DiagramKind = 'workflow' | 'hierarchy' | 'review' | 'sharing' | 'upload' | 'architecture';
export type DiagramNode = {
  id: string; x: number; y: number; w: number; h: number;
  label: string; detail: string; icon: 'folder' | 'film' | 'check' | 'notes' | 'link' | 'lock' | 'send' | 'code' | 'store' | 'server';
  shape?: 'folder' | 'media' | 'store'; accent?: boolean; takes?: boolean;
};
type Graph = { width: number; height: number; nodes: DiagramNode[]; paths: string[]; labels?: { x: number; y: number; text: string }[] };
type Diagram = { title: string; description: string; wide: Graph; narrow: Graph };
const node = (id: string, x: number, y: number, w: number, h: number, label: string, detail: string, icon: DiagramNode['icon'], extra: Partial<DiagramNode> = {}): DiagramNode => ({ id, x, y, w, h, label, detail, icon, ...extra });

export const diagrams: Record<DiagramKind, Diagram> = {
  workflow: {
    title: 'The everyday review flow',
    description: 'Choose a project and folder, upload media, wait for Ready, review and choose a take, then deliberately share it. Revisions stay with the same asset.',
    wide: { width: 832, height: 416, nodes: [
      node('place',24,40,200,120,'Project & folder','Choose the destination','folder',{shape:'folder'}),
      node('upload',288,40,224,120,'Upload media','Video or still image','film',{shape:'media'}),
      node('ready',576,40,232,120,'Ready for review','Upload + processing finished','check',{accent:true}),
      node('review',480,256,328,120,'Review & choose a take','Notes, rating, shortlist and decision','notes',{shape:'media'}),
      node('share',24,256,328,120,'Share deliberately','Private review or explicit publication','link'),
    ], paths: ['M224 100H288','M512 100H576','M692 160V248','M480 316H360'] },
    narrow: { width:320,height:816,nodes: [
      node('place',24,24,272,112,'Project & folder','Choose the destination','folder',{shape:'folder'}),
      node('upload',24,184,272,112,'Upload media','Video or still image','film',{shape:'media'}),
      node('ready',24,344,272,112,'Ready for review','Upload + processing finished','check',{accent:true}),
      node('review',24,504,272,112,'Review & choose a take','Notes, rating and decision','notes',{shape:'media'}),
      node('share',24,664,272,112,'Share deliberately','Private link or publish','link'),
    ],paths:['M160 136V176','M160 296V336','M160 456V496','M160 616V656'] },
  },
  hierarchy: {
    title:'A project contains folders; an asset contains takes',
    description:'Blood Rush is the project. EP101 is an episode folder containing the Parking Lot scene folder. Shot 0020 is one asset with v001, v002 and v003 stored as versions. References are a separate project folder.',
    wide:{width:832,height:432,nodes:[
      node('project',24,32,216,104,'Blood Rush','Project · BLR','folder',{shape:'folder'}),
      node('episode',304,32,232,104,'The Late Shift','Episode folder · EP101','folder',{shape:'folder'}),
      node('scene',600,32,208,104,'Parking Lot','Scene folder · 010 PRL','folder',{shape:'folder'}),
      node('references',24,256,216,120,'_References','Supporting images','folder',{shape:'folder'}),
      node('asset',400,232,408,160,'BLR_EP101_PRL_0020','One asset · shot 20','film',{shape:'media',accent:true,takes:true}),
    ],paths:['M240 84H296','M536 84H592','M704 136V176Q704 184 696 184H612Q604 184 604 192V224','M132 136V248']},
    narrow:{width:320,height:824,nodes:[
      node('project',24,24,272,104,'Blood Rush','Project · BLR','folder',{shape:'folder'}),
      node('episode',24,184,272,104,'The Late Shift','Episode folder · EP101','folder',{shape:'folder'}),
      node('scene',24,344,272,104,'Parking Lot','Scene folder · 010 PRL','folder',{shape:'folder'}),
      node('asset',24,504,272,152,'BLR_EP101_PRL_0020','One asset · shot 20','film',{shape:'media',accent:true,takes:true}),
      node('references',24,712,272,88,'_References','Separate supporting images','folder',{shape:'folder'}),
    ],paths:['M160 128V176','M160 288V336','M160 448V496','M24 76H16Q8 76 8 84V748Q8 756 16 756H24']},
  },
  review:{
    title:'One asset, shared feedback, separate take metadata',
    description:'Notes, rating and shortlist belong to the asset. Each take has its own prompt, model and references. v003 is the current pick; choosing it preserves v001 and v002.',
    wide:{width:832,height:400,nodes:[
      node('asset',24,24,280,112,'The asset','Stable shot / review identity','film',{shape:'media'}),
      node('feedback',496,24,312,112,'Shared feedback','Notes · rating · shortlist','notes'),
      node('v1',24,248,224,112,'v001','Its prompt, model & references','film',{shape:'media'}),
      node('v2',312,248,224,112,'v002','Its prompt, model & references','film',{shape:'media'}),
      node('v3',600,248,208,112,'v003 · current pick','Its own creative metadata','check',{shape:'media',accent:true}),
    ],paths:['M304 80H488','M96 136V184Q96 192 104 192H128Q136 192 136 200V240','M164 136V208Q164 216 172 216H416Q424 216 424 224V240','M232 136V160Q232 168 240 168H696Q704 168 704 176V240']},
    narrow:{width:320,height:544,nodes:[
      node('asset',24,24,272,112,'The asset','Stable shot / review identity','film',{shape:'media'}),
      node('feedback',24,192,272,104,'Shared feedback','Notes · rating · shortlist','notes'),
      node('versions',24,368,272,152,'Stored takes','Each has its own creative metadata','film',{shape:'media',accent:true,takes:true}),
    ],paths:['M160 136V184','M24 80H16Q8 80 8 88V436Q8 444 16 444H24']},
  },
  sharing:{
    title:'Three ways to share, three different permissions',
    description:'A private review link invites feedback on a project. Trailer Feed publication requires explicit ready-version consent. Video embeds require an approved ready version and allowed site origins.',
    wide:{width:832,height:384,nodes:[
      node('source',24,136,232,112,'Your media','Stays in Review Room','film',{shape:'media',accent:true}),
      node('private',440,24,368,88,'Private review link','Invite people to watch and comment','lock'),
      node('trailer',440,152,368,88,'Trailer Feed','Publish exact ready versions explicitly','send'),
      node('embed',440,280,368,88,'Video embed / showcase','Approved take + allowed site origins','code'),
    ],paths:['M256 160H320Q328 160 328 152V76Q328 68 336 68H432','M256 192H432','M256 224H312Q320 224 320 232V316Q320 324 328 324H432']},
    narrow:{width:320,height:616,nodes:[
      node('source',48,24,248,112,'Your media','Stays in Review Room','film',{shape:'media',accent:true}),
      node('private',48,216,248,104,'Private review link','Watch, comment and decide','lock'),
      node('trailer',48,352,248,104,'Trailer Feed','Explicit ready-version consent','send'),
      node('embed',48,488,248,104,'Video embed / showcase','Approved take + allowed sites','code'),
    ],paths:['M48 108H32Q24 108 24 116V260Q24 268 32 268H40','M48 80H24Q16 80 16 88V396Q16 404 24 404H40','M48 52H16Q8 52 8 60V532Q8 540 16 540H40']},
  },
  upload:{
    title:'The upload handoffs',
    description:'Resolve catalog IDs, prepare the original and JPEG preview, begin one upload session, transfer to storage, complete that same session and wait for readiness. Reuse keys and sessions on retries.',
    wide:{width:832,height:416,nodes:[
      node('ids',24,32,216,112,'Resolve IDs','Project, folder and scope','folder',{shape:'folder'}),
      node('prepare',304,32,224,112,'Prepare the files','Original + JPEG + SHA-256','film',{shape:'media'}),
      node('begin',592,32,216,112,'Begin session','Record idempotency key','code'),
      node('put',592,264,216,112,'Transfer bytes','Use the signed storage URLs','store',{shape:'store'}),
      node('complete',304,264,224,112,'Complete session','Reuse the same session ID','check'),
      node('ready',24,264,216,112,'Ready to review','After processing succeeds','check',{accent:true}),
    ],paths:['M240 88H296','M528 88H584','M700 144V256','M592 320H536','M304 320H248']},
    narrow:{width:320,height:984,nodes:[
      node('ids',24,24,272,104,'Resolve IDs','Project, folder and scope','folder',{shape:'folder'}),
      node('prepare',24,184,272,104,'Prepare the files','Original + JPEG + SHA-256','film',{shape:'media'}),
      node('begin',24,344,272,104,'Begin session','Record idempotency key','code'),
      node('put',24,504,272,104,'Transfer bytes','Signed storage URLs','store',{shape:'store'}),
      node('complete',24,664,272,104,'Complete session','Reuse the same session ID','check'),
      node('ready',24,824,272,112,'Ready to review','After processing succeeds','check',{accent:true}),
    ],paths:['M160 128V176','M160 288V336','M160 448V496','M160 608V656','M160 768V816']},
  },
  architecture:{
    title:'Where the work happens',
    description:'Control and processing map: SvelteKit authorizes requests, Convex owns catalog records, and RustFS owns bytes. Workers store derivatives in RustFS and report readiness to Convex. The separate upload map shows direct signed byte transfers from the uploader to storage.',
    wide:{width:832,height:576,nodes:[
      node('browser',24,24,176,104,'Browser','Review & upload','film',{shape:'media'}),
      node('app',288,24,216,104,'SvelteKit','Authorize each request','server',{accent:true}),
      node('catalog',24,248,216,112,'Convex','Identity & review state','store',{shape:'store'}),
      node('storage',584,248,224,112,'RustFS','Originals & previews','store',{shape:'store'}),
      node('worker',288,440,232,112,'Trigger / FFmpeg','Prepare derivatives','server'),
    ],paths:['M200 76H280','M344 128V184Q344 192 336 192H140Q132 192 132 200V240','M448 128V184Q448 192 456 192H688Q696 192 696 200V240','M396 128V432','M288 496H272Q264 496 264 488V400Q264 392 256 392H140Q132 392 132 384V368','M520 496H544Q552 496 552 488V400Q552 392 560 392H688Q696 392 696 384V368'],labels:[{x:228,y:176,text:'Read / write'},{x:592,y:176,text:'Authorize'},{x:440,y:320,text:'Video job'},{x:184,y:416,text:'Readiness'},{x:648,y:416,text:'Derivatives'}]},
    narrow:{width:320,height:704,nodes:[
      node('browser',24,24,272,88,'Browser','Review & upload','film',{shape:'media'}),
      node('app',24,176,272,104,'SvelteKit','Authorize each request','server',{accent:true}),
      node('catalog',24,384,128,112,'Convex','Catalog records','store',{shape:'store'}),
      node('storage',168,384,128,112,'RustFS','Media bytes','store',{shape:'store'}),
      node('worker',24,584,272,104,'Trigger / FFmpeg','Prepare derivatives','server'),
    ],paths:['M160 112V168','M88 280V376','M232 280V376','M24 228H16Q8 228 8 236V620Q8 628 16 628H24','M232 584V504','M88 584V504'],labels:[{x:88,y:328,text:'Read / write'},{x:232,y:328,text:'Authorize'},{x:88,y:548,text:'Readiness'},{x:232,y:548,text:'Derivatives'}]},
  },
};
