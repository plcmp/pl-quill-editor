import { html, css, PlElement } from "polylib";
import { debounce } from "@plcmp/utils";

import 'quill';

class PlQuillEditor extends PlElement {
    static properties = {
        value: { type: String, observer: '_valueObserver' }
    }
    fromEditor = false;

    static css = css`
        :host {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
        }
        #editor{
            display: block;
            width: 100%;
            height: 100%;
        }
    `;

    static template = html`
        <link href="quill/dist/quill.snow.css" rel="stylesheet">
        <div id="toolbar"></div>
        <div id="editor"></div>
    `;

    connectedCallback() {
        super.connectedCallback();
        let config = {
            theme: 'snow',
            bounds: this.$.editor
        };
        this._quill = new Quill(this.$.editor, config);

        const normalizeNative = (nativeRange) => {

            // document.getSelection model has properties startContainer and endContainer
            // shadow.getSelection model has baseNode and focusNode
            // Unify formats to always look like document.getSelection 

            if (nativeRange) {
                const range = nativeRange;
                if (range.baseNode) {
                    range.startContainer = nativeRange.baseNode.__blot ? nativeRange.baseNode : nativeRange.startContainer;
                    range.endContainer = nativeRange.focusNode.__blot ? nativeRange.focusNode : nativeRange.endContainer;
                    range.startOffset = nativeRange.baseNode.__blot ? nativeRange.baseOffset : nativeRange.startOffset;
                    range.endOffset = nativeRange.focusNode.__blot ? nativeRange.focusOffset : nativeRange.endOffset;

                    if (range.endOffset < range.startOffset) {
                        range.startContainer = nativeRange.focusNode;
                        range.endContainer = nativeRange.baseNode;
                        range.startOffset = nativeRange.focusOffset;
                        range.endOffset = nativeRange.baseOffset;
                    }
                }

                if (range.startContainer) {
                    return {
                        start: { node: range.startContainer, offset: range.startOffset },
                        end: { node: range.endContainer, offset: range.endOffset },
                        native: range
                    };
                }
            }

            return null
        };
        this._quill.selection.getNativeRange = () => {
            const dom = this._quill.root.getRootNode();
            const selection = dom.getRootNode().getSelection && dom.getRootNode().getSelection();
            const range = normalizeNative(selection);

            return range;
        };

        this._quill.clipboard.addMatcher(Node.ELEMENT_NODE, function (node, delta) {
            const plaintext = node.innerText
            const Delta = Quill.import('delta')
            return new Delta().insert(plaintext)
        });


        // Subscribe to selection change separately, 
        // because emitter in Quill doesn't catch this event in Shadow DOM

        document.addEventListener("selectionchange", (...args) => {
            // Update selection and some other properties
            this._quill.selection.update()
        });

        this._quill.on('text-change', debounce((delta, oldDelta, source) => {
            this.fromEditor = true;
            this.value = this._quill.root.getInnerHTML()
            this.fromEditor = false;
        }, 100));
    }

    _valueObserver(value) {
        if (this.fromEditor) return;
        this._quill.root.innerHTML = value || '';
        this.fromEditor = false;
    }
}

customElements.define('pl-quill-editor', PlQuillEditor);