import type { NailAppearance } from './HandScene';

// The AR renderer approximates unsupported effects. Only intentional AR edits
// may replace source fields; its preview must never flatten the source design.
export function mergeArAdjustments(source: readonly NailAppearance[], preview: readonly NailAppearance[], keys: readonly string[]): NailAppearance[] {
  return source.map((n,i)=>({...n,
    ...(keys.includes('base')||keys.includes('tone')?{color:preview[i].color}:{}),
    ...(keys.includes('length')?{length:preview[i].length}:{}),
    ...(keys.includes('shape')?{shape:preview[i].shape}:{}),
    ...(keys.includes('material')?{finish:preview[i].finish}:{})
  }));
}
