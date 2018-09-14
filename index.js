"use strict"

const acorn = require("acorn")
const tt = acorn.tokTypes
const TokenType = acorn.TokenType

const privateNameToken = new TokenType("privateName")

function parsePrivateName() {
  const node = this.startNode()
  node.name = this.value
  this.next()
  this.finishNode(node, "PrivateName")
  if (this.options.allowReserved == "never") this.checkUnreserved(node)
  return node
}

module.exports = function(Parser) {
  return class extends Parser {
    // Parse # token
    getTokenFromCode(code) {
      if (code === 35) {
        ++this.pos
        const word = this.readWord1()
        return this.finishToken(privateNameToken, word)
      }
      return super.getTokenFromCode(code)
    }

    // Manage stacks and check for undeclared private names
    parseClass(node, isStatement) {
      this._privateBoundNamesStack = this._privateBoundNamesStack || []
      const privateBoundNames = Object.create(this._privateBoundNamesStack[this._privateBoundNamesStack.length - 1] || null)
      this._privateBoundNamesStack.push(privateBoundNames)
      this._unresolvedPrivateNamesStack = this._unresolvedPrivateNamesStack || []
      const unresolvedPrivateNames = Object.create(null)
      this._unresolvedPrivateNamesStack.push(unresolvedPrivateNames)
      const _return = super.parseClass(node, isStatement)
      this._privateBoundNamesStack.pop()
      this._unresolvedPrivateNamesStack.pop()
      if (!this._unresolvedPrivateNamesStack.length) {
        const names = Object.keys(unresolvedPrivateNames)
        if (names.length) {
          names.sort((n1, n2) => unresolvedPrivateNames[n1] - unresolvedPrivateNames[n2])
          this.raise(unresolvedPrivateNames[names[0]], "Usage of undeclared private name")
        }
      } else Object.assign(this._unresolvedPrivateNamesStack[this._unresolvedPrivateNamesStack.length - 1], unresolvedPrivateNames)
      return _return
    }

    // Parse private methods
    parseClassElement() {
      const oldInClassMemberName = this._inClassMemberName
      this._inClassMemberName = true
      const result = super.parseClassElement()
      this._inClassMemberName = oldInClassMemberName
      return result
    }

    parsePropertyName(prop) {
      const isPrivate = this.options.ecmaVersion >= 8 && this._inClassMemberName && this.type == privateNameToken
      this._inClassMemberName = false
      if (!isPrivate) return super.parsePropertyName(prop)
      prop.computed = false
      prop.key = parsePrivateName.call(this)
      if (prop.key.name == "constructor") this.raise(prop.start, "Classes may not have a private method named constructor")
      const privateBoundNames = this._privateBoundNamesStack[this._privateBoundNamesStack.length - 1]
      if (Object.prototype.hasOwnProperty.call(privateBoundNames, prop.key.name) && !(prop.kind === "get" && privateBoundNames[prop.key.name] === "set") && !(prop.kind === "set" && privateBoundNames[prop.key.name] === "get")) this.raise(prop.start, "Duplicate private element")
      privateBoundNames[prop.key.name] = prop.kind
      delete this._unresolvedPrivateNamesStack[this._unresolvedPrivateNamesStack.length - 1][prop.key.name]

      prop.key.type = "PrivateName"
      return prop.key
    }

    parseClassMethod(method, isGenerator, isAsync) {
      const oldInPrivateClassMethod = this._inPrivateClassMethod
      this._inPrivateClassMethod = method.key.type == "PrivateName"
      const ret = super.parseClassMethod(method, isGenerator, isAsync)
      this._inPrivateClassMethod = oldInPrivateClassMethod
      return ret
    }

    // Parse private element access
    parseSubscripts(base, startPos, startLoc, noCalls) {
      for (let computed; ;) {
        if ((computed = this.eat(tt.bracketL)) || this.eat(tt.dot)) {
          let node = this.startNodeAt(startPos, startLoc)
          node.object = base
          if (computed) {
            node.property = this.parseExpression()
          } else if (this.type == privateNameToken) {
            node.property = parsePrivateName.call(this)
            if (!this._privateBoundNamesStack.length || !this._privateBoundNamesStack[this._privateBoundNamesStack.length - 1][node.property.name]) {
              this._unresolvedPrivateNamesStack[this._unresolvedPrivateNamesStack.length - 1][node.property.name] = node.property.start
            }
          } else {
            node.property = this.parseIdent(true)
          }
          node.computed = Boolean(computed)
          if (computed) this.expect(tt.bracketR)
          base = this.finishNode(node, "MemberExpression")
        } else {
          return super.parseSubscripts(base, startPos, startLoc, noCalls)
        }
      }
    }

    // Prohibit delete of private class elements
    parseMaybeUnary(refDestructuringErrors, sawUnary) {
      const _return = super.parseMaybeUnary(refDestructuringErrors, sawUnary)
      if (_return.operator == "delete") {
        if (_return.argument.type == "MemberExpression" && _return.argument.property.type == "PrivateName") {
          this.raise(_return.start, "Private elements may not be deleted")
        }
      }
      return _return
    }

    // Prohibit direct super in private methods
    parseExprAtom(refDestructuringErrors) {
      const atom = super.parseExprAtom(refDestructuringErrors)
      if (this._inPrivateClassMethod && atom.type == "Super" && this.type == tt.parenL) this.raise(atom.start, "A class method that is not a constructor may not contain a direct super")
      return atom
    }
  }
}
