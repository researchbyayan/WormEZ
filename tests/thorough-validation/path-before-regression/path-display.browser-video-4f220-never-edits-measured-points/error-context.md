# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: path-display.browser.spec.cjs >> video draws the smoothed stroke without raw red dots, retains gaps and never edits measured points
- Location: tests/path-display.browser.spec.cjs:2:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 29
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic:
    - generic [ref=e3]:
      - button "Scroll to the bottom":
        - generic [aria-hidden] [ref=e4] [cursor=pointer]: 
    - complementary "WormEZ workspace" [ref=e5]:
      - generic [ref=e7]:
        - strong [ref=e8]:
          - img "WormEZ" [ref=e9]:
            - generic [aria-hidden] [ref=e10]: Worm
        - generic [ref=e12]: Larval motion analysis
      - generic [ref=e13]: Workspace
      - navigation "Analysis stages" [ref=e14]:
        - list [ref=e15]:
          - listitem [ref=e16] [cursor=pointer]:
            - button "Load" [ref=e17]:
              - generic [ref=e19]: 
          - listitem [ref=e21] [cursor=pointer]:
            - button "Review anchors" [ref=e22]:
              - generic [ref=e24]: 
          - listitem [ref=e26] [cursor=pointer]:
            - button "Analyze" [ref=e27]:
              - generic [ref=e29]: 
          - listitem [ref=e31] [cursor=pointer]:
            - button "Results" [ref=e32]:
              - generic [ref=e34]: 
      - button "Settings" [ref=e37] [cursor=pointer]:
        - generic [aria-hidden] [ref=e38]: 
    - banner [ref=e40]:
      - status [ref=e41]:
        - generic [ref=e42]: Review gaps · model recovery needs the local launcher
      - generic [ref=e43]:
        - button "Load Video" [ref=e44] [cursor=pointer]:
          - generic [aria-hidden] [ref=e45]: 
          - text: Load Video
        - button "Use Camera" [ref=e46] [cursor=pointer]:
          - generic [aria-hidden] [ref=e47]: 
          - text: Use Camera
  - generic [ref=e48]:
    - generic [ref=e49]:
      - generic [ref=e50]:
        - generic [ref=e51]:
          - generic [ref=e52]: clean_worm.webm
          - generic [ref=e53]: Frame 0 / 60
        - generic [ref=e54]:  
        - group [ref=e58]:
          - generic [ref=e59]:
            - generic [ref=e60]: Anchor 1 of 9 · frame 0
            - heading "Confirm anchor" [level=2] [ref=e62]
            - paragraph [ref=e63]: Is the purple suggestion centered on the larva in this frame?
          - generic [ref=e64]:
            - generic [ref=e65]:
              - button "Correct" [ref=e66] [cursor=pointer]:
                - generic [aria-hidden] [ref=e67]: 
                - text: Correct
              - button "Fix anchor" [ref=e68] [cursor=pointer]:
                - generic [aria-hidden] [ref=e69]: 
                - text: Fix anchor
              - button "Larva unavailable" [ref=e70] [cursor=pointer]:
                - generic [aria-hidden] [ref=e71]: 
                - text: Larva unavailable
            - generic [ref=e72]:
              - button "Back" [disabled] [ref=e73]:
                - generic [aria-hidden] [ref=e74]: 
                - text: Back
              - button "Next" [ref=e75] [cursor=pointer]:
                - text: Next
                - generic [aria-hidden] [ref=e76]: 
        - generic "Video pointer controls" [ref=e77]:
          - button "Pan view" [ref=e78] [cursor=pointer]:
            - generic [aria-hidden] [ref=e79]: 
          - generic [ref=e80]: Select an anchor or drag to pan
          - group "Video overlays" [ref=e81]:
            - button "H/C/T" [pressed] [ref=e82] [cursor=pointer]
            - button "Outline" [pressed] [ref=e83] [cursor=pointer]
          - text:  
        - generic [ref=e84]:
          - button "Fit frame" [ref=e85] [cursor=pointer]:
            - generic [aria-hidden] [ref=e86]: 
            - text: Fit frame
          - button "Auto-Zoom" [ref=e87] [cursor=pointer]:
            - generic [aria-hidden] [ref=e88]: 
            - text: Auto-Zoom
          - button "Pathway" [ref=e89] [cursor=pointer]:
            - generic [aria-hidden] [ref=e90]: 
            - text: Pathway
          - generic [ref=e91]:
            - text: Zoom
            - button "Zoom out" [ref=e92] [cursor=pointer]:
              - generic [aria-hidden] [ref=e93]: 
            - slider "Video magnification" [ref=e94] [cursor=pointer]: "4"
            - button "Zoom in" [ref=e95] [cursor=pointer]:
              - generic [aria-hidden] [ref=e96]: 
            - status [ref=e97]: 400%
          - generic [ref=e98]: Not tracked here · centered on nearest tracked frame
        - generic [ref=e99]:
          - button "Play ▶" [ref=e100] [cursor=pointer]:
            - generic [aria-hidden] [ref=e101]: 
            - text: Play
            - generic [ref=e102]: ▶
          - generic [ref=e103]:
            - text: Playback
            - combobox "Video playback speed" [ref=e104]:
              - option "0.25×"
              - option "0.5×"
              - option "1×" [selected]
              - option "1.5×"
              - option "2×"
              - option "4×"
          - button "Previous frame; hold to scrub backward" [ref=e105] [cursor=pointer]:
            - generic [aria-hidden] [ref=e106]: 
            - generic [aria-hidden] [ref=e107]: −1 frame
          - button "Next frame; hold to scrub forward" [ref=e108] [cursor=pointer]:
            - generic [aria-hidden] [ref=e109]: 
            - generic [aria-hidden] [ref=e110]: +1 frame
          - button "Reset clip" [ref=e111] [cursor=pointer]:
            - generic [aria-hidden] [ref=e112]: 
          - generic [ref=e113]:
            - generic [ref=e114]:
              - generic "Anchor markers":
                - button "Suggested anchor · frame 0 · review before analysis" [ref=e115] [cursor=pointer]
                - button "Suggested anchor · frame 7 · review before analysis" [ref=e116] [cursor=pointer]
                - button "Suggested anchor · frame 15 · review before analysis" [ref=e117] [cursor=pointer]
                - button "Suggested anchor · frame 22 · review before analysis" [ref=e118] [cursor=pointer]
                - button "Suggested anchor · frame 30 · review before analysis" [ref=e119] [cursor=pointer]
                - button "Suggested anchor · frame 37 · review before analysis" [ref=e120] [cursor=pointer]
                - button "Suggested anchor · frame 44 · review before analysis" [ref=e121] [cursor=pointer]
                - button "Suggested anchor · frame 52 · review before analysis" [ref=e122] [cursor=pointer]
                - button "Suggested anchor · frame 59 · review before analysis" [ref=e123] [cursor=pointer]
              - slider "Frame scrubber" [ref=e124]: "0"
            - generic [ref=e125]:
              - button "Previous anchor" [disabled] [ref=e126]:
                - generic [aria-hidden] [ref=e127]: 
              - button "Place an anchor" [ref=e128] [cursor=pointer]: Place anchor
              - button "Next anchor" [ref=e130] [cursor=pointer]:
                - generic [aria-hidden] [ref=e131]: 
          - button "Start analysis" [disabled] [ref=e132]
          - text:  
          - button "Pause tracking" [disabled] [ref=e133]
          - button "Undo" [disabled] [ref=e134]:
            - generic [aria-hidden] [ref=e135]: 
          - button "Redo" [disabled] [ref=e136]:
            - generic [aria-hidden] [ref=e137]: 
      - complementary [ref=e138]:
        - text:         
        - generic [ref=e139]:
          - heading "Anchors 0 set" [level=2] [ref=e140]:
            - text: Anchors
            - generic [ref=e141]: 0 set
          - paragraph [ref=e142]: Approve suggestions or place your own anchors.
          - generic [ref=e143]: No approved anchors yet
        - generic [ref=e144]:
          - heading "Scale & timing" [level=2] [ref=e145]
          - paragraph [ref=e146]: Estimated automatically. Adjust on a clear frame if needed.
          - generic [ref=e147]:
            - generic [ref=e148]: Length
            - generic [ref=e149]: 41 px
          - generic [ref=e150]:
            - generic [ref=e151]: Width
            - generic [ref=e152]: 13 px
          - generic [ref=e153]: scale set · path point step 10.3 px
          - generic [ref=e154]:
            - generic [ref=e155]: Scale reference
            - combobox "Scale reference" [ref=e156]:
              - option "Choose Reference" [disabled] [selected]
              - option "Petri Dish"
              - option "Custom Shape"
          - generic [ref=e157]:
            - generic [ref=e158]: Known diameter
            - spinbutton "Known diameter" [disabled] [ref=e159]: "0"
          - generic [ref=e160]:
            - generic [ref=e161]: Unit
            - combobox "Unit" [disabled] [ref=e162]:
              - option "mm" [selected]
              - option "cm"
              - option "µm"
              - option "inches"
          - generic [ref=e163]:
            - generic [ref=e164]: Measurement
            - combobox "Measurement" [disabled] [ref=e165]:
              - option "Diameter" [selected]
              - option "Area"
          - text: 
          - paragraph [ref=e166]: Not calibrated. Enter the known dish diameter or area.
          - generic [ref=e167]:
            - generic [ref=e168]: Frame rate (fps)
            - spinbutton "Frame rate (fps)" [ref=e169]: "30"
        - generic [ref=e170]:
          - heading "Verification Ready to review · press Start analysis" [level=2] [ref=e171]:
            - text: Verification
            - generic [ref=e172]: Ready to review · press Start analysis
          - generic [ref=e175]:
            - generic [ref=e176]:
              - generic [ref=e177]: Tracker
              - generic [ref=e178]: 97% accepted
            - generic [ref=e179]:
              - generic [ref=e180]: Points logged
              - generic [ref=e181]: "30"
        - generic [ref=e182]:
          - heading "Head · center · tail" [level=2] [ref=e183]
          - paragraph [ref=e184]: Head direction comes from motion. Fix any uncertain result.
          - generic [ref=e185]:
            - button "Edit head" [ref=e186] [cursor=pointer]:
              - generic [aria-hidden] [ref=e187]: H
              - text: Head
            - button "Edit center" [ref=e188] [cursor=pointer]:
              - generic [aria-hidden] [ref=e189]: C
              - text: Center
            - button "Edit tail" [ref=e190] [cursor=pointer]:
              - generic [aria-hidden] [ref=e191]: T
              - text: Tail
          - paragraph [ref=e192]: No reliable outline at this frame.
          - generic "Tracking landmark key" [ref=e193]:
            - paragraph [ref=e194]: ● automatic · ■ manual · ○ uncertain
        - group [ref=e195]:
          - generic "Analysis settings" [ref=e196] [cursor=pointer]
    - generic [ref=e197]:
      - generic [ref=e198]:
        - heading "Head bending separate from body turns" [level=2] [ref=e199]:
          - text: Head bending
          - generic [ref=e200]: separate from body turns
        - paragraph [ref=e201]: "Head angle vs. rear body axis. Gaps: head unknown."
        - generic "Head bend angle over time" [ref=e202]
      - generic [ref=e203]:
        - heading "Movement trajectory" [level=2] [ref=e204]
        - paragraph [ref=e208]: Path resampled into 12 points spaced 5.0 px apart · a quarter of the 20.0 px body length. Hover a point for its timing. 1 interval need review. Faint dashed links are visual estimates, excluded from movement totals; purple links are measured straight lines between manual anchors.
      - generic [ref=e209]:
        - heading "Movement metrics" [level=2] [ref=e210]
        - generic [ref=e211]:
          - generic [ref=e212]:
            - generic [ref=e213]: Distance & displacement
            - generic [ref=e214]:
              - generic [ref=e215]: Total distance
              - generic [ref=e216]:
                - generic [ref=e217]: 52.7px
                - generic [ref=e218]: Calibrate a reference for physical units
            - generic [ref=e219]:
              - generic [ref=e220]: Net displacement
              - generic [ref=e221]:
                - generic [ref=e222]: 56.0px
                - generic [ref=e223]: Calibrate a reference for physical units
            - generic [ref=e224]:
              - generic [ref=e225]: Max from start
              - generic [ref=e226]:
                - generic [ref=e227]: 56.0px
                - generic [ref=e228]: Calibrate a reference for physical units
            - generic [ref=e229]:
              - generic [ref=e230]: Path efficiency
              - generic [ref=e231]:
                - generic [ref=e232]: ·
                - generic [ref=e233]: unavailable across gaps
          - generic [ref=e234]:
            - generic [ref=e235]: Speed & time
            - generic [ref=e236]:
              - generic [ref=e237]: Average speed
              - generic [ref=e238]:
                - generic [ref=e239]: 58.6px/s
                - generic [ref=e240]: · accepted intervals only
            - generic [ref=e241]:
              - generic [ref=e242]: Net velocity
              - generic [ref=e243]:
                - generic [ref=e244]: 57.9px/s
                - generic [ref=e245]: heading 0°
            - generic [ref=e246]:
              - generic [ref=e247]: Moving
              - generic [ref=e248]:
                - generic [ref=e249]: 0.9s
                - generic [ref=e250]: 100% of 0.9 accepted s
            - generic [ref=e251]:
              - generic [ref=e252]: Stationary
              - generic [ref=e253]:
                - generic [ref=e254]: 0.0s
                - generic [ref=e255]: 0% of 0.9 accepted s
          - generic [ref=e256]:
            - generic [ref=e257]: Turning behaviour
            - generic [ref=e258]:
              - generic [ref=e259]: Body-path turns
              - generic [ref=e260]:
                - generic [ref=e261]: "0"
                - generic [ref=e262]: body-path turns over 30° · excludes head bending
            - generic [ref=e263]:
              - generic [ref=e264]: Mean turn angle
              - generic [ref=e265]:
                - generic [ref=e266]: 2.9°
                - generic [ref=e267]: per path point
            - generic [ref=e268]:
              - generic [ref=e269]: Turn bias
              - generic [ref=e270]:
                - generic [ref=e271]: balanced
                - generic [ref=e272]: 0.1° mean signed turn
        - generic [ref=e273]:
          - button "Excel (.xlsx)" [disabled] [ref=e274]
          - button "PDF report" [disabled] [ref=e275]
          - button "Points CSV" [disabled] [ref=e276]
        - paragraph [ref=e277]: "Excel: summary, data and charts. PDF: full report."
      - generic [ref=e278]:
        - heading "Area change" [level=2] [ref=e279]
        - status [ref=e280]: Area estimate unavailable until reliable larval outlines have been measured.
        - paragraph [ref=e281]: "Teal: earlier gain still visible. Amber: new this frame. Uncertain frames break the comparison."
        - generic [ref=e282]:
          - generic [ref=e283]: 1 · Earlier change still visible
          - generic [ref=e285]: 2 · New change this frame
        - status [ref=e287]: Frame 0 · no verified outline here; the area comparison stops at this gap.
        - status [ref=e288]: 0 verified outlines measured · gaps excluded
        - generic "Approximate projected area change in px²; uncertain gaps break the line." [ref=e289]
        - paragraph [ref=e290]: Approximate projected 2D area, not body volume. Gaps are excluded; each continuous segment starts a new comparison.
    - generic [ref=e292]:
      - heading "Displacement from start" [level=2] [ref=e293]
      - paragraph [ref=e297]: Distance from the starting point over time.
