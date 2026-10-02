import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
let requests=[];
await page.route('**/api/owner-processing',r=>r.fulfill({json:[]}));
await page.route('**/api/owner-assets/delete',r=>{
 const body=r.request().postDataJSON();requests.push(body);
 return r.fulfill({json:{deletedAssetIds:body.assetIds}});
});
try {
 await page.goto('http://127.0.0.1:5173/dev/processing-workspace');
 await page.getByRole('button',{name:'20261002',exact:false}).first().click();
 await page.getByLabel('Select VID_CHECK_a',{exact:true}).check();
 await page.getByRole('button',{name:'Actions',exact:true}).click();
 await page.getByRole('menuitem',{name:'Delete selected',exact:true}).click();
 await page.getByRole('dialog',{name:'Delete selected clips?'}).waitFor();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Open VID_CHECK_a',exact:true}).count(),1);
 assert.equal(requests.length,0);
 console.log('PASS: Cancel preserves selected clips without a delete request');
 await page.getByRole('button',{name:'Actions',exact:true}).click();
 await page.getByRole('menuitem',{name:'Delete selected',exact:true}).click();
 await page.getByRole('button',{name:'Delete permanently',exact:true}).click();
 await page.getByRole('button',{name:'Open VID_CHECK_a',exact:true}).waitFor({state:'detached'});
 assert.equal(await page.getByRole('button',{name:'Open VID_CHECK_b',exact:true}).count(),1);
 assert.deepEqual(requests,[{projectId:'project',assetIds:['a']}]);
 console.log('PASS: Delete removes only the confirmed selection');
 const denied=await page.request.post('http://127.0.0.1:5173/api/owner-assets/delete',{data:{projectId:'project',assetIds:['b']},maxRedirects:0});
 assert.equal(denied.status(),303);
 console.log('PASS: unauthenticated and reviewer requests cannot invoke owner deletion');
 await page.goto('http://127.0.0.1:5173/dev/selection-actions');
 assert.equal(await page.getByRole('button',{name:'Actions',exact:true}).count(),0);
 console.log('PASS: client selection controls do not expose Delete');
} finally {await browser.close();}
