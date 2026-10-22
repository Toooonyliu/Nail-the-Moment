import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { OBB } from 'three/examples/jsm/math/OBB.js';
import { handPoses, poseOptions } from '../src/hand-poses.ts';
import { articulateHand, beginJointTransition, HAND_DIGITS, poseEase, poseJointProgress, poseWristProgress } from '../src/hand-rig.ts';

// Read the actual asset's joint transforms, so changing a pose or its axis
// mapping is tested against the same skeleton that the browser skins.
function loadRig() {
  const bytes = readFileSync(new URL('../public/assets/3d/generic-hand-left.glb', import.meta.url));
  const asset = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const boneIndices = new Set(asset.skins.flatMap(skin => skin.joints));
  const nodes = asset.nodes.map((node, index) => {
    const object = boneIndices.has(index) ? new THREE.Bone() : new THREE.Object3D();
    object.name = node.name;
    object.position.fromArray(node.translation ?? [0, 0, 0]);
    object.quaternion.fromArray(node.rotation ?? [0, 0, 0, 1]);
    object.scale.fromArray(node.scale ?? [1, 1, 1]);
    return object;
  });
  asset.nodes.forEach((node, index) => node.children?.forEach(child => nodes[index].add(nodes[child])));
  const model = new THREE.Group();
  asset.scenes[0].nodes.forEach(index => model.add(nodes[index]));
  model.updateMatrixWorld(true);
  const bindPositions = nodes.map(node => node.getWorldPosition(new THREE.Vector3()));
  const joints = articulateHand(model);
  const position = name => model.getObjectByName(name).getWorldPosition(new THREE.Vector3());
  const apply = pose => { beginJointTransition(joints, pose)(1); model.updateMatrixWorld(true); };
  const extension = digit => {
    const points = ['phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip'].map(part => position(`${digit}-${part}`));
    const length = points.slice(1).reduce((sum, point, index) => sum + point.distanceTo(points[index]), 0);
    return points[0].distanceTo(points[3]) / length;
  };
  return { model, nodes, joints, bindPositions, position, apply, extension };
}

test('rebuilding the actual GLB chains preserves every bind-space joint position', () => {
  const { nodes, joints, bindPositions } = loadRig();
  assert.equal(joints.length, 24);
  nodes.forEach((node, index) => assert.ok(node.getWorldPosition(new THREE.Vector3()).distanceTo(bindPositions[index]) < 1e-7));
  for (const { bone } of joints) {
    if (bone.name.endsWith('metacarpal')) assert.equal(bone.parent.name, 'wrist');
    if (bone.name.endsWith('phalanx-distal')) assert.match(bone.parent.name, /phalanx-(proximal|intermediate)$/);
    if (bone.name.endsWith('-tip')) assert.match(bone.parent.name, /phalanx-distal$/);
  }
});

test('the pose menu offers four special poses while Open remains available as the reset pose', () => {
  assert.deepEqual(poseOptions.map(option => option.id), ['relaxed', 'pinch', 'poise', 'curl']);
  assert.deepEqual(poseOptions.map(option => option.label), ['Elegance', 'Pinch', 'Poise', 'Curl']);
  assert.ok(handPoses.fan);
  assert.equal(poseOptions.some(option => option.id === 'fan'), false);
  for (const option of poseOptions) assert.ok(handPoses[option.id]);
});

test('all five available poses have distinct actual finger articulation without relying on the camera', () => {
  const { apply, position } = loadRig();
  const signatures = Object.entries(handPoses).map(([id, pose]) => {
    apply(pose);
    return { id, tips: HAND_DIGITS.map(digit => position(`${digit}-tip`)) };
  });
  signatures.forEach((first, index) => {
    for (const second of signatures.slice(index + 1)) {
      const rms = Math.sqrt(first.tips.reduce((sum, tip, finger) => sum + tip.distanceToSquared(second.tips[finger]), 0) / HAND_DIGITS.length);
      assert.ok(rms > .02, `${first.id} and ${second.id} need distinct silhouettes, got ${rms}m`);
    }
  });
});

test('Open extends all four fingers, Poise raises two, and Pinch opposes thumb and index', () => {
  const { apply, position, extension } = loadRig();
  apply(handPoses.fan);
  for (const digit of HAND_DIGITS.slice(1)) assert.ok(extension(digit) > .97, `${digit} should be extended in Open`);
  const openGap = position('thumb-tip').distanceTo(position('index-finger-tip'));
  apply(handPoses.poise);
  assert.ok(extension('index-finger') > .97);
  assert.ok(extension('middle-finger') > .97);
  assert.ok(extension('ring-finger') < .95);
  assert.ok(extension('pinky-finger') < .88);
  apply(handPoses.pinch);
  const pinchGap = position('thumb-tip').distanceTo(position('index-finger-tip'));
  assert.ok(pinchGap > .016 && pinchGap < .018, `delicate thumb/index gap was ${pinchGap}m`);
  assert.ok(pinchGap < openGap / 4);
  assert.ok(extension('middle-finger') > extension('index-finger') + .03);
});

