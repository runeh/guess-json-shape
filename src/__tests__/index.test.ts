import { guess } from '../index';
import { stringify } from './stringify.utils';

describe('snapshot', () => {
  it('object with array with objects in array', () => {
    expect(
      stringify(
        guess({
          things: [
            { name: 'polly' },
            { name: 'polly', boop: { kind: 'red' } },
            { name: 'polly', boop: { subkind: 'green' } },
          ],
        }),
      ),
    ).toMatchInlineSnapshot(`
      "-
      type Boop = {
        kind?: string;
        subkind?: string;
      };

      type Things = {
        name: string;
        boop?: Boop;
      };

      type Root = {
        things: Array<Things>;
      };
      "
    `);
  });

  it('array with natives', () => {
    expect(stringify(guess(['test', 32, false]))).toMatchInlineSnapshot(`
      "-
      type Root = Array<string | number | boolean>;
      "
    `);
  });

  it('object with primitives', () => {
    expect(
      stringify(
        guess({
          name: 'test',
          age: 32,
          rad: true,
        }),
      ),
    ).toMatchInlineSnapshot(`
      "-
      type Root = {
        name: string;
        age: number;
        rad: boolean;
      };
      "
    `);
  });

  it('array with object variants', () => {
    expect(stringify(guess([{ name: 'test', rad: true }, { age: 32 }])))
      .toMatchInlineSnapshot(`
      "-
      type Guessed = {
        name?: string;
        rad?: boolean;
        age?: number;
      };

      type Root = Array<Guessed>;
      "
    `);
  });

  it('detects nullable fields', () => {
    expect(
      stringify(
        guess([
          { name: 'test', rad: true },
          { name: 'foo', age: 32 },
        ]),
      ),
    ).toMatchInlineSnapshot(`
      "-
      type Guessed = {
        name: string;
        rad?: boolean;
        age?: number;
      };

      type Root = Array<Guessed>;
      "
    `);
  });

  it('handles nested arrays', () => {
    expect(stringify(guess([[1, 2, 4]]))).toMatchInlineSnapshot(`
      "-
      type Root = Array<Array<number>>;
      "
    `);
  });

  it('handles nested arrays with different types', () => {
    expect(stringify(guess([[1, 'lollerskates', 4]]))).toMatchInlineSnapshot(`
      "-
      type Root = Array<Array<number | string>>;
      "
    `);
  });

  it('handles deeply nested arrays', () => {
    expect(stringify(guess([[[[1, 'lollerskates', 4]]]])))
      .toMatchInlineSnapshot(`
      "-
      type Root = Array<Array<Array<Array<number | string>>>>;
      "
    `);
  });

  it('handles array of arrays', () => {
    expect(
      stringify(
        guess([
          [1, 2, 4],
          [5, 6, 7],
        ]),
      ),
    ).toMatchInlineSnapshot(`
      "-
      type Root = Array<Array<number>>;
      "
    `);
  });

  it('handles array of arrays with different types', () => {
    expect(
      stringify(
        guess([
          [1, 2, 4],
          ['foo', true],
        ]),
      ),
    ).toMatchInlineSnapshot(`
      "-
      type Root = Array<Array<number | string | boolean>>;
      "
    `);
  });

  it('handles null in native arrays', () => {
    expect(stringify(guess([1, '3', null]))).toMatchInlineSnapshot(`
      "-
      type Root = Array<number | string | null>;
      "
    `);
  });

  it('handles null in object arrays', () => {
    expect(stringify(guess([{ name: 'boop' }, null, { name: 'foo' }])))
      .toMatchInlineSnapshot(`
      "-
      type Guessed = {
        name: string;
      };

      type Root = Array<Guessed | null>;
      "
    `);
  });

  it('handles mixed arrays', () => {
    expect(stringify(guess([{ name: 'boop' }, 'foo', null, [1, 2, 3]])))
      .toMatchInlineSnapshot(`
      "-
      type Guessed = {
        name: string;
      };

      type Root = Array<Guessed | Array<number> | string | null>;
      "
    `);
  });

  it('does proper naming with counts for roots', () => {
    expect(
      stringify(
        guess({
          nameMe: { name: 'test' },
          boop: {
            nameMe: {
              age: 32,
            },
          },
        }),
      ),
    ).toMatchInlineSnapshot(`
      "-
      type NameMe1 = {
        name: string;
      };

      type NameMe2 = {
        age: number;
      };

      type Boop = {
        nameMe: NameMe2;
      };

      type Root = {
        nameMe: NameMe1;
        boop: Boop;
      };
      "
    `);
  });

  it('Should not repeat root types with HAL+json', () => {
    expect(
      stringify(
        guess({
          _links: {
            self: {
              href: 'http://example.com/api/book/hal-cookbook',
            },
            next: {
              href: 'http://example.com/api/book/hal-case-study',
            },
            prev: {
              href: 'http://example.com/api/book/json-and-beyond',
            },
            first: {
              href: 'http://example.com/api/book/catalog',
            },
            last: {
              href: 'http://example.com/api/book/upcoming-books',
            },
          },
          _embedded: {
            author: {
              _links: {
                self: {
                  href: 'http://example.com/api/author/shahadat',
                },
              },
              id: 'shahadat',
              name: 'Shahadat Hossain Khan',
              homepage: 'http://author-example.com',
            },
          },
          id: 'hal-cookbook',
          name: 'HAL Cookbook',
        }),
      ),
    ).toMatchInlineSnapshot(`
      "-
      type Self = {
        href: string;
      };

      type _links1 = {
        self: Self;
        next: Self;
        prev: Self;
        first: Self;
        last: Self;
      };

      type _links2 = {
        self: Self;
      };

      type Author = {
        _links: _links2;
        id: string;
        name: string;
        homepage: string;
      };

      type _embedded = {
        author: Author;
      };

      type Root = {
        _links: _links1;
        _embedded: _embedded;
        id: string;
        name: string;
      };
      "
    `);
  });

  it('inlines arrays', () => {
    expect(stringify(guess({ things: [1, 2, 3] }))).toMatchInlineSnapshot(`
      "-
      type Root = {
        things: Array<number>;
      };
      "
    `);
  });

  it('guess ok name for object array child', () => {
    expect(stringify(guess({ things: [{ count: 1 }, { count: 2 }] })))
      .toMatchInlineSnapshot(`
      "-
      type Things = {
        count: number;
      };

      type Root = {
        things: Array<Things>;
      };
      "
    `);
  });

  it('does the right thing when input is empty object', () => {
    expect(guess({})).toMatchInlineSnapshot(`
      Array [
        Object {
          "isRoot": true,
          "name": "Root",
          "type": Object {
            "fields": Array [],
            "kind": "object",
          },
        },
      ]
    `);
  });

  it('doesnt give union when there is only a single type in array', () => {
    expect(guess([1])).toMatchInlineSnapshot(`
      Array [
        Object {
          "isRoot": true,
          "name": "Root",
          "type": Object {
            "kind": "array",
            "type": Object {
              "kind": "primitive",
              "type": "number",
            },
          },
        },
      ]
    `);
  });

  it('does the right thing when input is empty array', () => {
    expect(guess([])).toMatchInlineSnapshot(`
      Array [
        Object {
          "isRoot": true,
          "name": "Root",
          "type": Object {
            "kind": "array",
            "type": Object {
              "kind": "primitive",
              "type": "never",
            },
          },
        },
      ]
    `);
  });

  it('does the right thing when input is empty array in object', () => {
    // the snapshot here is wrong
    expect(guess({ things: [] })).toMatchInlineSnapshot(`
      Array [
        Object {
          "isRoot": true,
          "name": "Root",
          "type": Object {
            "fields": Array [
              Object {
                "name": "things",
                "nullable": false,
                "type": Object {
                  "kind": "array",
                  "type": Object {
                    "kind": "primitive",
                    "type": "never",
                  },
                },
              },
            ],
            "kind": "object",
          },
        },
      ]
    `);
  });

  it('coalesces types to single type', () => {
    expect(guess([1, 2, 3])).toMatchInlineSnapshot(`
      Array [
        Object {
          "isRoot": true,
          "name": "Root",
          "type": Object {
            "kind": "array",
            "type": Object {
              "kind": "primitive",
              "type": "number",
            },
          },
        },
      ]
    `);
  });

  it('coalesces types when multiple types in array', () => {
    expect(guess([1, 'test', true, { name: 'test' }])).toMatchInlineSnapshot(`
      Array [
        Object {
          "isRoot": false,
          "name": "Guessed",
          "type": Object {
            "fields": Array [
              Object {
                "name": "name",
                "nullable": false,
                "type": Object {
                  "kind": "primitive",
                  "type": "string",
                },
              },
            ],
            "kind": "object",
          },
        },
        Object {
          "isRoot": true,
          "name": "Root",
          "type": Object {
            "kind": "array",
            "type": Object {
              "kind": "union",
              "types": Array [
                Object {
                  "kind": "named",
                  "name": "Guessed",
                },
                Object {
                  "kind": "primitive",
                  "type": "number",
                },
                Object {
                  "kind": "primitive",
                  "type": "string",
                },
                Object {
                  "kind": "primitive",
                  "type": "boolean",
                },
              ],
            },
          },
        },
      ]
    `);
  });

  it('coalesces types to null for empty arrays', () => {
    expect(guess([])).toMatchInlineSnapshot(`
      Array [
        Object {
          "isRoot": true,
          "name": "Root",
          "type": Object {
            "kind": "array",
            "type": Object {
              "kind": "primitive",
              "type": "never",
            },
          },
        },
      ]
    `);
  });

  it('coalesces types to single type in object', () => {
    expect(guess({ things: [1, 2, 3] })).toMatchInlineSnapshot(`
      Array [
        Object {
          "isRoot": true,
          "name": "Root",
          "type": Object {
            "fields": Array [
              Object {
                "name": "things",
                "nullable": false,
                "type": Object {
                  "kind": "array",
                  "type": Object {
                    "kind": "primitive",
                    "type": "number",
                  },
                },
              },
            ],
            "kind": "object",
          },
        },
      ]
    `);
  });

  it('coalesces types when multiple types in array in object', () => {
    expect(guess({ things: [1, 'test', true, { name: 'test' }] }))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "isRoot": false,
          "name": "Things",
          "type": Object {
            "fields": Array [
              Object {
                "name": "name",
                "nullable": false,
                "type": Object {
                  "kind": "primitive",
                  "type": "string",
                },
              },
            ],
            "kind": "object",
          },
        },
        Object {
          "isRoot": true,
          "name": "Root",
          "type": Object {
            "fields": Array [
              Object {
                "name": "things",
                "nullable": false,
                "type": Object {
                  "kind": "array",
                  "type": Object {
                    "kind": "union",
                    "types": Array [
                      Object {
                        "kind": "named",
                        "name": "Things",
                      },
                      Object {
                        "kind": "primitive",
                        "type": "number",
                      },
                      Object {
                        "kind": "primitive",
                        "type": "string",
                      },
                      Object {
                        "kind": "primitive",
                        "type": "boolean",
                      },
                    ],
                  },
                },
              },
            ],
            "kind": "object",
          },
        },
      ]
    `);
  });

  it('coalesces types to null for empty arrays in object', () => {
    expect(guess({ things: [] })).toMatchInlineSnapshot(`
      Array [
        Object {
          "isRoot": true,
          "name": "Root",
          "type": Object {
            "fields": Array [
              Object {
                "name": "things",
                "nullable": false,
                "type": Object {
                  "kind": "array",
                  "type": Object {
                    "kind": "primitive",
                    "type": "never",
                  },
                },
              },
            ],
            "kind": "object",
          },
        },
      ]
    `);
  });

  it('combines equal types', () => {
    expect(
      stringify(
        guess({
          image: {
            href: 'https://example.com/image',
          },
          episodes: [
            {
              image: {
                href: 'https://example.com/image',
              },
            },
          ],
        }),
      ),
    ).toMatchInlineSnapshot(`
      "-
      type Image = {
        href: string;
      };

      type Episodes = {
        image: Image;
      };

      type Root = {
        image: Image;
        episodes: Array<Episodes>;
      };
      "
    `);
  });
});
