/*
Copyright (c) 2014 Amin Ullah Khan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $ */

define(function (require, module, exports) {
	"use strict";

	var AppInit			= brackets.getModule('utils/AppInit'),
		CodeHintManager	= brackets.getModule('editor/CodeHintManager'),
		LanguageManager	= brackets.getModule('language/LanguageManager'),
		XMLUtils		= require('./XMLUtils'),
		SVGTags			= require('text!SVGTags.json'),
		SVGAttributes	= require('text!SVGAttributes.json'),
		tags,
		attributes;

	// Define Custom language for CodeHints
	LanguageManager.defineLanguage("svg", {
		name: "SVG",
		mode: "xml",
		fileExtensions: ["svg"],
		blockComment: ["<!--", "-->"]
	});

	function SVGCodeHints() {}

	SVGCodeHints.prototype.hasHints = function (editor, implicitChar) {
		this.editor = editor;
		this.initialPos = editor.getCursorPos();
		if (XMLUtils.getXMLTagInfo(this.editor, this.initialPos) !== false) {
			return true;
		}
		return false;
	};

	SVGCodeHints.prototype.getHints = function (implicitChar) {
		this.currentPos = this.editor.getCursorPos();
		var context = XMLUtils.getXMLTagInfo(this.editor, this.initialPos, this.currentPos);
		var hints = [], i, attrs;

		if (context.tokenType === XMLUtils._tTAG) { // tag
			for (i in tags) {
				if (i.indexOf(context.query) === 0) {
					hints.push(i);
				}
			}
		}
		if (context.tokenType === XMLUtils._tATTR) { // attribute
			if (!tags[context.tagName] && (!tags[context.tagName].attributes || !tags[context.tagName].alias))
				return false;

			attrs = tags[context.tagName].attributes || tags[tags[context.tagName].alias].attributes;
			attrs.forEach(function (arg) {
				if (arg.indexOf(context.query) === 0 && context.exclusionList.indexOf(arg) === -1) {
					hints.push(arg);
				}
			});
		}
		if (context.tokenType === XMLUtils._tVALUE) { // attribute-value
			var index = context.tagName + '/' + context.attrName;
			if (!tags[context.tagName] && (!tags[context.tagName].attributes || !tags[context.tagName].alias))
				return false;
			if (!(attributes[context.attrName] || attributes[index]))
				return false;

			if (attributes[index] && attributes[index].attribOptions) {
				attributes[index].attribOptions.forEach(function (arg) {
					if (arg.indexOf(context.query) === 0 && context.exclusionList.indexOf(arg) === -1) {
						hints.push(arg);
					}
				});
			}
			if (attributes[context.attrName] && (attributes[context.attrName].attribOptions || attributes[context.attrName].alias)) {
				attrs = attributes[context.attrName].attribOptions || attributes[attributes[context.attrName].alias].attribOptions;
				attrs.forEach(function (arg) {
					if (arg.indexOf(context.query) === 0 && context.exclusionList.indexOf(arg) === -1) {
						hints.push(arg);
					}
				});
			}
			hints.sort();
		}
		return {
			hints: hints,
			match: context.query,
			selectInitial: true,
			handleWideResults: false
		};
	};

	SVGCodeHints.prototype.insertHint = function (hint) { // Insert tags.
		var context = XMLUtils.getXMLTagInfo(this.editor, this.initialPos, this.currentPos);

		if (context.tokenType === XMLUtils._tTAG) {
			if (!!context.query) {
				hint = hint.substr(context.query.length);
				this.editor.document.replaceRange(hint, this.currentPos);
			} else {
				this.editor.document.replaceRange(hint, this.initialPos, this.currentPos);
			}
			return false;
		}
		else if (context.tokenType === XMLUtils._tATTR) {
			hint = hint + '=""';

			if (!!context.query) {
				hint = hint.substr(context.query.length);
				this.editor.document.replaceRange(hint, this.currentPos);
			} else if (!!context.tagName && !context.attrName && !context.query) {
				this.editor.document.replaceRange(hint, this.currentPos);
			} else {
				this.editor.document.replaceRange(hint, this.initialPos, this.currentPos);
				this.editor.setCursorPos(this.initialPos.line, this.initialPos.ch + hint.length - 1);
				return true;
			}
			this.editor.setCursorPos(this.initialPos.line, this.currentPos.ch + hint.length - 1);
			return true;
		}
		else if (context.tokenType === XMLUtils._tVALUE) {
			if (!!context.query) {
				hint = hint.substr(context.query.length);
				this.editor.document.replaceRange(hint, this.currentPos);
			} else {
				this.editor.document.replaceRange(hint, this.initialPos, this.currentPos);
				this.editor.setCursorPos(this.currentPos.line, this.currentPos.ch + hint.length + 1);
			}
			return false;
		}
	};

	AppInit.appReady(function () {
		tags = JSON.parse(SVGTags);
		attributes = JSON.parse(SVGAttributes);

		var tagHints = new SVGCodeHints();
		CodeHintManager.registerHintProvider(tagHints, ['svg'], 0);
	});
});