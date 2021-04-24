import hasha from 'hasha';
import stableStringify from 'safe-stable-stringify';
import invariant from 'ts-invariant';

export type LeafShape = Primitive | ArrayShape | ObjectRef;

export interface Primitive {
  kind: 'primitive';
  type: 'string' | 'boolean' | 'number' | 'null';
}

export interface ArrayShape {
  kind: 'array';
  types: LeafShape[];
}

export interface ObjectShapeField {
  name: string;
  type: LeafShape[];
  nullable?: boolean;
}

export interface ObjectShape {
  kind: 'object';
  fields: ObjectShapeField[];
}

export interface ObjectRef {
  kind: 'objectRef';
  targetId: string;
}

export type Shape = Primitive | ArrayShape | ObjectShape | ObjectRef;

export type NonRefShape = Exclude<Shape, ObjectRef>;

export type ObjectMap = Map<string, ArrayShape | ObjectShape>;

export function notEmpty<TValue>(
  value: TValue | null | undefined,
): value is TValue {
  return value !== null && value !== undefined;
}

export function getObjectHash(thing: unknown): string {
  return hasha(stableStringify(thing), { algorithm: 'md5' });
}

export function unwrap(
  objectMap: ObjectMap,
  shape: LeafShape,
): Primitive | ArrayShape | ObjectShape;
export function unwrap(
  objectMap: ObjectMap,
  shape: ArrayShape | ObjectShape | ObjectRef,
): ArrayShape | ObjectShape;
export function unwrap(objectMap: ObjectMap, shape: Shape): NonRefShape {
  if (shape.kind === 'objectRef') {
    const unwrapped = objectMap.get(shape.targetId);
    invariant(unwrapped, `Shape not found in map. ID: ${shape.targetId}`);
    return unwrapped;
  } else {
    return shape;
  }
}

export function saveObject(
  objectMap: ObjectMap,
  object: ObjectShape,
): ObjectRef {
  const hash = getObjectHash(object);
  objectMap.set(hash, object);
  return { kind: 'objectRef', targetId: hash };
}

export function isObjectShape(shape: Shape): shape is ObjectShape {
  return shape.kind === 'object';
}

export function isArrayShape(shape: Shape): shape is ArrayShape {
  return shape.kind === 'array';
}

export function isObjectRef(shape: Shape): shape is ObjectRef {
  return shape.kind === 'objectRef';
}

export function isPrimitive(shape: Shape): shape is Primitive {
  return shape.kind === 'primitive';
}
