/*
Copyright (c) 2014 Amin Ullah Khan
*/

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $ */

define(function (require, exports, module) {
	"use strict";

	// enums of tokens
	var _tTAG	= 1,
		_tATTR	= 2,
		_tVALUE	= 3;

	function getXMLTagInfo(editor, initialPos, currentPos) {
		var context = {
			tokenType: 0,
			tagName: '',
			attrName: '',
			query: '',
			exclusionList: [],
			shouldReplace: false
		};
		currentPos = currentPos || initialPos;
		var textBefore, textAfter, buffer, prevCursor, nextCursor, offset = [];
		prevCursor = { line: initialPos.line, ch: 0 };
		nextCursor = { line: initialPos.line, ch: editor._codeMirror.lineInfo(initialPos.line).text.length };
		textBefore = editor.document.getRange(prevCursor, currentPos).replace(/\s+/g, ' ').trimLeft();
		textAfter = editor.document.getRange(currentPos, nextCursor).replace(/\s+/g, ' ').trim();

		offset[0] = textBefore.lastIndexOf('<');
		offset[1] = textBefore.indexOf(' ', offset[0]);

		// Tags
		if (offset[0] > offset[1]) {
			context.tokenType = _tTAG;
			context.query = textBefore.substr(offset[0]+1);
			if (/^[a-z][a-z0-9\-]*$/i.test(context.query) || context.query.length === 0)
				return context;
			return false;
		}

		// Find opening tag.
		while (offset[0] === -1 && prevCursor.line !== -1) {
			prevCursor.line--;
			textBefore = editor.document.getRange(prevCursor, currentPos).replace(/\s+/g, ' ').trimLeft();
			offset[0] = textBefore.lastIndexOf('<');
		}
		if (offset[0] === -1 || !/^[a-z]$/.test(textBefore.charAt(offset[0]+1)))
			return false;

		// First space after the tag.
		offset[1] = textBefore.indexOf(' ', offset[0]);

		// Find closing tag.
		offset[2] = -1;
		while (offset[2] === -1 && nextCursor.line <= editor.lineCount() - 1) {
			nextCursor.ch = editor._codeMirror.lineInfo(nextCursor.line).text.length;
			textAfter = editor.document.getRange(currentPos, nextCursor).replace(/\s+/g, ' ').trim();

			if (textAfter.indexOf('<') !== -1 && textAfter.indexOf('/>') !== -1 && textAfter.indexOf('<') < textAfter.indexOf('/>')) {
				offset[2] = textAfter.indexOf('<');
				break;
			}
			if (textAfter.indexOf('/>') !== -1 && textAfter.indexOf('/>') > textAfter.indexOf('<')) {
				offset[2] = textAfter.indexOf('/>');
				break;
			}
			if (textAfter.indexOf('>') !== -1 && textAfter.indexOf('>') < textAfter.indexOf('<')) {
				offset[2] = textAfter.indexOf('>');
				break;
			}
			if (textAfter.indexOf('<') !== -1 && textBefore.substr(offset[0]).lastIndexOf('>') === -1 && textAfter.indexOf('>') > textAfter.indexOf('<')) {
				offset[2] = textAfter.indexOf('<');
				break;
			}
			nextCursor.line++;
		}

		if (textBefore.indexOf('>', offset[0]) !== -1)
			return false;

		if (textBefore.charAt(offset[0]) === '<' && textAfter.length === 0)
			offset[2] = 0;

		offset[3] = textBefore.lastIndexOf(' ');
		offset[4] = textBefore.lastIndexOf('="');
		offset[5] = textBefore.lastIndexOf('"');

		if (offset[2] === -1 && !(offset[4] !== -1 && offset[5] !== -1 && offset[4] > offset[3]))
			return false;

		// Attributes.
		if (offset[1] === offset[3] && offset[3] > offset[4] || offset[5]-offset[4] !== 1) {
			context.tokenType = _tATTR;
			context.tagName = textBefore.substr(offset[0]+1, offset[1]-1);
			context.query = textBefore.substr(offset[3]+1);
			context.shouldReplace = textAfter.charAt(0) === '=';
			buffer = textBefore.substr(offset[0]) +' '+ textAfter.substr(0, offset[2]);
			buffer.split(' ').slice(1).forEach(function(arg) {
				if (!arg || arg === context.query) return;
				context.exclusionList.push(arg.split('=')[0]);
			});
			if (/^[a-z][a-z0-9\-]*$/i.test(context.query) || context.query.length === 0) {
				return context;
			}
			return false;
		}

		if (offset[3] > offset[4]) {
			offset[3] = textBefore.lastIndexOf(' ', offset[4]);
		}
		offset[6] = textAfter.indexOf('"');

		// Attribute Values.
		if (offset[3] !== -1 && offset[4] > offset[3]) {
			context.tokenType = _tVALUE;
			buffer = textBefore.substr(offset[4]+2) + textAfter.substr(0, offset[6]);
			buffer.split(' ').forEach(function(arg) {
				if (!arg) return;
				context.exclusionList.push(arg);
			});
			context.tagName = textBefore.substr(offset[0]+1, offset[1]-1);
			context.attrName = textBefore.substr(offset[3]+1, offset[4]-offset[3]-1);
			context.query = textBefore.substr(offset[4]+2).split(' ').slice(-1)[0];
			return context;
		}
		return false;
	}

	// Public API
	exports.getXMLTagInfo	= getXMLTagInfo;
	exports._tTAG			= _tTAG;
	exports._tATTR			= _tATTR;
	exports._tVALUE			= _tVALUE;
});