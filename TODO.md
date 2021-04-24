# todo list

- Investigate threshold thing to make a union if there are objects that look
  very different in inferencer. As in, detect discriminated unions.
- Can we drop some of the ".every(isSomeType)" things? Figure out why some of
  the recurse out of stack now.
- Organize tests in describe blocks.
- Option to override name of root.
- Option to override name of "guessed" field.
- Option to have callback thingy for name transformation.
- Rename `JsonType` to something less vague?
- Add some examples?
- Figure out if a `never` type is needed for places where we infer an empty
  array.
- Set up husky
- Look into @commitlint/config-conventional

Probably use this or similar to make sure unions are collapsed

```
function coaleceTypes(t: (Primitive | ArrayShape | ObjectRef)[]): AnyType {
  const types = t.map(toType);
  if (types.length === 0) {
    return { kind: 'primitive', type: 'null' };
  } else if (types.length === 1) {
    return types[0];
  } else {
    return { kind: 'union', types };
  }
}
```
