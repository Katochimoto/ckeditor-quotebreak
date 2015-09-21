(function() {
    'use strict';

    var REG_EMPTY_HTML = /\S/;

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
                // TODO место для оптимизации
                // предка нужно найти только у последнего узла до выполнения cleanNode
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
            cursorRange.select();
            cursorRange.scrollIntoView();

            event.cancel();

            this.fire('saveSnapshot');
        }
    });

    /**
     * Возможны 2 ситуации:
     * - при разрыве blockquote с конца <blockquote>123^</blockquote>
     *   добавляет пустой тег blockquote после тега разрыва <blockquote>123</blockquote>^<br/><blockquote></blockquote>
     * - при разрыве blockquote не с конца <blockquote>12^<br/>3</blockquote>
     *   оставляет br в начале текста 2й части разрыва <blockquote>12</blockquote>^<br/><blockquote><br/>3</blockquote>
     *
     * Чтобы этого избежать, нужно удалить пустые теги и первый тег br.
     * Но теги, в которых не может быть вложенных, кроме br, должны остаться.
     * @param {HTMLElement} node
     */
    function cleanNode(node) {
        if (!node || node.nodeType !== 1) {
            return;
        }

        node.normalize();

        var len = node.childNodes.length;
        var i = 0;
        var child;
        var isFirst = true;
        var tagName;
        var isEmptyTag;

        for (; i < len; i++) {
            child = node.childNodes[ i ];

            if (child && child.nodeType === 1) {
                tagName = child.tagName.toLowerCase();
                isEmptyTag = CKEDITOR.dtd.$empty[ tagName ];

                if (isEmptyTag) {
                    if (isFirst && tagName === 'br') {
                        child.parentNode.removeChild(child);

                    } else if (!isFirst) {
                        break;
                    }

                    isFirst = false;

                } else if (!REG_EMPTY_HTML.test(child.innerHTML)) {
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
}());
