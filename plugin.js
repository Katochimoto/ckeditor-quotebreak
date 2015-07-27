(function() {
    'use strict';

	var REG_EMPTY_HTML = /\S/;

    function cleanNode(node) {
        if (!node || node.nodeType != 1) {
			return;
		}

		node.normalize();

        var len = node.childNodes.length;
		var i = i = len - 1;
		var child;

        for (; i >= 0; i--) {
            child = node.childNodes[ i ];

            if (child && child.nodeType == 1) {
                if (!REG_EMPTY_HTML.test(child.innerHTML)) {
                    child.parentNode.removeChild(child);

                } else {
                    break;
                }
            }
        }

        if (!node.childNodes.length) {
            node.parentNode.removeChild(node);
        }
    }

    CKEDITOR.plugins.add('quotebreak', {
        modes: { 'wysiwyg': 1 },

        init: function(editor) {
            editor.on('key', this._onKey);
        },

        _onKey: function(event) {
            if (this.readOnly || this.mode !== 'wysiwyg' || event.data.keyCode !== 13) {
                return;
            }

            var selection = this.getSelection();
            var range = selection && selection.getRanges()[ 0 ];

            if (!range || !range.collapsed) {
                return;
            }

            var path = range.startPath();

            var breakParent = path.contains([ 'td', 'th', 'caption' ]);
            if (breakParent) {
                return;
            }

            var parent = path.contains([ 'blockquote' ]);
            if (!parent) {
                return;
            }

			this.fire('saveSnapshot');

			var block = path.block || path.blockLimit;
			var lastElement;
			var prevLastElement;

			while (block && !block.equals(path.root)) {
				lastElement = range.splitElement(block);
				prevLastElement = lastElement.getPrevious();
				cleanNode(lastElement.$);
				block = block.getParent();
			}

			// если вообще не было обхода, то lastElement нет
            if (!lastElement) {
                return;
            }

			var breakHtml = '<br/>';
            if (this.enterMode === CKEDITOR.ENTER_P) {
                breakHtml = '<p>&nbsp;</p>';
            } else if (this.enterMode === CKEDITOR.ENTER_DIV) {
                breakHtml = '<div><br/></div>';
            }

            var breakElement = CKEDITOR.dom.element.createFromHtml(breakHtml);

			// lastElement может быть удален при чистке, тогда ставим перенос
			// после предыдущего блока
			if (lastElement.getParent()) {
				breakElement.insertBefore(lastElement);
			} else {
				breakElement.insertAfter(prevLastElement);
			}

            var cursorRange = this.createRange();
            cursorRange.moveToPosition(breakElement, CKEDITOR.POSITION_BEFORE_END);

            selection.removeAllRanges();
            selection.selectRanges([ cursorRange ]);

            event.cancel();

			this.fire('saveSnapshot');
        }
    });

}());
