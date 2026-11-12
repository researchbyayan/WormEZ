// Diagnostic automation only. Accepting an endpoint here is not anatomical ground truth.
module.exports=async page=>{
  await page.waitForFunction(()=>__wormez.state.loaded&&(__wormez.state.headProposal||!__wormez.state.running));
  if(await page.evaluate(()=>!!__wormez.state.headProposal))await page.locator('#approveHead').click();
};
