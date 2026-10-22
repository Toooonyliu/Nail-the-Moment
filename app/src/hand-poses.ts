// Three supplied manicure references: a soft cascade, a delicate pinch and
// raised fingers. Open supplies a neutral five-finger view; Curl is preserved.
// Finger values are offsets from the WebXR mesh's bind pose, in radians.
export type HandPose = 'relaxed' | 'fan' | 'curl' | 'pinch' | 'poise';
type FingerPose = readonly [proximal: number, intermediate: number, distal: number, spread: number];
export type PoseDescription = {
  fingers: readonly FingerPose[];
  thumb: readonly [metacarpalX: number, metacarpalY: number, metacarpalZ: number, proximal: number, distal: number];
  view: readonly [x: number, y: number, z: number];
  lift: number;
};
export const handPoses: Record<HandPose, PoseDescription> = {
  relaxed: {
    // Each finger follows a different arc rather than closing into a fist.
    fingers: [[.10,.32,.10,-.09],[.25,.65,.18,-.025],[.42,1.00,.24,.045],[.55,1.18,.28,.14]],
    // Oblique side view with a camera-space roll: the fingers sweep left.
    thumb: [-.18,.12,.26,-.22,-.10], view: [.4168,.9253,.4040], lift: .10,
  },
  fan: {
    fingers: [[-.06,.02,-.04,-.11],[-.04,.02,-.02,-.015],[0,.04,-.02,.08],[.04,.08,0,.19]],
    thumb: [.02,-.12,0,-.04,0], view: [-.08,-.08,-.17], lift: .02,
  },
  curl: {
    fingers: [[.72,1.22,.65,-.025],[.82,1.28,.68,0],[.85,1.33,.68,.015],[.88,1.30,.66,.035]],
    thumb: [-.20,.34,.15,-.45,-.20], view: [-.15,2.85,-.08], lift: .50,
  },
  pinch: {
    // Thumb opposition approaches the curved index; the middle finger remains
    // lifted and the outer fingers taper, as in the classical reference.
    fingers: [[.72,1.00,.22,-.10],[.62,.64,.18,-.01],[.80,.72,.20,.05],[.68,.55,.14,.16]],
    // A three-quarter palm view reveals the index/thumb relationship instead
    // of disguising their curl behind a flat, dorsal hand silhouette.
    thumb: [-.519,-.211,.400,-.206,-.277], view: [-2.1555,.4668,2.3838], lift: .18,
  },
  poise: {
    // The index and middle rise while ring and little fingers fold softly.
    fingers: [[.15,.15,.06,-.045],[-.02,.02,0,-.01],[.40,.95,.25,.035],[.60,1.10,.26,.10]],
    thumb: [-.30,.20,.40,-.25,-.18], view: [.6346,.3741,.2291], lift: .02,
  },
};
export const poseOptions: {id:HandPose;label:string}[] = [
  {id:'relaxed',label:'Elegance'}, {id:'pinch',label:'Pinch'},
  {id:'poise',label:'Poise'}, {id:'curl',label:'Curl'},
];
