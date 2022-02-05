
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.2' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/svelte/server_app/App.svelte generated by Svelte v3.46.2 */

    const { console: console_1 } = globals;
    const file = "src/svelte/server_app/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    // (162:4) {:else}
    function create_else_block(ctx) {
    	let div4;
    	let div3;
    	let div1;
    	let div0;
    	let t0;
    	let div2;
    	let h1;
    	let t2;
    	let p0;
    	let t3;
    	let br;
    	let t4;
    	let b0;
    	let t5;
    	let t6;
    	let t7;
    	let t8;
    	let p1;
    	let b1;
    	let t10;
    	let t11;
    	let div13;
    	let div12;
    	let div9;
    	let div6;
    	let h20;
    	let t12;
    	let span;
    	let i;
    	let t13;
    	let p2;
    	let t14;
    	let b2;
    	let t15;
    	let t16;
    	let div5;
    	let t17;
    	let div8;
    	let h21;
    	let t19;
    	let p3;
    	let t20;
    	let b3;
    	let t21;
    	let t22;
    	let t23;
    	let div7;
    	let t24;
    	let div11;
    	let div10;
    	let h22;
    	let t26;
    	let textarea;
    	let t27;
    	let button;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*uploadedFiles*/ ctx[4];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*sharedFiles*/ ctx[5];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Crossdrop server";
    			t2 = space();
    			p0 = element("p");
    			t3 = text("This server application is running.");
    			br = element("br");
    			t4 = text("\n                        You can scan the qrcode on the left side of this message or navigate ");
    			b0 = element("b");
    			t5 = text("http://");
    			t6 = text(/*current_address*/ ctx[0]);
    			t7 = text(" with your favorite browser.");
    			t8 = space();
    			p1 = element("p");
    			b1 = element("b");
    			b1.textContent = "Note:";
    			t10 = text(" the devices must be connected to the same local network/wifi.");
    			t11 = space();
    			div13 = element("div");
    			div12 = element("div");
    			div9 = element("div");
    			div6 = element("div");
    			h20 = element("h2");
    			t12 = text("Uploaded ");
    			span = element("span");
    			i = element("i");
    			t13 = space();
    			p2 = element("p");
    			t14 = text("Files that are currently present in the folder ");
    			b2 = element("b");
    			t15 = text(/*folderUploaded*/ ctx[6]);
    			t16 = space();
    			div5 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t17 = space();
    			div8 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Shared";
    			t19 = space();
    			p3 = element("p");
    			t20 = text("Files that are currently present in the folder ");
    			b3 = element("b");
    			t21 = text(/*folderShared*/ ctx[7]);
    			t22 = text("  and can be downloaded by the connected devices.");
    			t23 = space();
    			div7 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t24 = space();
    			div11 = element("div");
    			div10 = element("div");
    			h22 = element("h2");
    			h22.textContent = "Clipboard";
    			t26 = space();
    			textarea = element("textarea");
    			t27 = space();
    			button = element("button");
    			button.textContent = "clear clipboard";
    			attr_dev(div0, "id", "qrcode");
    			add_location(div0, file, 165, 20, 4421);
    			attr_dev(div1, "class", "qrcode_wrapper svelte-1j4yb96");
    			add_location(div1, file, 164, 16, 4372);
    			add_location(h1, file, 168, 20, 4530);
    			add_location(br, file, 170, 59, 4639);
    			add_location(b0, file, 171, 93, 4737);
    			add_location(p0, file, 169, 20, 4576);
    			add_location(b1, file, 174, 24, 4870);
    			add_location(p1, file, 173, 20, 4842);
    			attr_dev(div2, "class", "flex-expand svelte-1j4yb96");
    			add_location(div2, file, 167, 16, 4484);
    			attr_dev(div3, "class", "d-flex items-center svelte-1j4yb96");
    			add_location(div3, file, 163, 12, 4322);
    			attr_dev(div4, "class", "header svelte-1j4yb96");
    			add_location(div4, file, 162, 8, 4285);
    			attr_dev(i, "class", "fa fa-refresh");
    			attr_dev(i, "aria-hidden", "true");
    			add_location(i, file, 185, 100, 5343);
    			add_location(span, file, 185, 52, 5295);
    			attr_dev(h20, "class", "title svelte-1j4yb96");
    			add_location(h20, file, 185, 24, 5267);
    			add_location(b2, file, 186, 74, 5478);
    			add_location(p2, file, 186, 24, 5428);
    			add_location(div5, file, 188, 24, 5532);
    			attr_dev(div6, "class", "macro_area macro_area__uploaded svelte-1j4yb96");
    			add_location(div6, file, 184, 20, 5197);
    			attr_dev(h21, "class", "title svelte-1j4yb96");
    			add_location(h21, file, 207, 24, 6539);
    			add_location(b3, file, 208, 74, 6643);
    			add_location(p3, file, 208, 24, 6593);
    			add_location(div7, file, 209, 24, 6742);
    			attr_dev(div8, "class", "macro_area macro_area__available svelte-1j4yb96");
    			add_location(div8, file, 206, 20, 6468);
    			attr_dev(div9, "class", "side_sx svelte-1j4yb96");
    			add_location(div9, file, 183, 16, 5155);
    			attr_dev(h22, "class", "title svelte-1j4yb96");
    			add_location(h22, file, 232, 24, 7826);
    			attr_dev(textarea, "name", "clip");
    			attr_dev(textarea, "rows", "10");
    			attr_dev(textarea, "class", "clipboard_input svelte-1j4yb96");
    			attr_dev(textarea, "placeholder", "Paste or Write your text here");
    			add_location(textarea, file, 233, 24, 7883);
    			attr_dev(button, "class", "btn-clearclipboard svelte-1j4yb96");
    			add_location(button, file, 234, 24, 8049);
    			attr_dev(div10, "class", "macro_area macro_area__clipboard svelte-1j4yb96");
    			add_location(div10, file, 231, 20, 7755);
    			attr_dev(div11, "class", "side_dx svelte-1j4yb96");
    			add_location(div11, file, 230, 16, 7713);
    			attr_dev(div12, "class", "d-flex  svelte-1j4yb96");
    			set_style(div12, "flex-wrap", "wrap");
    			add_location(div12, file, 182, 12, 5092);
    			attr_dev(div13, "class", "content svelte-1j4yb96");
    			add_location(div13, file, 181, 8, 5058);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div1, div0);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, h1);
    			append_dev(div2, t2);
    			append_dev(div2, p0);
    			append_dev(p0, t3);
    			append_dev(p0, br);
    			append_dev(p0, t4);
    			append_dev(p0, b0);
    			append_dev(b0, t5);
    			append_dev(b0, t6);
    			append_dev(p0, t7);
    			append_dev(div2, t8);
    			append_dev(div2, p1);
    			append_dev(p1, b1);
    			append_dev(p1, t10);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, div13, anchor);
    			append_dev(div13, div12);
    			append_dev(div12, div9);
    			append_dev(div9, div6);
    			append_dev(div6, h20);
    			append_dev(h20, t12);
    			append_dev(h20, span);
    			append_dev(span, i);
    			append_dev(div6, t13);
    			append_dev(div6, p2);
    			append_dev(p2, t14);
    			append_dev(p2, b2);
    			append_dev(b2, t15);
    			append_dev(div6, t16);
    			append_dev(div6, div5);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div5, null);
    			}

    			append_dev(div9, t17);
    			append_dev(div9, div8);
    			append_dev(div8, h21);
    			append_dev(div8, t19);
    			append_dev(div8, p3);
    			append_dev(p3, t20);
    			append_dev(p3, b3);
    			append_dev(b3, t21);
    			append_dev(p3, t22);
    			append_dev(div8, t23);
    			append_dev(div8, div7);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div7, null);
    			}

    			append_dev(div12, t24);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div10, h22);
    			append_dev(div10, t26);
    			append_dev(div10, textarea);
    			set_input_value(textarea, /*clipboard_data*/ ctx[1]);
    			append_dev(div10, t27);
    			append_dev(div10, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(span, "click", /*click_handler_1*/ ctx[12], false, false, false),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[13]),
    					listen_dev(button, "click", /*click_handler_2*/ ctx[14], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*current_address*/ 1) set_data_dev(t6, /*current_address*/ ctx[0]);
    			if (dirty & /*folderUploaded*/ 64) set_data_dev(t15, /*folderUploaded*/ ctx[6]);

    			if (dirty & /*uploadedFiles*/ 16) {
    				each_value_1 = /*uploadedFiles*/ ctx[4];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div5, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*folderShared*/ 128) set_data_dev(t21, /*folderShared*/ ctx[7]);

    			if (dirty & /*sharedFiles*/ 32) {
    				each_value = /*sharedFiles*/ ctx[5];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div7, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*clipboard_data*/ 2) {
    				set_input_value(textarea, /*clipboard_data*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(div13);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(162:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (149:4) {#if !current_address }
    function create_if_block(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let t1;
    	let if_block = !/*refreshRequest*/ ctx[3] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text(/*log_msg*/ ctx[2]);
    			t1 = space();
    			if (if_block) if_block.c();
    			attr_dev(div0, "class", "log__msg svelte-1j4yb96");
    			add_location(div0, file, 150, 12, 3883);
    			attr_dev(div1, "class", "application_not_ready svelte-1j4yb96");
    			add_location(div1, file, 149, 8, 3835);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, t0);
    			append_dev(div1, t1);
    			if (if_block) if_block.m(div1, null);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*log_msg*/ 4) set_data_dev(t0, /*log_msg*/ ctx[2]);

    			if (!/*refreshRequest*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(149:4) {#if !current_address }",
    		ctx
    	});

    	return block;
    }

    // (190:28) {#each uploadedFiles as uf }
    function create_each_block_1(ctx) {
    	let div4;
    	let div0;
    	let i;
    	let t0;
    	let div1;
    	let p;
    	let t1_value = /*uf*/ ctx[20].name + "";
    	let t1;
    	let t2;
    	let div3;
    	let div2;
    	let span;
    	let t3_value = /*uf*/ ctx[20].size_formated + "";
    	let t3;
    	let t4;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			i = element("i");
    			t0 = space();
    			div1 = element("div");
    			p = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			div3 = element("div");
    			div2 = element("div");
    			span = element("span");
    			t3 = text(t3_value);
    			t4 = space();
    			attr_dev(i, "class", "fa fa-file");
    			attr_dev(i, "aria-hidden", "true");
    			add_location(i, file, 192, 40, 5747);
    			attr_dev(div0, "class", "card__icon svelte-1j4yb96");
    			add_location(div0, file, 191, 36, 5682);
    			attr_dev(p, "class", "title svelte-1j4yb96");
    			add_location(p, file, 195, 40, 5940);
    			attr_dev(div1, "class", "card__content svelte-1j4yb96");
    			add_location(div1, file, 194, 36, 5872);
    			attr_dev(span, "class", "size");
    			add_location(span, file, 199, 44, 6180);
    			attr_dev(div2, "class", "meta");
    			add_location(div2, file, 198, 40, 6117);
    			attr_dev(div3, "class", "card__status svelte-1j4yb96");
    			add_location(div3, file, 197, 36, 6050);
    			attr_dev(div4, "class", "card svelte-1j4yb96");
    			add_location(div4, file, 190, 32, 5627);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, i);
    			append_dev(div4, t0);
    			append_dev(div4, div1);
    			append_dev(div1, p);
    			append_dev(p, t1);
    			append_dev(div4, t2);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, span);
    			append_dev(span, t3);
    			append_dev(div4, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*uploadedFiles*/ 16 && t1_value !== (t1_value = /*uf*/ ctx[20].name + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*uploadedFiles*/ 16 && t3_value !== (t3_value = /*uf*/ ctx[20].size_formated + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(190:28) {#each uploadedFiles as uf }",
    		ctx
    	});

    	return block;
    }

    // (211:28) {#each sharedFiles as uf }
    function create_each_block(ctx) {
    	let div4;
    	let div0;
    	let i;
    	let t0;
    	let div1;
    	let p;
    	let t1_value = /*uf*/ ctx[20].name + "";
    	let t1;
    	let t2;
    	let div3;
    	let div2;
    	let span;
    	let t3_value = /*uf*/ ctx[20].size_formated + "";
    	let t3;
    	let t4;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			i = element("i");
    			t0 = space();
    			div1 = element("div");
    			p = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			div3 = element("div");
    			div2 = element("div");
    			span = element("span");
    			t3 = text(t3_value);
    			t4 = space();
    			attr_dev(i, "class", "fa fa-file");
    			attr_dev(i, "aria-hidden", "true");
    			add_location(i, file, 213, 40, 6955);
    			attr_dev(div0, "class", "card__icon svelte-1j4yb96");
    			add_location(div0, file, 212, 36, 6890);
    			attr_dev(p, "class", "title svelte-1j4yb96");
    			add_location(p, file, 216, 40, 7148);
    			attr_dev(div1, "class", "card__content svelte-1j4yb96");
    			add_location(div1, file, 215, 36, 7080);
    			attr_dev(span, "class", "size");
    			add_location(span, file, 220, 44, 7388);
    			attr_dev(div2, "class", "meta");
    			add_location(div2, file, 219, 40, 7325);
    			attr_dev(div3, "class", "card__status svelte-1j4yb96");
    			add_location(div3, file, 218, 36, 7258);
    			attr_dev(div4, "class", "card svelte-1j4yb96");
    			add_location(div4, file, 211, 32, 6835);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, i);
    			append_dev(div4, t0);
    			append_dev(div4, div1);
    			append_dev(div1, p);
    			append_dev(p, t1);
    			append_dev(div4, t2);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, span);
    			append_dev(span, t3);
    			append_dev(div4, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*sharedFiles*/ 32 && t1_value !== (t1_value = /*uf*/ ctx[20].name + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*sharedFiles*/ 32 && t3_value !== (t3_value = /*uf*/ ctx[20].size_formated + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(211:28) {#each sharedFiles as uf }",
    		ctx
    	});

    	return block;
    }

    // (154:12) {#if !refreshRequest }
    function create_if_block_1(ctx) {
    	let div;
    	let button;
    	let t;
    	let i;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			t = text("Refresh ");
    			i = element("i");
    			attr_dev(i, "class", "fa fa-refresh");
    			attr_dev(i, "aria-hidden", "true");
    			add_location(i, file, 156, 32, 4130);
    			attr_dev(button, "class", "btn-refresh svelte-1j4yb96");
    			add_location(button, file, 155, 20, 4029);
    			attr_dev(div, "class", "svelte-1j4yb96");
    			add_location(div, file, 154, 16, 4003);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(button, t);
    			append_dev(button, i);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[11], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(154:12) {#if !refreshRequest }",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;

    	function select_block_type(ctx, dirty) {
    		if (!/*current_address*/ ctx[0]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "main_containerr");
    			add_location(div, file, 146, 0, 3764);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let clipboard_data = '';
    	let current_address = false;
    	let log_msg = 'The application is beeing initialised, please wait...';
    	let refreshRequest = false;
    	let uploadedFiles = [];
    	let sharedFiles = [];
    	let folderUploaded = '__folder-name___';
    	let folderShared = '__folder-name___';
    	let force_update = false;
    	const main_proxy_proccess = window.main_proccess_proxy ? true : false;

    	onMount(() => {
    		getServerAddress();

    		// force folder rescan
    		setInterval(
    			() => {
    				if (current_address) updateSharedList();
    			},
    			5000
    		);
    	});

    	function getServerAddress() {
    		if (!main_proxy_proccess) {
    			$$invalidate(3, refreshRequest = false);
    			$$invalidate(2, log_msg = "Main process not detected, please restart the application");
    			return;
    		}

    		$$invalidate(3, refreshRequest = true);

    		window.main_proccess_proxy.getExpressServerAddress().then(res => {
    			$$invalidate(3, refreshRequest = false);
    			console.log(res);

    			if (res) {
    				$$invalidate(0, current_address = res);
    				$$invalidate(2, log_msg = "Application ready");
    				generateQRCode();
    			} else {
    				$$invalidate(2, log_msg = "Some error occured, please restart the application");
    			}
    		});
    	}

    	function updateLists(Addr, Force) {
    		if (!Addr && !Force) return;
    		$$invalidate(10, force_update = false); // reset force update
    		getFoldersPath();
    		updateUploadedList();
    		updateSharedList();
    	}

    	function updateUploadedList() {
    		if (!main_proxy_proccess) {
    			$$invalidate(2, log_msg = "Main process not detected, please restart the application");
    			return;
    		}

    		window.main_proccess_proxy.getExpressServerUploadedList().then(res => {
    			console.log(res);

    			if (res) {
    				$$invalidate(4, uploadedFiles = res);
    			}
    		}).catch(e => {
    			console.log(e);
    		});
    	}

    	function updateSharedList() {
    		if (!main_proxy_proccess) {
    			$$invalidate(2, log_msg = "Main process not detected, please restart the application");
    			return;
    		}

    		window.main_proccess_proxy.getExpressServerSharedList().then(res => {
    			console.log(res);

    			if (res) {
    				$$invalidate(5, sharedFiles = res);
    			}
    		}).catch(e => {
    			console.log(e);
    		});
    	}

    	function getFoldersPath() {
    		if (!main_proxy_proccess) {
    			$$invalidate(2, log_msg = "Main process not detected, please restart the application");
    			return;
    		}

    		window.main_proccess_proxy.getExpressServerFoldersPath().then(res => {
    			console.log(res);

    			if (res) {
    				$$invalidate(6, folderUploaded = res.forUploads);
    				$$invalidate(7, folderShared = res.forShared);
    			}
    		}).catch(e => {
    			console.log(e);
    		});
    	}

    	function generateQRCode() {
    		console.log('qr');

    		// from https://davidshimjs.github.io/qrcodejs/ 
    		// dom might be slow, wai a few milliseconds before updating...
    		const wait = setTimeout(
    			() => {
    				// new QRCode(document.getElementById("qrcode"), `http://${current_address}`);
    				new QRCode("qrcode",
    				{
    						text: `http://${current_address}`,
    						width: 128,
    						height: 128
    					});

    				clearTimeout(wait);
    			},
    			200
    		);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => getServerAddress();
    	const click_handler_1 = () => updateUploadedList();

    	function textarea_input_handler() {
    		clipboard_data = this.value;
    		$$invalidate(1, clipboard_data);
    	}

    	const click_handler_2 = () => $$invalidate(1, clipboard_data = '');

    	$$self.$capture_state = () => ({
    		onMount,
    		clipboard_data,
    		current_address,
    		log_msg,
    		refreshRequest,
    		uploadedFiles,
    		sharedFiles,
    		folderUploaded,
    		folderShared,
    		force_update,
    		main_proxy_proccess,
    		getServerAddress,
    		updateLists,
    		updateUploadedList,
    		updateSharedList,
    		getFoldersPath,
    		generateQRCode
    	});

    	$$self.$inject_state = $$props => {
    		if ('clipboard_data' in $$props) $$invalidate(1, clipboard_data = $$props.clipboard_data);
    		if ('current_address' in $$props) $$invalidate(0, current_address = $$props.current_address);
    		if ('log_msg' in $$props) $$invalidate(2, log_msg = $$props.log_msg);
    		if ('refreshRequest' in $$props) $$invalidate(3, refreshRequest = $$props.refreshRequest);
    		if ('uploadedFiles' in $$props) $$invalidate(4, uploadedFiles = $$props.uploadedFiles);
    		if ('sharedFiles' in $$props) $$invalidate(5, sharedFiles = $$props.sharedFiles);
    		if ('folderUploaded' in $$props) $$invalidate(6, folderUploaded = $$props.folderUploaded);
    		if ('folderShared' in $$props) $$invalidate(7, folderShared = $$props.folderShared);
    		if ('force_update' in $$props) $$invalidate(10, force_update = $$props.force_update);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*current_address, force_update*/ 1025) {
    			updateLists(current_address, force_update);
    		}
    	};

    	return [
    		current_address,
    		clipboard_data,
    		log_msg,
    		refreshRequest,
    		uploadedFiles,
    		sharedFiles,
    		folderUploaded,
    		folderShared,
    		getServerAddress,
    		updateUploadedList,
    		force_update,
    		click_handler,
    		click_handler_1,
    		textarea_input_handler,
    		click_handler_2
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target:  document.querySelector('body'),
    	props:{}
    });

    return app;

})();
//# sourceMappingURL=app.js.map
