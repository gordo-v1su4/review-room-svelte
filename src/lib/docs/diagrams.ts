export type DiagramKind = 'workflow' | 'hierarchy' | 'review' | 'sharing' | 'upload' | 'architecture';
export type DiagramNode = {
  id: string; x: number; y: number; w: number; h: number;
  label: string; detail: string;
  icon: 'folder' | 'film' | 'check' | 'notes' | 'link' | 'lock' | 'send' | 'code' | 'store' | 'server';
  accent?: boolean; takes?: boolean;
};
type Graph = { width: number; height: number; nodes: DiagramNode[]; paths: string[]; labels?: { x: number; y: number; text: string }[]; zones?: { x: number; y: number; w: number; h: number; label: string }[] };
type Diagram = { title: string; description: string; wide: Graph; narrow: Graph };

export const diagrams: Record<DiagramKind, Diagram> = {
  hierarchy: {
    title: "A project contains folders; an asset contains takes",
    description: "Blood Rush is the project. EP101 is an episode folder containing the Parking Lot scene folder. Shot 0020 is one asset with v001, v002 and v003 stored as versions. References are a separate project folder.",
    wide: { width: 960, height: 332,
      nodes: [
        {"id":"project","x":32,"y":32,"w":240,"h":88,"label":"Blood Rush","detail":"Project · BLR","icon":"folder"},
        {"id":"episode","x":360,"y":32,"w":240,"h":88,"label":"The Late Shift","detail":"Episode folder · EP101","icon":"folder"},
        {"id":"scene","x":688,"y":32,"w":240,"h":88,"label":"Parking Lot","detail":"Scene folder · 010 PRL","icon":"folder"},
        {"id":"references","x":32,"y":212,"w":240,"h":88,"label":"_References","detail":"Separate supporting images","icon":"folder"},
        {"id":"asset","x":520,"y":196,"w":408,"h":108,"label":"BLR_EP101_PRL_0020","detail":"One asset · shot 20","icon":"film","accent":true,"takes":true}
      ],
      paths: ["M272 76H352","M600 76H680","M808 120V152Q808 160 800 160H732Q724 160 724 168V188","M152 120V204"]
    },
    narrow: { width: 360, height: 744,
      nodes: [
        {"id":"project","x":48,"y":24,"w":280,"h":88,"label":"Blood Rush","detail":"Project · BLR","icon":"folder"},
        {"id":"episode","x":48,"y":160,"w":280,"h":88,"label":"The Late Shift","detail":"Episode folder · EP101","icon":"folder"},
        {"id":"scene","x":48,"y":296,"w":280,"h":88,"label":"Parking Lot","detail":"Scene folder · 010 PRL","icon":"folder"},
        {"id":"asset","x":48,"y":432,"w":280,"h":108,"label":"BLR_EP101_PRL_0020","detail":"One asset · shot 20","icon":"film","accent":true,"takes":true},
        {"id":"references","x":48,"y":624,"w":280,"h":88,"label":"_References","detail":"Separate supporting images","icon":"folder"}
      ],
      paths: ["M188 112V152","M188 248V288","M188 384V424","M48 68H20Q12 68 12 76V660Q12 668 20 668H40"]
    }
  },
  review: {
    title: "One asset, shared feedback, separate take metadata",
    description: "Notes, rating and shortlist belong to the asset. Each take has its own prompt, model and references. v003 is the current pick; choosing it preserves v001 and v002.",
    wide: { width: 960, height: 320,
      nodes: [
        {"id":"asset","x":32,"y":32,"w":256,"h":88,"label":"The asset","detail":"Stable shot / review identity","icon":"film"},
        {"id":"feedback","x":624,"y":32,"w":304,"h":88,"label":"Shared feedback","detail":"Notes · rating · shortlist","icon":"notes"},
        {"id":"v1","x":32,"y":216,"w":256,"h":80,"label":"v001","detail":"Its prompt, model & references","icon":"film"},
        {"id":"v2","x":352,"y":216,"w":256,"h":80,"label":"v002","detail":"Its prompt, model & references","icon":"film"},
        {"id":"v3","x":672,"y":216,"w":256,"h":80,"label":"v003 · current pick","detail":"Its own creative metadata","icon":"check","accent":true}
      ],
      paths: ["M288 76H616","M96 120V180Q96 188 104 188H152Q160 188 160 196V208","M160 120V164Q160 172 168 172H472Q480 172 480 180V208","M224 120V148Q224 156 232 156H792Q800 156 800 164V208"]
    },
    narrow: { width: 360, height: 432,
      nodes: [
        {"id":"asset","x":48,"y":24,"w":280,"h":88,"label":"The asset","detail":"Stable shot / review identity","icon":"film"},
        {"id":"feedback","x":48,"y":160,"w":280,"h":88,"label":"Shared feedback","detail":"Notes · rating · shortlist","icon":"notes"},
        {"id":"versions","x":48,"y":296,"w":280,"h":108,"label":"Stored takes","detail":"Each has its own creative metadata","icon":"film","accent":true,"takes":true}
      ],
      paths: ["M188 112V152","M48 68H20Q12 68 12 76V342Q12 350 20 350H40"]
    }
  },
  upload: {
    title: "The upload handoffs",
    description: "Resolve catalog IDs, prepare the original and JPEG preview, begin one upload session, transfer to storage, complete that same session and wait for readiness. Reuse keys and sessions on retries.",
    wide: { width: 960, height: 368,
      nodes: [
        {"id":"ids","x":32,"y":64,"w":248,"h":88,"label":"Resolve IDs","detail":"Project, folder and scope","icon":"folder"},
        {"id":"prepare","x":356,"y":64,"w":248,"h":88,"label":"Prepare the files","detail":"Original + JPEG + SHA-256","icon":"film"},
        {"id":"begin","x":680,"y":64,"w":248,"h":88,"label":"Begin session","detail":"Record idempotency key","icon":"code"},
        {"id":"put","x":680,"y":248,"w":248,"h":88,"label":"Transfer bytes","detail":"Use the signed storage URLs","icon":"store"},
        {"id":"complete","x":356,"y":248,"w":248,"h":88,"label":"Complete session","detail":"Reuse the same session ID","icon":"check"},
        {"id":"ready","x":32,"y":248,"w":248,"h":88,"label":"Ready to review","detail":"After processing succeeds","icon":"check","accent":true}
      ],
      paths: ["M280 108H348","M604 108H672","M804 152V240","M680 292H612","M356 292H288"],
      zones: [{"x":16,"y":16,"w":928,"h":152,"label":"01 / PREPARE · AUTHORIZE"},{"x":16,"y":200,"w":928,"h":152,"label":"02 / TRANSFER · COMPLETE · WAIT"}]
    },
    narrow: { width: 360, height: 832,
      nodes: [
        {"id":"ids","x":32,"y":32,"w":296,"h":88,"label":"Resolve IDs","detail":"Project, folder and scope","icon":"folder"},
        {"id":"prepare","x":32,"y":168,"w":296,"h":88,"label":"Prepare the files","detail":"Original + JPEG + SHA-256","icon":"film"},
        {"id":"begin","x":32,"y":304,"w":296,"h":88,"label":"Begin session","detail":"Record idempotency key","icon":"code"},
        {"id":"put","x":32,"y":440,"w":296,"h":88,"label":"Transfer bytes","detail":"Use the signed storage URLs","icon":"store"},
        {"id":"complete","x":32,"y":576,"w":296,"h":88,"label":"Complete session","detail":"Reuse the same session ID","icon":"check"},
        {"id":"ready","x":32,"y":712,"w":296,"h":88,"label":"Ready to review","detail":"After processing succeeds","icon":"check","accent":true}
      ],
      paths: ["M180 120V160","M180 256V296","M180 392V432","M180 528V568","M180 664V704"]
    }
  },
  architecture: {
    title: "Where the work happens",
    description: "Control and processing map: SvelteKit authorizes requests, Convex owns catalog records, and RustFS owns bytes. Workers store derivatives in RustFS and report readiness to Convex. The separate upload map shows direct signed byte transfers from the uploader to storage.",
    wide: { width: 960, height: 496,
      nodes: [
        {"id":"browser","x":32,"y":32,"w":216,"h":80,"label":"Browser","detail":"Review & upload","icon":"film"},
        {"id":"app","x":356,"y":32,"w":248,"h":80,"label":"SvelteKit","detail":"Authorize each request","icon":"server","accent":true},
        {"id":"catalog","x":32,"y":208,"w":248,"h":88,"label":"Convex","detail":"Identity & review state","icon":"store"},
        {"id":"storage","x":680,"y":208,"w":248,"h":88,"label":"RustFS","detail":"Originals & previews","icon":"store"},
        {"id":"worker","x":356,"y":384,"w":248,"h":88,"label":"Trigger / FFmpeg","detail":"Prepare derivatives","icon":"server"}
      ],
      paths: ["M248 72H348","M400 112V160Q400 168 392 168H164Q156 168 156 176V200","M560 112V160Q560 168 568 168H796Q804 168 804 176V200","M480 112V376","M356 428H320Q312 428 312 420V336Q312 328 304 328H164Q156 328 156 320V304","M604 428H632Q640 428 640 420V336Q640 328 648 328H796Q804 328 804 320V304"],
      labels: [{"x":280,"y":148,"text":"Read / write"},{"x":680,"y":148,"text":"Authorize"},{"x":520,"y":248,"text":"Video job"},{"x":232,"y":352,"text":"Readiness"},{"x":728,"y":352,"text":"Derivatives"}]
    },
    narrow: { width: 360, height: 648,
      nodes: [
        {"id":"browser","x":48,"y":24,"w":280,"h":80,"label":"Browser","detail":"Review & upload","icon":"film"},
        {"id":"app","x":48,"y":152,"w":280,"h":88,"label":"SvelteKit","detail":"Authorize each request","icon":"server","accent":true},
        {"id":"catalog","x":48,"y":312,"w":128,"h":80,"label":"Convex","detail":"Catalog records","icon":"store"},
        {"id":"storage","x":200,"y":312,"w":128,"h":80,"label":"RustFS","detail":"Media bytes","icon":"store"},
        {"id":"worker","x":48,"y":536,"w":280,"h":88,"label":"Trigger / FFmpeg","detail":"Prepare derivatives","icon":"server"}
      ],
      paths: ["M188 104V144","M112 240V304","M264 240V304","M48 196H20Q12 196 12 204V572Q12 580 20 580H40","M112 536V400","M264 536V400"],
      labels: [{"x":112,"y":280,"text":"Read / write"},{"x":264,"y":280,"text":"Authorize"},{"x":112,"y":476,"text":"Readiness"},{"x":264,"y":476,"text":"Derivatives"}]
    }
  },
  workflow: {
    title: "The everyday review flow",
    description: "Choose a project and folder, upload media, wait for Ready, review and choose a take, then deliberately share it. Revisions stay with the same asset.",
    wide: { width: 960, height: 368,
      nodes: [
        {"id":"place","x":32,"y":64,"w":248,"h":88,"label":"Project & folder","detail":"Choose the destination","icon":"folder"},
        {"id":"upload","x":356,"y":64,"w":248,"h":88,"label":"Upload media","detail":"Video, image or reference sheet","icon":"film"},
        {"id":"ready","x":680,"y":64,"w":248,"h":88,"label":"Ready for review","detail":"Transfer and processing finished","icon":"check","accent":true},
        {"id":"review","x":568,"y":248,"w":360,"h":88,"label":"Review & choose a take","detail":"Asset feedback · exact take metadata","icon":"notes"},
        {"id":"share","x":32,"y":248,"w":360,"h":88,"label":"Share deliberately","detail":"Private review or explicit publication","icon":"link"}
      ],
      paths: ["M280 108H348","M604 108H672","M804 152V240","M568 292H400","M600 248V192Q600 184 592 184H488Q480 184 480 176V160"],
      labels: [{"x":536,"y":204,"text":"New version"}],
      zones: [{"x":16,"y":16,"w":928,"h":152,"label":"01 / DESTINATION · UPLOAD · READINESS"},{"x":16,"y":200,"w":928,"h":152,"label":"02 / REVIEW · CHOOSE · SHARE"}]
    },
    narrow: { width: 360, height: 696,
      nodes: [
        {"id":"place","x":32,"y":32,"w":296,"h":88,"label":"Project & folder","detail":"Choose the destination","icon":"folder"},
        {"id":"upload","x":32,"y":168,"w":296,"h":88,"label":"Upload media","detail":"Video, image or reference sheet","icon":"film"},
        {"id":"ready","x":32,"y":304,"w":296,"h":88,"label":"Ready for review","detail":"Transfer and processing finished","icon":"check","accent":true},
        {"id":"review","x":32,"y":440,"w":296,"h":88,"label":"Review & choose a take","detail":"Asset feedback · exact take metadata","icon":"notes"},
        {"id":"share","x":32,"y":576,"w":296,"h":88,"label":"Share deliberately","detail":"Private review or explicit publication","icon":"link"}
      ],
      paths: ["M180 120V160","M180 256V296","M180 392V432","M180 528V568"]
    }
  },
  sharing: {
    title: "Three ways to share, three different permissions",
    description: "A private review link invites feedback on a project. Trailer Feed publication requires explicit ready-version consent. Video embeds require an approved ready version and allowed site origins.",
    wide: { width: 960, height: 320,
      nodes: [
        {"id":"source","x":320,"y":24,"w":320,"h":88,"label":"Media in Review Room","detail":"Originals and takes stay private","icon":"film","accent":true},
        {"id":"private","x":32,"y":200,"w":248,"h":88,"label":"Private review link","detail":"Invite people to watch and comment","icon":"lock"},
        {"id":"trailer","x":356,"y":200,"w":248,"h":88,"label":"Trailer Feed","detail":"Explicit ready-version publication","icon":"send"},
        {"id":"embed","x":680,"y":200,"w":248,"h":88,"label":"Embed / showcase","detail":"Approved take + allowed site origins","icon":"code"}
      ],
      paths: ["M400 112V152Q400 160 392 160H164Q156 160 156 168V192","M480 112V192","M560 112V152Q560 160 568 160H796Q804 160 804 168V192"]
    },
    narrow: { width: 360, height: 584,
      nodes: [
        {"id":"source","x":48,"y":24,"w":280,"h":88,"label":"Media in Review Room","detail":"Originals and takes stay private","icon":"film","accent":true},
        {"id":"private","x":48,"y":192,"w":280,"h":88,"label":"Private review link","detail":"Invite people to watch and comment","icon":"lock"},
        {"id":"trailer","x":48,"y":328,"w":280,"h":88,"label":"Trailer Feed","detail":"Explicit ready-version publication","icon":"send"},
        {"id":"embed","x":48,"y":464,"w":280,"h":88,"label":"Embed / showcase","detail":"Approved take + allowed site origins","icon":"code"}
      ],
      paths: ["M48 88H44Q36 88 36 96V228Q36 236 44 236H48","M48 68H32Q24 68 24 76V364Q24 372 32 372H40","M48 48H20Q12 48 12 56V500Q12 508 20 508H40"]
    }
  }
};
