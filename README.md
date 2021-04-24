# guess-json-shape

Given a lump of JSON, this module will try to guess the shape of the JSON,
returning a structure that describes the types and structure of the data.

This can be useful when writing tools that perform transformations such as
"json-to-typescript" or "json-to-runtypes"

The library is able make reasonable guesses about the structure of objects in
arrays, including nullable fields.

The way most of the guessing is done is heavily inspired by
[json-to-ts](https://www.npmjs.com/package/json-to-ts).

## Quick start

```typescript
import { guess } from 'guess-json-shape';

// Some data to analyze, for example an API response
const jsonData = {
  data: {
    articles: [
      { id: '1', slug: 'tutorial', body: 'text here', published: true },
      { id: '2', slug: 'intermediate', body: 'text here', tags: ['docs'] },
    ],
  },
  links: {
    self: 'http://example.com/articles',
    next: 'http://example.com/articles?page=2',
    last: 'http://example.com/articles?page=10',
  },
};

const guessed = guess(jsonData);
```

The value of `guessed` is the following:

```typescript
[
  {
    name: 'Articles',
    isRoot: false,
    type: {
      kind: 'object',
      fields: [
        {
          name: 'id',
          nullable: false,
          type: { kind: 'primitive', type: 'string' },
        },
        {
          name: 'slug',
          nullable: false,
          type: { kind: 'primitive', type: 'string' },
        },
        {
          name: 'body',
          nullable: false,
          type: { kind: 'primitive', type: 'string' },
        },
        {
          name: 'published',
          nullable: true,
          type: { kind: 'primitive', type: 'boolean' },
        },
        {
          name: 'tags',
          nullable: true,
          type: {
            kind: 'array',
            type: {
              kind: 'union',
              types: [{ kind: 'primitive', type: 'string' }],
            },
          },
        },
      ],
    },
  },

  {
    name: 'Data',
    isRoot: false,
    type: {
      kind: 'object',
      fields: [
        {
          name: 'articles',
          type: {
            kind: 'array',
            type: {
              kind: 'union',
              types: [{ kind: 'named', name: 'Articles' }],
            },
          },
        },
      ],
    },
  },

  {
    name: 'Links',
    isRoot: false,
    type: {
      kind: 'object',
      fields: [
        { name: 'self', type: { kind: 'primitive', type: 'string' } },
        { name: 'next', type: { kind: 'primitive', type: 'string' } },
        { name: 'last', type: { kind: 'primitive', type: 'string' } },
      ],
    },
  },

  {
    name: 'Root',
    isRoot: true,
    type: {
      kind: 'object',
      fields: [
        { name: 'data', type: { kind: 'named', name: 'Data' } },
        { name: 'links', type: { kind: 'named', name: 'Links' } },
      ],
    },
  },
];
```

The structure can be used to create for example type definitions. If you wrote
code to convert the above to typescript, it would look like this:

```typescript
type Articles = {
  id: string;
  slug: string;
  body: string;
  published?: boolean;
  tags?: Array<string>;
};

type Data = {
  articles: Array<Articles>;
};

type Links = {
  self: string;
  next: string;
  last: string;
};

// JSON root type
type Root = {
  data: Data;
  links: Links;
};
```

## API

A single function is exposed: `guess(json)`. It takes a single argument, that
should be some parsed JSON. It returns an array of `JsonType` objects that
represent the structure of the parsed JSON. See the

## Cabeats and known issues

- Discriminated unions are not detected. So all the candidate object shapes will
  be merged into a single object that is mostly wrong. For example:

  ```typescript
  guess([
    { kind: 'user', name: 'Rune', passwordHash: 'some-hash' },
    { kind: 'bot', id: 'automation-bot', apiKey: 'some-key' },
  ]);
  ```

  Will be detected like this:

  ```typescript
  type Guessed = {
    kind: string;
    name?: string;
    passwordHash?: string;
    id?: string;
    apiKey?: string;
  };

  type Root = Array<Guessed>;
  ```

- No attempt is made to guess if particular strings are string union types.
- Empty arrays are guessed to be arrays of `null`. That is, `guessJsonShape([])`
  is inferred to be `Array<null>`. We should perhaps introduce `never` or
  `unknown` there instead.
- Does not work on cirular structures. JSON can not be circular, but it's still
  possible to pass in something circular.
