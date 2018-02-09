"use strict"

const assert = require("assert")
const acorn = require("..")

function test(text, expectedResult, additionalOptions) {
  it(text, function () {
    const result = acorn.parse(text, Object.assign({ ecmaVersion: 9, plugins: { privateMethods: true } }, additionalOptions))
    if (expectedResult) {
      assert.deepEqual(result.body[0], expectedResult)
    }
  })
}
function testFail(text, expectedResult, additionalOptions) {
  it(text, function () {
    let failed = false
    try {
      acorn.parse(text, Object.assign({ ecmaVersion: 9, plugins: { privateMethods: true } }, additionalOptions))
    } catch (e) {
      assert.equal(e.message, expectedResult)
      failed = true
    }
    assert(failed)
  })
}

describe("acorn-private-methods", function () {
  test("class A { a() { this.#a }; #a() {} }")

  testFail("class A { #a() {}; f() { delete this.#a } }", "Private elements may not be deleted (1:25)")
  testFail("class A { #a() {}; #a() {} }", "Duplicate private element (1:19)")
  test("class A { get #a() {}; set #a(newA) {} }")
  testFail("class A { a() { this.#a } }", "Usage of undeclared private name (1:21)")
  testFail("class A { a() { this.#a } b() { this.#b } }", "Usage of undeclared private name (1:21)")
  testFail("class A { #constructor() {} }", "Classes may not have a private method named constructor (1:10)")
  testFail("class A { #[ab]() {} }", "Unexpected token (1:11)")
  testFail("a = { #ab() {} }", "Unexpected token (1:6)")
  testFail("class A { [{#ab() {}}]() {} }", "Unexpected token (1:12)")
  testFail("class A{ # a() {}}", "Unexpected token (1:11)")

  const classes = [
    { text: "class A { %s }", ast: getBody => {
      const body = getBody(10)
      return {
        type: "ClassDeclaration",
        start: 0,
        end: body.end + 2,
        id: {
          type: "Identifier",
          start: 6,
          end: 7,
          name: "A"
        },
        superClass: null,
        body: {
          type: "ClassBody",
          start: 8,
          end: body.end + 2,
          body: [body]
        }
      }
    } },
    { text: "class A { %s; }", ast: getBody => {
      const body = getBody(10)
      return {
        type: "ClassDeclaration",
        start: 0,
        end: body.end + 3,
        id: {
          type: "Identifier",
          start: 6,
          end: 7,
          name: "A"
        },
        superClass: null,
        body: {
          type: "ClassBody",
          start: 8,
          end: body.end + 3,
          body: [body]
        }
      }
    } },
    { text: "class A { %s; #y() {} }", ast: getBody => {
      const body = getBody(10)
      return {
        type: "ClassDeclaration",
        start: 0,
        end: body.end + 11,
        id: {
          type: "Identifier",
          start: 6,
          end: 7,
          name: "A"
        },
        superClass: null,
        body: {
          type: "ClassBody",
          start: 8,
          end: body.end + 11,
          body: [body, {
            type: "MethodDefinition",
            start: body.end + 2,
            end: body.end + 9,
            kind: "method",
            static: false,
            computed: false,
            key: {
              type: "PrivateName",
              start: body.end + 2,
              end: body.end + 4,
              name: "y"
            },
            value: {
              type: "FunctionExpression",
              start: body.end + 4,
              end: body.end + 9,
              id: null,
              generator: false,
              expression: false,
              async: false,
              params: [],
              body: {
                type: "BlockStatement",
                start: body.end + 7,
                end: body.end + 9,
                body: []
              }
            }
          } ]
        }
      }
    } },
    { text: "class A { %s;a() {} }", ast: getBody => {
      const body = getBody(10)
      return {
        type: "ClassDeclaration",
        start: 0,
        end: body.end + 9,
        id: {
          type: "Identifier",
          start: 6,
          end: 7,
          name: "A"
        },
        superClass: null,
        body: {
          type: "ClassBody",
          start: 8,
          end: body.end + 9,
          body: [ body, {
            type: "MethodDefinition",
            start: body.end + 1,
            end: body.end + 7,
            kind: "method",
            static: false,
            computed: false,
            key: {
              type: "Identifier",
              start: body.end + 1,
              end: body.end + 2,
              name: "a"
            },
            value: {
              type: "FunctionExpression",
              start: body.end + 2,
              end: body.end + 7,
              id: null,
              generator: false,
              expression: false,
              async: false,
              params: [],
              body: {
                type: "BlockStatement",
                start: body.end + 5,
                end: body.end + 7,
                body: []
              }
            }
          } ]
        }
      }
    } },
    { text: "class A { %s\na() {} }", ast: getBody => {
      const body = getBody(10)
      return {
        type: "ClassDeclaration",
        start: 0,
        end: body.end + 9,
        id: {
          type: "Identifier",
          start: 6,
          end: 7,
          name: "A"
        },
        superClass: null,
        body: {
          type: "ClassBody",
          start: 8,
          end: body.end + 9,
          body: [
            body,
            {
              type: "MethodDefinition",
              start: body.end + 1,
              end: body.end + 7,
              kind: "method",
              static: false,
              computed: false,
              key: {
                type: "Identifier",
                start: body.end + 1,
                end: body.end + 2,
                name: "a"
              },
              value: {
                type: "FunctionExpression",
                start: body.end + 2,
                end: body.end + 7,
                id: null,
                generator: false,
                expression: false,
                async: false,
                params: [],
                body: {
                  type: "BlockStatement",
                  start: body.end + 5,
                  end: body.end + 7,
                  body: []
                }
              }
            }
          ]
        }
      }
    } },
  ];

  [
    { body: "#x() {}", passes: true, ast: start => ({
      type: "MethodDefinition",
      start: start,
      end: start + 7,
      computed: false,
      key: {
        type: "PrivateName",
        start: start,
        end: start + 2,
        name: "x"
      },
      kind: "method",
      static: false,
      value: {
        type: "FunctionExpression",
        start: start + 2,
        end: start + 7,
        async: false,
        body: {
          body: [],
          start: start + 5,
          end: start + 7,
          type: "BlockStatement"
        },
        expression: false,
        generator: false,
        id: null,
        params: [],
      }
    }) },
    { body: "get #x() {}", passes: true, ast: start => ({
      type: "MethodDefinition",
      start: start,
      end: start + 11,
      computed: false,
      key: {
        type: "PrivateName",
        start: start + 4,
        end: start + 6,
        name: "x"
      },
      kind: "get",
      static: false,
      value: {
        type: "FunctionExpression",
        start: start + 6,
        end: start + 11,
        async: false,
        body: {
          body: [],
          start: start + 9,
          end: start + 11,
          type: "BlockStatement"
        },
        expression: false,
        generator: false,
        id: null,
        params: [],
      }
    }) },

  ].forEach(bodyInput => {
    const body = bodyInput.body, passes = bodyInput.passes, bodyAst = bodyInput.ast
    classes.forEach(input => {
      const text = input.text, options = input.options || {}, ast = input.ast;
      (passes ? test : testFail)(text.replace("%s", body), ast(bodyAst), options)
    })
  })

  testFail("class C { \\u0061sync m(){} };", "Unexpected token (1:21)")
})
