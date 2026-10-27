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
        {"id":"project","x":32,"y":32,"w":240,"h":72,"label":"Blood Rush","detail":"Project · BLR","icon":"folder"},
        {"id":"episode","x":360,"y":32,"w":240,"h":72,"label":"The Late Shift","detail":"Episode folder · EP101","icon":"folder"},
        {"id":"scene","x":688,"y":32,"w":240,"h":72,"label":"Parking Lot","detail":"Scene folder · 010 PRL","icon":"folder"},
        {"id":"references","x":32,"y":212,"w":240,"h":72,"label":"_References","detail":"Separate supporting images","icon":"folder"},
        {"id":"asset","x":688,"y":196,"w":240,"h":112,"label":"BLR_EP101_PRL_0020","detail":"One asset · shot 20","icon":"film","accent":true,"takes":true}
      ],
      paths: ["M272 68H352","M600 68H680","M808 104V188","M152 104V204"]
    },
    narrow: { width: 320, height: 672,
      nodes: [
        {"id":"project","x":32,"y":24,"w":272,"h":72,"label":"Blood Rush","detail":"Project · BLR","icon":"folder"},
        {"id":"episode","x":32,"y":144,"w":272,"h":72,"label":"The Late Shift","detail":"Episode folder · EP101","icon":"folder"},
        {"id":"scene","x":32,"y":264,"w":272,"h":72,"label":"Parking Lot","detail":"Scene folder · 010 PRL","icon":"folder"},
        {"id":"asset","x":32,"y":384,"w":272,"h":112,"label":"BLR_EP101_PRL_0020","detail":"One asset · shot 20","icon":"film","accent":true,"takes":true},
        {"id":"references","x":32,"y":576,"w":272,"h":72,"label":"_References","detail":"Separate supporting images","icon":"folder"}
      ],
      paths: ["M168 96V136","M168 216V256","M168 336V376","M32 60H20Q12 60 12 68V604Q12 612 20 612H24"]
    }
  },
  review: {
    title: "One asset, shared feedback, separate take metadata",
    description: "Notes, rating and shortlist belong to the asset. Each take has its own prompt, model and references. v003 is the current pick; choosing it preserves v001 and v002.",
    wide: { width: 960, height: 320,
      nodes: [
        {"id":"asset","x":32,"y":32,"w":256,"h":72,"label":"The asset","detail":"Stable shot / review identity","icon":"film"},
        {"id":"feedback","x":624,"y":32,"w":304,"h":72,"label":"Shared feedback","detail":"Notes · rating · shortlist","icon":"notes"},
        {"id":"v1","x":32,"y":216,"w":256,"h":72,"label":"v001","detail":"Its prompt, model & references","icon":"film"},
        {"id":"v2","x":352,"y":216,"w":256,"h":72,"label":"v002","detail":"Its prompt, model & references","icon":"film"},
        {"id":"v3","x":672,"y":216,"w":256,"h":72,"label":"v003 · current pick","detail":"Its own creative metadata","icon":"check","accent":true}
      ],
      paths: ["M288 68H616","M96 104V180Q96 188 104 188H152Q160 188 160 196V208","M160 104V164Q160 172 168 172H472Q480 172 480 180V208","M224 104V148Q224 156 232 156H792Q800 156 800 164V208"]
    },
    narrow: { width: 320, height: 400,
      nodes: [
        {"id":"asset","x":32,"y":24,"w":272,"h":72,"label":"The asset","detail":"Stable shot / review identity","icon":"film"},
        {"id":"feedback","x":32,"y":144,"w":272,"h":72,"label":"Shared feedback","detail":"Notes · rating · shortlist","icon":"notes"},
        {"id":"versions","x":32,"y":264,"w":272,"h":112,"label":"Stored takes","detail":"Each has its own creative metadata","icon":"film","accent":true,"takes":true}
      ],
      paths: ["M168 96V136","M32 60H20Q12 60 12 68V312Q12 320 20 320H24"]
    }
  },
  upload: {
    title: "The upload handoffs",
    description: "Resolve catalog IDs, prepare the original and JPEG preview, begin one upload session, transfer to storage, complete that same session and wait for readiness. Reuse keys and sessions on retries.",
    wide: { width: 960, height: 352,
      nodes: [
        {"id":"ids","x":32,"y":64,"w":248,"h":72,"label":"Resolve IDs","detail":"Project, folder and scope","icon":"folder"},
        {"id":"prepare","x":356,"y":64,"w":248,"h":72,"label":"Prepare the files","detail":"Original + JPEG + SHA-256","icon":"film"},
        {"id":"begin","x":680,"y":64,"w":248,"h":72,"label":"Begin session","detail":"Record idempotency key","icon":"code"},
        {"id":"put","x":680,"y":248,"w":248,"h":72,"label":"Transfer bytes","detail":"Use the signed storage URLs","icon":"store"},
        {"id":"complete","x":356,"y":248,"w":248,"h":72,"label":"Complete session","detail":"Reuse the same session ID","icon":"check"},
        {"id":"ready","x":32,"y":248,"w":248,"h":72,"label":"Ready to review","detail":"After processing succeeds","icon":"check","accent":true}
      ],
      paths: ["M280 100H348","M604 100H672","M804 136V240","M680 284H612","M356 284H288"],
      zones: [{"x":16,"y":16,"w":928,"h":136,"label":"01 / PREPARE · AUTHORIZE"},{"x":16,"y":200,"w":928,"h":136,"label":"02 / TRANSFER · COMPLETE · WAIT"}]
    },
    narrow: { width: 320, height: 728,
      nodes: [
        {"id":"ids","x":16,"y":32,"w":288,"h":72,"label":"Resolve IDs","detail":"Project, folder and scope","icon":"folder"},
        {"id":"prepare","x":16,"y":152,"w":288,"h":72,"label":"Prepare the files","detail":"Original + JPEG + SHA-256","icon":"film"},
        {"id":"begin","x":16,"y":272,"w":288,"h":72,"label":"Begin session","detail":"Record idempotency key","icon":"code"},
        {"id":"put","x":16,"y":392,"w":288,"h":72,"label":"Transfer bytes","detail":"Use the signed storage URLs","icon":"store"},
        {"id":"complete","x":16,"y":512,"w":288,"h":72,"label":"Complete session","detail":"Reuse the same session ID","icon":"check"},
        {"id":"ready","x":16,"y":632,"w":288,"h":72,"label":"Ready to review","detail":"After processing succeeds","icon":"check","accent":true}
      ],
      paths: ["M160 104V144","M160 224V264","M160 344V384","M160 464V504","M160 584V624"]
    }
  },
  architecture: {
    title: "Where the work happens",
    description: "Control and processing map: SvelteKit authorizes requests, Convex owns catalog records, and RustFS owns bytes. Workers store derivatives in RustFS and report readiness to Convex. The separate upload map shows direct signed byte transfers from the uploader to storage.",
    wide: { width: 960, height: 480,
      nodes: [
        {"id":"browser","x":32,"y":32,"w":216,"h":72,"label":"Browser","detail":"Review & upload","icon":"film"},
        {"id":"app","x":356,"y":32,"w":248,"h":72,"label":"SvelteKit","detail":"Authorize each request","icon":"server","accent":true},
        {"id":"catalog","x":32,"y":208,"w":248,"h":72,"label":"Convex","detail":"Identity & review state","icon":"store"},
        {"id":"storage","x":680,"y":208,"w":248,"h":72,"label":"RustFS","detail":"Originals & previews","icon":"store"},
        {"id":"worker","x":356,"y":384,"w":248,"h":72,"label":"Trigger / FFmpeg","detail":"Prepare derivatives","icon":"server"}
      ],
      paths: ["M248 68H348","M400 104V160Q400 168 392 168H164Q156 168 156 176V200","M560 104V160Q560 168 568 168H796Q804 168 804 176V200","M480 104V376","M356 420H320Q312 420 312 412V320Q312 312 304 312H164Q156 312 156 304V288","M604 420H632Q640 420 640 412V320Q640 312 648 312H796Q804 312 804 304V288"],
      labels: [{"x":280,"y":148,"text":"Read / write"},{"x":680,"y":148,"text":"Authorize"},{"x":520,"y":248,"text":"Video job"},{"x":232,"y":336,"text":"Readiness"},{"x":728,"y":336,"text":"Derivatives"}]
    },
    narrow: { width: 320, height: 576,
      nodes: [
        {"id":"browser","x":32,"y":24,"w":256,"h":72,"label":"Browser","detail":"Review & upload","icon":"film"},
        {"id":"app","x":32,"y":144,"w":256,"h":72,"label":"SvelteKit","detail":"Authorize each request","icon":"server","accent":true},
        {"id":"catalog","x":40,"y":288,"w":112,"h":72,"label":"Convex","detail":"Catalog","icon":"store"},
        {"id":"storage","x":168,"y":288,"w":112,"h":72,"label":"RustFS","detail":"Media bytes","icon":"store"},
        {"id":"worker","x":32,"y":480,"w":256,"h":72,"label":"Trigger / FFmpeg","detail":"Prepare derivatives","icon":"server"}
      ],
      paths: ["M160 96V136","M96 216V280","M224 216V280","M32 180H20Q12 180 12 188V508Q12 516 20 516H24","M96 480V368","M224 480V368"],
      labels: [{"x":96,"y":256,"text":"Read / write"},{"x":224,"y":256,"text":"Authorize"},{"x":96,"y":424,"text":"Readiness"},{"x":224,"y":424,"text":"Derivatives"}]
    }
  },
  workflow: {
    title: "The everyday review flow",
    description: "Choose a project and folder, upload media, wait for Ready, review and choose a take, then deliberately share it. Revisions stay with the same asset.",
    wide: { width: 960, height: 352,
      nodes: [
        {"id":"place","x":32,"y":64,"w":248,"h":72,"label":"Project & folder","detail":"Choose the destination","icon":"folder"},
        {"id":"upload","x":356,"y":64,"w":248,"h":72,"label":"Upload media","detail":"Video, image or reference sheet","icon":"film"},
        {"id":"ready","x":680,"y":64,"w":248,"h":72,"label":"Ready for review","detail":"Transfer and processing finished","icon":"check","accent":true},
        {"id":"review","x":656,"y":248,"w":272,"h":72,"label":"Review & choose a take","detail":"Asset feedback · exact take metadata","icon":"notes"},
        {"id":"share","x":32,"y":248,"w":272,"h":72,"label":"Share deliberately","detail":"Private review or explicit publication","icon":"link"}
      ],
      paths: ["M280 100H348","M604 100H672","M804 136V240","M656 284H312","M688 248V192Q688 184 680 184H488Q480 184 480 176V144"],
      labels: [{"x":536,"y":204,"text":"New version"}],
      zones: [{"x":16,"y":16,"w":928,"h":136,"label":"01 / DESTINATION · UPLOAD · READINESS"},{"x":16,"y":200,"w":928,"h":136,"label":"02 / REVIEW · CHOOSE · SHARE"}]
    },
    narrow: { width: 320, height: 608,
      nodes: [
        {"id":"place","x":16,"y":32,"w":288,"h":72,"label":"Project & folder","detail":"Choose the destination","icon":"folder"},
        {"id":"upload","x":16,"y":152,"w":288,"h":72,"label":"Upload media","detail":"Video, image or reference sheet","icon":"film"},
        {"id":"ready","x":16,"y":272,"w":288,"h":72,"label":"Ready for review","detail":"Transfer and processing finished","icon":"check","accent":true},
        {"id":"review","x":16,"y":392,"w":288,"h":72,"label":"Review & choose a take","detail":"Asset feedback · exact take metadata","icon":"notes"},
        {"id":"share","x":16,"y":512,"w":288,"h":72,"label":"Share deliberately","detail":"Private review or explicit publication","icon":"link"}
      ],
      paths: ["M160 104V144","M160 224V264","M160 344V384","M160 464V504"]
    }
  },
  sharing: {
    title: "Three ways to share, three different permissions",
    description: "A private review link invites feedback on a project. Trailer Feed publication requires explicit ready-version consent. Video embeds require an approved ready version and allowed site origins.",
    wide: { width: 880, height: 272,
      nodes: [
        {"id":"source","x":320,"y":24,"w":240,"h":72,"label":"Media in Review Room","detail":"Originals and takes stay private","icon":"film","accent":true},
        {"id":"private","x":24,"y":176,"w":240,"h":72,"label":"Private review link","detail":"Invite people to watch and comment","icon":"lock"},
        {"id":"trailer","x":320,"y":176,"w":240,"h":72,"label":"Trailer Feed","detail":"Explicit ready-version publication","icon":"send"},
        {"id":"embed","x":616,"y":176,"w":240,"h":72,"label":"Embed / showcase","detail":"Approved take + allowed site origins","icon":"code"}
      ],
      paths: ["M380 96V128Q380 136 372 136H152Q144 136 144 144V168","M440 96V168","M500 96V128Q500 136 508 136H728Q736 136 736 144V168"]
    },
    narrow: { width: 320, height: 504,
      nodes: [
        {"id":"source","x":48,"y":24,"w":248,"h":72,"label":"Media in Review Room","detail":"Originals and takes stay private","icon":"film","accent":true},
        {"id":"private","x":48,"y":168,"w":248,"h":72,"label":"Private review link","detail":"Watch, comment and decide","icon":"lock"},
        {"id":"trailer","x":48,"y":288,"w":248,"h":72,"label":"Trailer Feed","detail":"Publish exact ready versions","icon":"send"},
        {"id":"embed","x":48,"y":408,"w":248,"h":72,"label":"Embed / showcase","detail":"Approved take + allowed sites","icon":"code"}
      ],
      paths: ["M48 76H44Q36 76 36 84V196Q36 204 44 204H48","M48 60H32Q24 60 24 68V316Q24 324 32 324H40","M48 44H20Q12 44 12 52V436Q12 444 20 444H40"]
    }
  }
};
