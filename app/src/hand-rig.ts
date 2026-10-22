import * as THREE from 'three';
import type { PoseDescription } from './hand-poses';

export const HAND_DIGITS = ['thumb', 'index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'];
export type PoseJoint = { bone: THREE.Object3D; rest: THREE.Quaternion };

/** The bundled WebXR asset contains flat, wrist-space joints. Rebuild its
 * anatomical chains without moving the bind pose or invalidating skinning. */
export function articulateHand(model: THREE.Object3D): PoseJoint[] {
  model.updateWorldMatrix(true, true);
  const wrist = model.getObjectByName('wrist');
  if (!wrist) return [];
  const joints: PoseJoint[] = [];
  for (const digit of HAND_DIGITS) {
    let parent = wrist;
    const parts = ['metacarpal', 'phalanx-proximal', ...(digit === 'thumb' ? [] : ['phalanx-intermediate']), 'phalanx-distal', 'tip'];
    for (const part of parts) {
      const bone = model.getObjectByName(`${digit}-${part}`);
      if (!bone) continue;
      parent.attach(bone);
      joints.push({ bone, rest: bone.quaternion.clone() });
      parent = bone;
    }
  }
  model.updateMatrixWorld(true);
  return joints;
}

export function targetJointRotation(joint: PoseJoint, pose: PoseDescription) {
  const { name } = joint.bone;
  let x = 0, y = 0, z = 0;
  if (name === 'thumb-metacarpal') [x, y, z] = pose.thumb;
  else if (name === 'thumb-phalanx-proximal') x = pose.thumb[3];
  else if (name === 'thumb-phalanx-distal') x = pose.thumb[4];
  else {
    const index = HAND_DIGITS.findIndex(digit => name.startsWith(`${digit}-`)) - 1;
    const finger = pose.fingers[index];
    if (finger) {
      // Actual GLB joint frames have -Z along the digit and +Y toward the nail.
      // Negative X curls toward the palm; Y spreads at the knuckle. Apply in
      // that local frame, after the recorded rest rotation.
      if (name.endsWith('phalanx-proximal')) { x = -finger[0]; y = finger[3]; }
      else if (name.endsWith('phalanx-intermediate')) x = -finger[1];
      else if (name.endsWith('phalanx-distal')) x = -finger[2];
    }
  }
  return joint.rest.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z))).normalize();
}

/** Snapshot the currently displayed joints, including an interrupted blend. */
export function beginJointTransition(joints: PoseJoint[], pose: PoseDescription, options: { coordinated?: boolean } = {}) {
  const from = joints.map(joint => joint.bone.quaternion.clone());
  const to = joints.map(joint => targetJointRotation(joint, pose));
  return (progress: number) => {
    joints.forEach((joint, index) => {
      const amount = options.coordinated ? poseJointProgress(joint.bone.name, progress) : progress;
      // Exact endpoints also preserve an interrupted first frame: Three's
      // small-angle slerp branch otherwise normalizes it by a tiny amount.
      if (amount <= 0) joint.bone.quaternion.copy(from[index]);
      else if (amount >= 1) joint.bone.quaternion.copy(to[index]);
      else joint.bone.quaternion.slerpQuaternions(from[index], to[index], amount);
    });
  };
}

/** Zero velocity and acceleration at the ends of the pose change. */
export function poseEase(progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  return t ** 3 * (t * (t * 6 - 15) + 10);
}

/** A small anatomical follow-through: palm/wrist leads, then knuckles, then
 * the fingertip joints. Delays stay below 110ms rather than moving one whole
 * finger at a time. Each channel reaches its exact endpoint. */
export function poseJointProgress(name: string, progress: number) {
  const finger = Math.max(0, HAND_DIGITS.findIndex(digit => name.startsWith(`${digit}-`)) - 1);
  const lag = finger * .012;
  let start = .012 + lag, end = .86 + lag;
  if (name.endsWith('phalanx-intermediate')) { start = .045 + lag; end = .93 + lag; }
  else if (name.endsWith('phalanx-distal') || name.endsWith('-tip')) { start = .08 + lag; end = 1; }
  return poseEase((progress - start) / (end - start));
}

export function poseWristProgress(progress: number) {
  return poseEase(progress / .82);
}