test('Pinch and its coordinated approach leave space between the thumb and index manicure shells', () => {
  const { model, joints, position, apply } = loadRig();
  const mounts = ['thumb', 'index-finger'].map((digit, index) => {
    const tip = model.getObjectByName(`${digit}-tip`);
    const orientation = tip.getWorldQuaternion(new THREE.Quaternion());
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(orientation);
    const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(orientation);
    const across = new THREE.Vector3().crossVectors(direction, normal);
    const mount = new THREE.Group();
    mount.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across, direction, normal));
    mount.position.copy(position(`${digit}-tip`)).addScaledVector(normal, index === 0 ? .006 : .0054);
    model.add(mount);
    model.getObjectByName(`${digit}-phalanx-distal`).attach(mount);
    return mount;
  });
  apply(handPoses.pinch);
  const intersects = () => {
    const shells = mounts.map((mount, index) => new OBB(
      new THREE.Vector3(0, 0, .0006),
      new THREE.Vector3((index === 0 ? .0136 : .0116) / 2, .0205 / 2, .001),
      new THREE.Matrix3(),
    ).applyMatrix4(mount.matrixWorld));
    return shells[0].intersectsOBB(shells[1]);
  };
  assert.equal(intersects(), false);
  for (const [id, from] of Object.entries(handPoses)) {
    apply(from);
    const blend = beginJointTransition(joints, handPoses.pinch, { coordinated: true });
    for (let step = 0; step <= 20; step++) {
      blend(step / 20); model.updateMatrixWorld(true);
      assert.equal(intersects(), false, `${id} to Pinch intersects at ${step / 20}`);
    }
  }
});

test('display views show manicure surfaces while allowing the classical pinch to turn toward the palm', () => {
  const { model, apply } = loadRig();
  const dorsalView = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, -Math.PI / 2, 0));
  for (const id of ['relaxed', 'pinch', 'poise', 'fan']) {
    apply(handPoses[id]);
    const view = new THREE.Quaternion().setFromEuler(new THREE.Euler(...handPoses[id].view));
    let frontNails = 0;
    for (const digit of HAND_DIGITS) {
      const tip = model.getObjectByName(`${digit}-tip`);
      const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(tip.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(dorsalView);
      normal.x *= -1; // Studio mirrors the source left hand before the view.
      normal.applyQuaternion(view);
      if (normal.z > .1) frontNails++;
      if (id === 'fan') assert.ok(normal.z > .1, `Open ${digit} nail faces away from the camera`);
    }
    assert.ok(frontNails >= 3, `${id} should show at least three nail faces from its natural display angle`);
  }
});

test('coordinated motion lets the wrist lead and fingertips follow without losing exact interrupted endpoints', () => {
  const { joints, apply } = loadRig();
  const knuckle = poseJointProgress('index-finger-phalanx-proximal', .4);
  const middle = poseJointProgress('index-finger-phalanx-intermediate', .4);
  const tip = poseJointProgress('index-finger-phalanx-distal', .4);
  assert.ok(poseWristProgress(.4) > knuckle && knuckle > middle && middle > tip);
  apply(handPoses.fan);
  beginJointTransition(joints, handPoses.pinch, { coordinated: true })(.48);
  const interrupted = joints.map(({ bone }) => bone.quaternion.clone());
  const redirect = beginJointTransition(joints, handPoses.relaxed, { coordinated: true });
  redirect(0);
  joints.forEach(({ bone }, index) => assert.ok(bone.quaternion.equals(interrupted[index])));
  redirect(1);
  const endpoint = joints.map(({ bone }) => bone.quaternion.clone());
  apply(handPoses.relaxed);
  joints.forEach(({ bone }, index) => assert.ok(bone.quaternion.equals(endpoint[index])));
});

test('switching pose mid-transition starts from the displayed joints and never accumulates offsets', () => {
  const { joints, apply } = loadRig();
  apply(handPoses.fan);
  beginJointTransition(joints, handPoses.curl)(poseEase(.45));
  const interrupted = joints.map(({ bone }) => bone.quaternion.clone());
  const redirect = beginJointTransition(joints, handPoses.poise);
  redirect(0);
  joints.forEach(({ bone }, index) => assert.ok(bone.quaternion.equals(interrupted[index])));
  redirect(1);
  const expected = joints.map(({ bone }) => bone.quaternion.clone());
  for (let cycle = 0; cycle < 10; cycle++) {
    apply(handPoses.pinch); apply(handPoses.relaxed); apply(handPoses.curl); apply(handPoses.poise);
  }
  joints.forEach(({ bone }, index) => assert.ok(bone.quaternion.equals(expected[index])));
  assert.equal(poseEase(-1), 0);
  assert.equal(poseEase(2), 1);
  assert.ok(Math.abs(poseEase(.5) - .5) < 1e-12);
});

test('a nail mounted to a distal joint keeps its local attachment through every blend', () => {
  const { model, joints, position } = loadRig();
  const distal = model.getObjectByName('ring-finger-phalanx-distal');
  const nail = new THREE.Group();
  nail.position.copy(position('ring-finger-tip')).add(new THREE.Vector3(0, .0054, 0));
  model.add(nail);
  distal.attach(nail);
  const localPosition = nail.position.clone();
  const localRotation = nail.quaternion.clone();
  const worldStart = nail.getWorldPosition(new THREE.Vector3());
  for (const pose of Object.values(handPoses)) {
    const blend = beginJointTransition(joints, pose);
    for (const progress of [0, .25, .5, .75, 1]) {
      blend(poseEase(progress)); model.updateMatrixWorld(true);
      assert.ok(nail.position.distanceTo(localPosition) < 1e-12);
      assert.ok(nail.quaternion.equals(localRotation));
      const expected = localPosition.clone().applyMatrix4(distal.matrixWorld);
      assert.ok(nail.getWorldPosition(new THREE.Vector3()).distanceTo(expected) < 1e-10);
    }
  }
  assert.ok(nail.getWorldPosition(new THREE.Vector3()).distanceTo(worldStart) > .01);
});
