(function() {
    'use strict';

    function _cleanNode(node) {
        if (!node || node.nodeType != 1) return;

        var len = node.childNodes.length;

        for (var i = len - 1; i >= 0; i--) {
            var child = node.childNodes[i];

            if (child && child.nodeType == 1) {
                if (!/\S/.test(child.innerHTML)) {
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

            var lastElement;

            path.elements.filter(function(element) {
                return (element.$ !== path.root.$);
            }).forEach(function(element) {
                lastElement = range.splitElement(element);
            });

            if (!lastElement) {
                return;
            }

            var breakElement = CKEDITOR.dom.element.createFromHtml('<div><br/></div>');
            breakElement.insertBefore(lastElement);

            var cursorRange = this.createRange();
            cursorRange.moveToPosition(breakElement, CKEDITOR.POSITION_BEFORE_END);

            selection.removeAllRanges();
            selection.selectRanges([ cursorRange ]);

            event.cancel();
            console.log('>>', path);
        }
    });

}());
