let detectorPromise;
export function loadDetector(){
  if(!detectorPromise)detectorPromise=(async()=>{
    const {FilesetResolver,HandLandmarker}=await import('./assets/vision_bundle.mjs');
    const vision=await FilesetResolver.forVisionTasks(new URL('./assets/wasm',import.meta.url).href);
    const options={baseOptions:{modelAssetPath:new URL('./assets/hand_landmarker.task',import.meta.url).href,delegate:'GPU'},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.5,minHandPresenceConfidence:.5,minTrackingConfidence:.55};
    try{return await HandLandmarker.createFromOptions(vision,options);}catch(error){options.baseOptions.delegate='CPU';return HandLandmarker.createFromOptions(vision,options);}
  })().catch(e=>{detectorPromise=null;throw e;});
  return detectorPromise;
}
export class HandCamera{
  constructor(video,onFrame,onStatus){this.video=video;this.onFrame=onFrame;this.onStatus=onStatus;this.active=false;this.paused=false;this.generation=0;this.lastTick=0;this.lastVideo=-1;this.loop=this.loop.bind(this);}
  async start(){
    const generation=++this.generation;
    if(!navigator.mediaDevices?.getUserMedia)throw Object.assign(new Error('Open camera preview over HTTPS or localhost.'),{name:'InsecureContext'});
    this.onStatus('permission');
    const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:960},frameRate:{ideal:30,max:30}}});
    if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}
    this.stream=stream;this.video.srcObject=stream;this.video.muted=true;await this.video.play();
    this.onStatus('loading');
    try{this.detector=await loadDetector();}catch(e){this.stop();throw e;}
    if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}
    stream.getVideoTracks()[0].addEventListener('ended',()=>{if(this.active){this.stop();this.onStatus('ended');}});
    this.active=true;this.paused=false;this.lastVideo=-1;this.onStatus('ready');this.raf=requestAnimationFrame(this.loop);
  }
  loop(now){if(!this.active)return;this.raf=requestAnimationFrame(this.loop);if(this.paused||document.hidden||this.video.readyState<2||this.video.currentTime===this.lastVideo||now-this.lastTick<55)return;
    this.lastTick=now;this.lastVideo=this.video.currentTime;
    try{const result=this.detector.detectForVideo(this.video,now);this.onFrame(result.landmarks[0]||null,this.video.videoWidth,this.video.videoHeight,result.handedness?.[0]?.[0]?.categoryName);}catch(error){console.error('Hand tracking failed',error);this.stop();this.onStatus('error');}
  }
  stop(){this.generation++;this.active=false;this.paused=false;cancelAnimationFrame(this.raf);this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.srcObject=null;}
}