```

# Test source

```ts
  1  | const {test,expect}=require('@playwright/test'),path=require('node:path');test.setTimeout(120000);
  2  | test('video draws the smoothed stroke without raw red dots, retains gaps and never edits measured points',async({page})=>{
  3  |  await page.goto('file://'+path.resolve('WormEZ.html'));await page.setInputFiles('#fileInput','samples/clean_worm.webm');await page.waitForFunction(()=>__wormez.state.loaded&&!__wormez.state.running&&!__wormez.state.preparing);
  4  |  const result=await page.evaluate(()=>{
  5  |   const s=__wormez.state;s.track=Array.from({length:30},(_,frame)=>({frame,x:70+frame*2,y:90+(frame%2?1:-1),status:frame===15?'uncertain':'verified',origin:'auto'}));s.keyframes=[];s.proposals=[];s.seedPos=null;s.showHCT=false;s.showOutline=false;s.manualFallbackEnabled=false;s.workflowPhase='results';s.larvaLen=20;__wormez.recompute();const before=JSON.stringify(s.track),metrics=JSON.stringify(s.metrics),ctx=document.getElementById('overlayCanvas').getContext('2d');let rawDots=0,segments=0;
  6  |   const fill=ctx.fill,move=ctx.moveTo;ctx.fill=function(...args){if(this.fillStyle==='#df3030')rawDots++;return fill.apply(this,args)};ctx.moveTo=function(...args){if(this.strokeStyle==='rgba(201, 74, 58, 0.85)')segments++;return move.apply(this,args)};
  7  |   const slider=document.getElementById('zoomLevel');slider.value=4;slider.dispatchEvent(new Event('input'));
  8  |   return{rawDots,segments,unchanged:before===JSON.stringify(s.track),sameMetrics:metrics===JSON.stringify(s.metrics)};
  9  |  });
> 10 |  expect(result.rawDots).toBe(0);expect(result.segments).toBe(2);expect(result.unchanged).toBe(true);expect(result.sameMetrics).toBe(true);
     |                         ^ Error: expect(received).toBe(expected) // Object.is equality
  11 | });
  12 |
```
