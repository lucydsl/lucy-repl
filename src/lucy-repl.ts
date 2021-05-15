import type {LanguageSupport} from '@codemirror/language';
import type {Extension} from '@codemirror/state';
import type {ReplMachine} from './repl.js';

import {EditorState, EditorView, basicSetup} from "@codemirror/basic-setup";
import {Compartment} from "@codemirror/state"
import {javascript} from "@codemirror/lang-javascript";
import {defaultTabBinding} from "@codemirror/commands";
import {keymap} from "@codemirror/view";
import {lucy} from '@lucy/codemirror-lang';
import {compileXstate} from '@lucy/liblucy';
import {interpret} from 'xstate';
import createMachine from './repl.js';

const language = new Compartment();
const tabSize = new Compartment();

const template = document.createElement('template');
template.innerHTML = /* html */ `
  <style>
    :host { display: block }

    .panel {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
  </style>
  <div class="panel">
    <div class="left">
      <slot name="lucy-codemirror"></slot>
    </div>
    <div class="right">
      <slot name="javascript-codemirror"></slot>
    </div>
  </div>
`;

function clone() {
  return document.importNode(template.content, true);
}

class LucyRepl {
  frag: DocumentFragment;
  tabSize: number;
  lucyCm: HTMLDivElement;
  jsCm: HTMLDivElement;
  lucyEditor: EditorView;
  jsEditor: EditorView;
  machine: ReplMachine;
  service: any;

  constructor(root: HTMLElement, tabSize: number) {
    this.frag = clone();

    /* State variables */
    this.tabSize = tabSize;

    /* DOM variables */
    this.lucyCm = document.createElement('div');
    this.lucyCm.slot = 'lucy-codemirror';
    root.append(this.lucyCm);

    this.jsCm = document.createElement('div');
    this.jsCm.slot = 'javascript-codemirror';
    root.append(this.jsCm);

    let updateListenerExtension = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const lucy = update.state.doc.toString();
        this.service.send({
          type: 'change',
          data: lucy
        });
      }
    });

    this.lucyEditor = this.createEditor(this.lucyCm, root.querySelector('[slot=lucy]'), lucy(), [updateListenerExtension]);
    this.jsEditor = this.createEditor(this.jsCm, null, javascript());

    this.machine = createMachine({
      actions: {
        setCompiledOutput: this.setCompiledOutput.bind(this)
      },
      services: {
        compile: this.compile
      }
    });
  }

  createEditor(rootEl: HTMLDivElement, inputEl: HTMLElement | null, lang: LanguageSupport, extensions: Extension[] = []) {
    const initialDoc = (inputEl && inputEl.textContent) || '';
    return new EditorView({
      state: EditorState.create({
        doc: initialDoc,
        extensions: [
          basicSetup,
          keymap.of([defaultTabBinding]),
          language.of(lang),
          tabSize.of(EditorState.tabSize.of(this.tabSize)),
          // TODO add some how oneDark,
          ...extensions
        ]
      }),
      parent: rootEl
    });
  }

  async compile(_: any, {data}: {data: string}) {
    return compileXstate(data, 'input.lucy');
  }

  setCompiledOutput({js: jsCode}: {js: string}) {
    const view = this.jsEditor;
    const { state } = view;
    const len = state.doc.length;
    view.dispatch({
      changes: {from: 0, to: len, insert: jsCode}
    });
  }
  
  connect() {
    this.service = interpret(this.machine).start();
  }

  disconnect() {
    this.service.stop();
  }

  update() {
    return this.frag;
  }
}


class LucyReplElement extends HTMLElement {
  #view: LucyRepl = new LucyRepl(this, this.tabSize);

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  connectedCallback() {
    this.shadowRoot!.append(this.#view.update());
    this.#view.connect();
  }

  get tabSize() {
    return Number(this.getAttribute('tab-size') || 2);
  }
}

customElements.define('lucy-repl', LucyReplElement);