
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
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
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
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
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
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
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
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

    /* src/svelte/client_app/App.svelte generated by Svelte v3.46.2 */

    const { Object: Object_1, console: console_1 } = globals;
    const file = "src/svelte/client_app/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[29] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[29] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[29] = list[i];
    	return child_ctx;
    }

    // (216:24) {#if uf.status == PENDING}
    function create_if_block_1(ctx) {
    	let div6;
    	let div0;
    	let i;
    	let t0;
    	let div4;
    	let p;
    	let t1_value = /*uf*/ ctx[29].file_name + "";
    	let t1;
    	let t2;
    	let div3;
    	let div2;
    	let div1;
    	let t3;
    	let div5;
    	let span;
    	let t4_value = /*uf*/ ctx[29].progress + "";
    	let t4;
    	let t5;
    	let t6;

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div0 = element("div");
    			i = element("i");
    			t0 = space();
    			div4 = element("div");
    			p = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			t3 = space();
    			div5 = element("div");
    			span = element("span");
    			t4 = text(t4_value);
    			t5 = text("%");
    			t6 = space();
    			attr_dev(i, "class", "fa fa-file");
    			attr_dev(i, "aria-hidden", "true");
    			add_location(i, file, 218, 32, 6894);
    			attr_dev(div0, "class", "card__icon svelte-10ukmcd");
    			add_location(div0, file, 217, 28, 6837);
    			attr_dev(p, "class", "title svelte-10ukmcd");
    			add_location(p, file, 221, 32, 7063);
    			attr_dev(div1, "class", "progress svelte-10ukmcd");
    			set_style(div1, "width", /*uf*/ ctx[29].progress + "%");
    			add_location(div1, file, 225, 40, 7264);
    			attr_dev(div2, "class", "progress-bar svelte-10ukmcd");
    			add_location(div2, file, 224, 36, 7197);
    			attr_dev(div3, "class", "progress-area svelte-10ukmcd");
    			add_location(div3, file, 223, 32, 7133);
    			attr_dev(div4, "class", "card__content svelte-10ukmcd");
    			add_location(div4, file, 220, 28, 7003);
    			attr_dev(span, "class", "percent");
    			add_location(span, file, 230, 32, 7528);
    			attr_dev(div5, "class", "card__status svelte-10ukmcd");
    			add_location(div5, file, 229, 28, 7469);
    			attr_dev(div6, "class", "card svelte-10ukmcd");
    			add_location(div6, file, 216, 24, 6790);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div0);
    			append_dev(div0, i);
    			append_dev(div6, t0);
    			append_dev(div6, div4);
    			append_dev(div4, p);
    			append_dev(p, t1);
    			append_dev(div4, t2);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div6, t3);
    			append_dev(div6, div5);
    			append_dev(div5, span);
    			append_dev(span, t4);
    			append_dev(span, t5);
    			append_dev(div6, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*toUpload*/ 16 && t1_value !== (t1_value = /*uf*/ ctx[29].file_name + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*toUpload*/ 16) {
    				set_style(div1, "width", /*uf*/ ctx[29].progress + "%");
    			}

    			if (dirty[0] & /*toUpload*/ 16 && t4_value !== (t4_value = /*uf*/ ctx[29].progress + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(216:24) {#if uf.status == PENDING}",
    		ctx
    	});

    	return block;
    }

    // (215:20) {#each toUpload as uf }
    function create_each_block_2(ctx) {
    	let if_block_anchor;
    	let if_block = /*uf*/ ctx[29].status == PENDING && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*uf*/ ctx[29].status == PENDING) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(215:20) {#each toUpload as uf }",
    		ctx
    	});

    	return block;
    }

    // (252:16) {#if toUpload.length > 0 }
    function create_if_block(ctx) {
    	let hr;

    	const block = {
    		c: function create() {
    			hr = element("hr");
    			add_location(hr, file, 252, 20, 8451);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, hr, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(hr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(252:16) {#if toUpload.length > 0 }",
    		ctx
    	});

    	return block;
    }

    // (258:20) {#each upLoaded as uf }
    function create_each_block_1(ctx) {
    	let div4;
    	let div0;
    	let i0;
    	let t0;
    	let div2;
    	let p;
    	let t1_value = /*uf*/ ctx[29].file_name + "";
    	let t1;
    	let t2;
    	let div1;
    	let span;
    	let t3_value = /*uf*/ ctx[29].size + "";
    	let t3;
    	let t4;
    	let div3;
    	let i1;
    	let t5;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			i0 = element("i");
    			t0 = space();
    			div2 = element("div");
    			p = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			div1 = element("div");
    			span = element("span");
    			t3 = text(t3_value);
    			t4 = space();
    			div3 = element("div");
    			i1 = element("i");
    			t5 = space();
    			attr_dev(i0, "class", "fa fa-file");
    			attr_dev(i0, "aria-hidden", "true");
    			add_location(i0, file, 260, 32, 8716);
    			attr_dev(div0, "class", "card__icon svelte-10ukmcd");
    			add_location(div0, file, 259, 28, 8659);
    			attr_dev(p, "class", "title svelte-10ukmcd");
    			add_location(p, file, 263, 32, 8885);
    			attr_dev(span, "class", "size");
    			add_location(span, file, 265, 36, 9008);
    			attr_dev(div1, "class", "meta");
    			add_location(div1, file, 264, 32, 8953);
    			attr_dev(div2, "class", "card__content svelte-10ukmcd");
    			add_location(div2, file, 262, 28, 8825);
    			attr_dev(i1, "class", "fa fa-check");
    			attr_dev(i1, "aria-hidden", "true");
    			add_location(i1, file, 269, 32, 9218);
    			attr_dev(div3, "class", "card__status text-success svelte-10ukmcd");
    			add_location(div3, file, 268, 28, 9146);
    			attr_dev(div4, "class", "card svelte-10ukmcd");
    			add_location(div4, file, 258, 24, 8612);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, i0);
    			append_dev(div4, t0);
    			append_dev(div4, div2);
    			append_dev(div2, p);
    			append_dev(p, t1);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, span);
    			append_dev(span, t3);
    			append_dev(div4, t4);
    			append_dev(div4, div3);
    			append_dev(div3, i1);
    			append_dev(div4, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*upLoaded*/ 32 && t1_value !== (t1_value = /*uf*/ ctx[29].file_name + "")) set_data_dev(t1, t1_value);
    			if (dirty[0] & /*upLoaded*/ 32 && t3_value !== (t3_value = /*uf*/ ctx[29].size + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(258:20) {#each upLoaded as uf }",
    		ctx
    	});

    	return block;
    }

    // (296:17) {#each sharedFiles as uf }
    function create_each_block(ctx) {
    	let div4;
    	let div0;
    	let i0;
    	let t0;
    	let div2;
    	let p;
    	let t1_value = /*uf*/ ctx[29].name + "";
    	let t1;
    	let t2;
    	let div1;
    	let span;
    	let t3_value = /*uf*/ ctx[29].size_formated + "";
    	let t3;
    	let t4;
    	let div3;
    	let i1;
    	let t5;
    	let mounted;
    	let dispose;

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[19](/*uf*/ ctx[29]);
    	}

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			i0 = element("i");
    			t0 = space();
    			div2 = element("div");
    			p = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			div1 = element("div");
    			span = element("span");
    			t3 = text(t3_value);
    			t4 = space();
    			div3 = element("div");
    			i1 = element("i");
    			t5 = space();
    			attr_dev(i0, "class", "fa fa-file");
    			attr_dev(i0, "aria-hidden", "true");
    			add_location(i0, file, 298, 28, 10574);
    			attr_dev(div0, "class", "card__icon svelte-10ukmcd");
    			add_location(div0, file, 297, 24, 10521);
    			attr_dev(p, "class", "title svelte-10ukmcd");
    			add_location(p, file, 301, 28, 10731);
    			attr_dev(span, "class", "size");
    			add_location(span, file, 303, 32, 10841);
    			attr_dev(div1, "class", "meta");
    			add_location(div1, file, 302, 28, 10790);
    			attr_dev(div2, "class", "card__content svelte-10ukmcd");
    			add_location(div2, file, 300, 24, 10675);
    			attr_dev(i1, "class", "fa fa-download");
    			attr_dev(i1, "aria-hidden", "true");
    			add_location(i1, file, 307, 28, 11086);
    			attr_dev(div3, "class", "card__status c__pointer svelte-10ukmcd");
    			add_location(div3, file, 306, 24, 10976);
    			attr_dev(div4, "class", "card svelte-10ukmcd");
    			add_location(div4, file, 296, 20, 10478);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, i0);
    			append_dev(div4, t0);
    			append_dev(div4, div2);
    			append_dev(div2, p);
    			append_dev(p, t1);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, span);
    			append_dev(span, t3);
    			append_dev(div4, t4);
    			append_dev(div4, div3);
    			append_dev(div3, i1);
    			append_dev(div4, t5);

    			if (!mounted) {
    				dispose = listen_dev(div3, "click", click_handler_3, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*sharedFiles*/ 8 && t1_value !== (t1_value = /*uf*/ ctx[29].name + "")) set_data_dev(t1, t1_value);
    			if (dirty[0] & /*sharedFiles*/ 8 && t3_value !== (t3_value = /*uf*/ ctx[29].size_formated + "")) set_data_dev(t3, t3_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(296:17) {#each sharedFiles as uf }",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div15;
    	let div10;
    	let div5;
    	let h20;
    	let t1;
    	let div4;
    	let div2;
    	let div0;
    	let t2;
    	let form;
    	let div1;
    	let i0;
    	let t3;
    	let p;
    	let t4;
    	let br0;
    	let t5;
    	let br1;
    	let t6;
    	let t7;
    	let input;
    	let t8;
    	let div3;
    	let button0;
    	let t9;
    	let i1;
    	let t10;
    	let section0;
    	let t11;
    	let t12;
    	let section1;
    	let div5_class_value;
    	let t13;
    	let div7;
    	let h21;
    	let t14;
    	let span;
    	let i2;
    	let t15;
    	let div6;
    	let div7_class_value;
    	let t16;
    	let div9;
    	let h22;
    	let t18;
    	let div8;
    	let textarea;
    	let t19;
    	let button1;
    	let div9_class_value;
    	let t21;
    	let div14;
    	let div11;
    	let i3;
    	let t22;
    	let div12;
    	let i4;
    	let t23;
    	let div13;
    	let i5;
    	let mounted;
    	let dispose;
    	let each_value_2 = /*toUpload*/ ctx[4];
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let if_block = /*toUpload*/ ctx[4].length > 0 && create_if_block(ctx);
    	let each_value_1 = /*upLoaded*/ ctx[5];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*sharedFiles*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div15 = element("div");
    			div10 = element("div");
    			div5 = element("div");
    			h20 = element("h2");
    			h20.textContent = "Upload Area";
    			t1 = space();
    			div4 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t2 = space();
    			form = element("form");
    			div1 = element("div");
    			i0 = element("i");
    			t3 = space();
    			p = element("p");
    			t4 = text("Drag & Drop to uplaod files ");
    			br0 = element("br");
    			t5 = text("\n                                OR ");
    			br1 = element("br");
    			t6 = text("\n                                Clik to Browse files");
    			t7 = space();
    			input = element("input");
    			t8 = space();
    			div3 = element("div");
    			button0 = element("button");
    			t9 = text("Upload  \n                            ");
    			i1 = element("i");
    			t10 = space();
    			section0 = element("section");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t11 = space();
    			if (if_block) if_block.c();
    			t12 = space();
    			section1 = element("section");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t13 = space();
    			div7 = element("div");
    			h21 = element("h2");
    			t14 = text("Download Area ");
    			span = element("span");
    			i2 = element("i");
    			t15 = space();
    			div6 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t16 = space();
    			div9 = element("div");
    			h22 = element("h2");
    			h22.textContent = "Clipboard";
    			t18 = space();
    			div8 = element("div");
    			textarea = element("textarea");
    			t19 = space();
    			button1 = element("button");
    			button1.textContent = "clear clipboard";
    			t21 = space();
    			div14 = element("div");
    			div11 = element("div");
    			i3 = element("i");
    			t22 = space();
    			div12 = element("div");
    			i4 = element("i");
    			t23 = space();
    			div13 = element("div");
    			i5 = element("i");
    			attr_dev(h20, "class", "area_title svelte-10ukmcd");
    			add_location(h20, file, 174, 12, 4749);
    			attr_dev(div0, "class", "form-upload__overlay svelte-10ukmcd");
    			add_location(div0, file, 178, 20, 4948);
    			attr_dev(i0, "class", "fa fa-cloud-upload svelte-10ukmcd");
    			attr_dev(i0, "aria-hidden", "true");
    			add_location(i0, file, 187, 28, 5516);
    			add_location(br0, file, 189, 60, 5662);
    			add_location(br1, file, 190, 35, 5702);
    			add_location(p, file, 188, 28, 5598);
    			attr_dev(input, "class", "default_input svelte-10ukmcd");
    			attr_dev(input, "type", "file");
    			attr_dev(input, "name", "selectedFiles");
    			attr_dev(input, "id", "selectedFiles");
    			input.multiple = true;
    			add_location(input, file, 193, 28, 5821);
    			attr_dev(div1, "class", "upload_area");
    			add_location(div1, file, 186, 24, 5462);
    			add_location(form, file, 185, 20, 5385);
    			attr_dev(div2, "class", "form-upload svelte-10ukmcd");
    			toggle_class(div2, "form-upload__active", /*dragOverActive*/ ctx[7]);
    			add_location(div2, file, 177, 16, 4857);
    			attr_dev(i1, "class", "fa fa-upload");
    			attr_dev(i1, "aria-hidden", "true");
    			add_location(i1, file, 208, 28, 6520);
    			attr_dev(button0, "class", "btn-upload svelte-10ukmcd");
    			button0.disabled = /*uploading*/ ctx[1];
    			toggle_class(button0, "disabled", /*uploading*/ ctx[1]);
    			add_location(button0, file, 205, 20, 6307);
    			attr_dev(div3, "class", "text-center svelte-10ukmcd");
    			add_location(div3, file, 204, 16, 6261);
    			attr_dev(section0, "class", "upload_buffer svelte-10ukmcd");
    			add_location(section0, file, 213, 16, 6639);
    			attr_dev(section1, "class", "uploaded_list svelte-10ukmcd");
    			add_location(section1, file, 255, 16, 8495);
    			attr_dev(div4, "class", "area_content svelte-10ukmcd");
    			add_location(div4, file, 176, 12, 4814);

    			attr_dev(div5, "class", div5_class_value = "macro_area macro_area__upload " + (/*selectedTab*/ ctx[6] == 'upload'
    			? 'show_area'
    			: 'hide_area') + " svelte-10ukmcd");

    			add_location(div5, file, 173, 8, 4639);
    			attr_dev(i2, "class", "fa fa-download");
    			attr_dev(i2, "aria-hidden", "true");
    			add_location(i2, file, 293, 95, 10313);
    			add_location(span, file, 293, 49, 10267);
    			attr_dev(h21, "class", "area_title svelte-10ukmcd");
    			add_location(h21, file, 293, 12, 10230);
    			attr_dev(div6, "class", "area_content svelte-10ukmcd");
    			add_location(div6, file, 294, 12, 10387);

    			attr_dev(div7, "class", div7_class_value = "macro_area macro_area__download " + (/*selectedTab*/ ctx[6] == 'download'
    			? 'show_area'
    			: 'hide_area') + " svelte-10ukmcd");

    			add_location(div7, file, 292, 8, 10116);
    			attr_dev(h22, "class", "area_title svelte-10ukmcd");
    			add_location(h22, file, 315, 12, 11378);
    			attr_dev(textarea, "name", "clip");
    			attr_dev(textarea, "rows", "10");
    			attr_dev(textarea, "class", "clipboard_input svelte-10ukmcd");
    			attr_dev(textarea, "placeholder", "Paste or Write your text here");
    			add_location(textarea, file, 317, 16, 11471);
    			attr_dev(button1, "class", "btn-clearclipboard svelte-10ukmcd");
    			add_location(button1, file, 318, 16, 11629);
    			attr_dev(div8, "class", "area_content svelte-10ukmcd");
    			add_location(div8, file, 316, 12, 11428);

    			attr_dev(div9, "class", div9_class_value = "macro_area macro_area__cplipboard " + (/*selectedTab*/ ctx[6] == 'clipboard'
    			? 'show_area'
    			: 'hide_area') + " svelte-10ukmcd");

    			add_location(div9, file, 314, 8, 11261);
    			attr_dev(div10, "class", "main_wrapper svelte-10ukmcd");
    			add_location(div10, file, 171, 4, 4603);
    			attr_dev(i3, "class", "fa fa-cloud-upload");
    			attr_dev(i3, "aria-hidden", "true");
    			add_location(i3, file, 325, 115, 11918);
    			attr_dev(div11, "class", "nav_item svelte-10ukmcd");
    			toggle_class(div11, "active", /*selectedTab*/ ctx[6] == 'upload');
    			add_location(div11, file, 325, 8, 11811);
    			attr_dev(i4, "class", "fa fa-cloud-download");
    			attr_dev(i4, "aria-hidden", "true");
    			add_location(i4, file, 326, 119, 12097);
    			attr_dev(div12, "class", "nav_item svelte-10ukmcd");
    			toggle_class(div12, "active", /*selectedTab*/ ctx[6] == 'download');
    			add_location(div12, file, 326, 8, 11986);
    			attr_dev(i5, "class", "fa fa-clipboard");
    			attr_dev(i5, "aria-hidden", "true");
    			add_location(i5, file, 327, 121, 12280);
    			attr_dev(div13, "class", "nav_item svelte-10ukmcd");
    			toggle_class(div13, "active", /*selectedTab*/ ctx[6] == 'clipboard');
    			add_location(div13, file, 327, 8, 12167);
    			attr_dev(div14, "class", "nav_bar svelte-10ukmcd");
    			add_location(div14, file, 324, 4, 11781);
    			attr_dev(div15, "class", "main_container svelte-10ukmcd");
    			add_location(div15, file, 168, 0, 4564);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div15, anchor);
    			append_dev(div15, div10);
    			append_dev(div10, div5);
    			append_dev(div5, h20);
    			append_dev(div5, t1);
    			append_dev(div5, div4);
    			append_dev(div4, div2);
    			append_dev(div2, div0);
    			append_dev(div2, t2);
    			append_dev(div2, form);
    			append_dev(form, div1);
    			append_dev(div1, i0);
    			append_dev(div1, t3);
    			append_dev(div1, p);
    			append_dev(p, t4);
    			append_dev(p, br0);
    			append_dev(p, t5);
    			append_dev(p, br1);
    			append_dev(p, t6);
    			append_dev(div1, t7);
    			append_dev(div1, input);
    			append_dev(div4, t8);
    			append_dev(div4, div3);
    			append_dev(div3, button0);
    			append_dev(button0, t9);
    			append_dev(button0, i1);
    			append_dev(div4, t10);
    			append_dev(div4, section0);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(section0, null);
    			}

    			append_dev(div4, t11);
    			if (if_block) if_block.m(div4, null);
    			append_dev(div4, t12);
    			append_dev(div4, section1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(section1, null);
    			}

    			append_dev(div10, t13);
    			append_dev(div10, div7);
    			append_dev(div7, h21);
    			append_dev(h21, t14);
    			append_dev(h21, span);
    			append_dev(span, i2);
    			append_dev(div7, t15);
    			append_dev(div7, div6);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div6, null);
    			}

    			append_dev(div10, t16);
    			append_dev(div10, div9);
    			append_dev(div9, h22);
    			append_dev(div9, t18);
    			append_dev(div9, div8);
    			append_dev(div8, textarea);
    			set_input_value(textarea, /*clipboard_data*/ ctx[2]);
    			append_dev(div8, t19);
    			append_dev(div8, button1);
    			append_dev(div15, t21);
    			append_dev(div15, div14);
    			append_dev(div14, div11);
    			append_dev(div11, i3);
    			append_dev(div14, t22);
    			append_dev(div14, div12);
    			append_dev(div12, i4);
    			append_dev(div14, t23);
    			append_dev(div14, div13);
    			append_dev(div13, i5);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*click_handler*/ ctx[12], false, false, false),
    					listen_dev(div0, "dragover", prevent_default(/*dragover_handler*/ ctx[13]), false, true, false),
    					listen_dev(div0, "dragleave", prevent_default(/*dragleave_handler*/ ctx[14]), false, true, false),
    					listen_dev(div0, "drop", prevent_default(/*drop_handler*/ ctx[15]), false, true, false),
    					listen_dev(input, "change", /*input_change_handler*/ ctx[16]),
    					listen_dev(form, "submit", submit_handler, false, false, false),
    					listen_dev(button0, "click", /*click_handler_1*/ ctx[17], false, false, false),
    					listen_dev(span, "click", /*click_handler_2*/ ctx[18], false, false, false),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[20]),
    					listen_dev(button1, "click", /*click_handler_4*/ ctx[21], false, false, false),
    					listen_dev(div11, "click", /*click_handler_5*/ ctx[22], false, false, false),
    					listen_dev(div12, "click", /*click_handler_6*/ ctx[23], false, false, false),
    					listen_dev(div13, "click", /*click_handler_7*/ ctx[24], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*dragOverActive*/ 128) {
    				toggle_class(div2, "form-upload__active", /*dragOverActive*/ ctx[7]);
    			}

    			if (dirty[0] & /*uploading*/ 2) {
    				prop_dev(button0, "disabled", /*uploading*/ ctx[1]);
    			}

    			if (dirty[0] & /*uploading*/ 2) {
    				toggle_class(button0, "disabled", /*uploading*/ ctx[1]);
    			}

    			if (dirty[0] & /*toUpload*/ 16) {
    				each_value_2 = /*toUpload*/ ctx[4];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(section0, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (/*toUpload*/ ctx[4].length > 0) {
    				if (if_block) ; else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div4, t12);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*upLoaded*/ 32) {
    				each_value_1 = /*upLoaded*/ ctx[5];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(section1, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*selectedTab*/ 64 && div5_class_value !== (div5_class_value = "macro_area macro_area__upload " + (/*selectedTab*/ ctx[6] == 'upload'
    			? 'show_area'
    			: 'hide_area') + " svelte-10ukmcd")) {
    				attr_dev(div5, "class", div5_class_value);
    			}

    			if (dirty[0] & /*sharedFiles*/ 8) {
    				each_value = /*sharedFiles*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div6, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*selectedTab*/ 64 && div7_class_value !== (div7_class_value = "macro_area macro_area__download " + (/*selectedTab*/ ctx[6] == 'download'
    			? 'show_area'
    			: 'hide_area') + " svelte-10ukmcd")) {
    				attr_dev(div7, "class", div7_class_value);
    			}

    			if (dirty[0] & /*clipboard_data*/ 4) {
    				set_input_value(textarea, /*clipboard_data*/ ctx[2]);
    			}

    			if (dirty[0] & /*selectedTab*/ 64 && div9_class_value !== (div9_class_value = "macro_area macro_area__cplipboard " + (/*selectedTab*/ ctx[6] == 'clipboard'
    			? 'show_area'
    			: 'hide_area') + " svelte-10ukmcd")) {
    				attr_dev(div9, "class", div9_class_value);
    			}

    			if (dirty[0] & /*selectedTab*/ 64) {
    				toggle_class(div11, "active", /*selectedTab*/ ctx[6] == 'upload');
    			}

    			if (dirty[0] & /*selectedTab*/ 64) {
    				toggle_class(div12, "active", /*selectedTab*/ ctx[6] == 'download');
    			}

    			if (dirty[0] & /*selectedTab*/ 64) {
    				toggle_class(div13, "active", /*selectedTab*/ ctx[6] == 'clipboard');
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div15);
    			destroy_each(each_blocks_2, detaching);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
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

    const action = "/upload";
    const shared_endpoint = "/shared_files";
    const shared_endpoint_download = "/shared_files_download";
    const enctype = "multipart/form-data";
    const PENDING = 2;
    const UPLOADED = 1;
    const FAILED = 3;

    function browseFiles(event) {
    	console.log(event);
    	document.getElementById('selectedFiles').click();
    }

    function downlaodFile(fileName) {
    	fetch(shared_endpoint_download + '/' + fileName, { method: 'GET' }).then(res => {
    		return res.blob();
    	}).then(b => {
    		// var file = window.URL.createObjectURL(blob);
    		// window.location.assign(file);
    		var a = document.createElement("a");

    		a.href = URL.createObjectURL(b);
    		a.setAttribute("download", fileName);
    		a.click();
    	}).catch(e => {
    		console.log(e);
    	});
    }

    const submit_handler = event => event.preventDefault();

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let msg = "";
    	let uploading = false;
    	let clipboard_data = '';
    	let sharedFiles = [];
    	let selectedFiles = [];

    	let toUpload = []; // {file_name: 'test3', status: PENDING, progress: 0, size: 0},
    	// {file_name: 'test4', status: PENDING}

    	let upLoaded = []; // {file_name: 'test1', status: UPLOADED},
    	// {file_name: 'test2', status: UPLOADED}

    	// let selectedTab = 'clipboard';
    	// let selectedTab = 'upload';
    	let selectedTab = 'download';

    	let dragOverActive = false;

    	onMount(() => {
    		getSharedFilesList();

    		setInterval(
    			() => {
    				getSharedFilesList();
    			},
    			2000
    		);
    	});

    	function setactiveTab(tabname) {
    		$$invalidate(6, selectedTab = tabname);
    	}

    	function updatedUploadList(selectedFiles) {
    		console.log(selectedFiles);
    		if (selectedFiles.length <= 0) return;

    		Object.keys(selectedFiles).forEach(key => {
    			$$invalidate(4, toUpload = [
    				...toUpload,
    				{
    					file_name: selectedFiles[key].name,
    					status: PENDING,
    					size: 0,
    					progress: 0
    				}
    			]);
    		});

    		console.log(toUpload);
    	}

    	function uploadSelectedFiles() {
    		console.log('clikced');

    		if (selectedFiles.length < 1) {
    			return;
    		}

    		$$invalidate(1, uploading = true);
    		let currentUpploadsCount = selectedFiles.length;

    		for (let i = 0; i < selectedFiles.length; i++) {
    			let formData = new FormData();
    			formData.append("selectedFile", selectedFiles[i]);
    			let xhr = new XMLHttpRequest();
    			xhr.open("POST", action);

    			xhr.upload.addEventListener("progress", function (e) {
    				// console.log('progress update....');
    				// console.log(e);
    				let loaded = parseInt(e.loaded * 100 / e.total);

    				$$invalidate(4, toUpload[i].progress = loaded, toUpload);

    				if (loaded >= 100) {
    					$$invalidate(4, toUpload[i].status = UPLOADED, toUpload);

    					$$invalidate(
    						4,
    						toUpload[i].size = e.total < 1024
    						? e.total + " KB"
    						: (e.total / (1024 * 1024)).toFixed(2) + " MB",
    						toUpload
    					);

    					$$invalidate(5, upLoaded = [...upLoaded, toUpload[i]]);
    					currentUpploadsCount--;

    					if (currentUpploadsCount == 0) {
    						$$invalidate(1, uploading = false);
    						clearInput();
    					}
    				}
    			}); // console.log(loaded);
    			// console.log(toUpload[i].progress);

    			xhr.send(formData);
    		}
    	}

    	function getSharedFilesList() {
    		fetch(shared_endpoint, { method: 'GET' }).then(res => {
    			return res.json();
    		}).then(res => {
    			console.log(res);

    			if (res.list && res.list.length > 0) {
    				$$invalidate(3, sharedFiles = res.list);
    			}
    		}).catch(e => {
    			console.log(e);
    		});
    	}

    	function downlaodAllFiles() {
    		sharedFiles.forEach(file => {
    			downlaodFile(file.name);
    		});
    	}

    	function clearInput() {
    		$$invalidate(4, toUpload = []);
    		$$invalidate(0, selectedFiles = []);
    		$$invalidate(7, dragOverActive = false);
    		console.log("clear input");
    	}

    	function addFilesToSelection(e) {
    		e.preventDefault();

    		// console.log(e);
    		// console.log(e.dataTransfer.files);
    		$$invalidate(0, selectedFiles = e.dataTransfer.files);
    	}

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = event => browseFiles(event);
    	const dragover_handler = e => $$invalidate(7, dragOverActive = true);
    	const dragleave_handler = e => $$invalidate(7, dragOverActive = false);
    	const drop_handler = e => addFilesToSelection(e);

    	function input_change_handler() {
    		selectedFiles = this.files;
    		$$invalidate(0, selectedFiles);
    	}

    	const click_handler_1 = () => uploadSelectedFiles();
    	const click_handler_2 = () => downlaodAllFiles();
    	const click_handler_3 = uf => downlaodFile(uf.name);

    	function textarea_input_handler() {
    		clipboard_data = this.value;
    		$$invalidate(2, clipboard_data);
    	}

    	const click_handler_4 = () => $$invalidate(2, clipboard_data = '');
    	const click_handler_5 = () => setactiveTab('upload');
    	const click_handler_6 = () => setactiveTab('download');
    	const click_handler_7 = () => setactiveTab('clipboard');

    	$$self.$capture_state = () => ({
    		onMount,
    		action,
    		shared_endpoint,
    		shared_endpoint_download,
    		enctype,
    		msg,
    		uploading,
    		clipboard_data,
    		sharedFiles,
    		PENDING,
    		UPLOADED,
    		FAILED,
    		selectedFiles,
    		toUpload,
    		upLoaded,
    		selectedTab,
    		dragOverActive,
    		setactiveTab,
    		browseFiles,
    		updatedUploadList,
    		uploadSelectedFiles,
    		getSharedFilesList,
    		downlaodAllFiles,
    		downlaodFile,
    		clearInput,
    		addFilesToSelection
    	});

    	$$self.$inject_state = $$props => {
    		if ('msg' in $$props) msg = $$props.msg;
    		if ('uploading' in $$props) $$invalidate(1, uploading = $$props.uploading);
    		if ('clipboard_data' in $$props) $$invalidate(2, clipboard_data = $$props.clipboard_data);
    		if ('sharedFiles' in $$props) $$invalidate(3, sharedFiles = $$props.sharedFiles);
    		if ('selectedFiles' in $$props) $$invalidate(0, selectedFiles = $$props.selectedFiles);
    		if ('toUpload' in $$props) $$invalidate(4, toUpload = $$props.toUpload);
    		if ('upLoaded' in $$props) $$invalidate(5, upLoaded = $$props.upLoaded);
    		if ('selectedTab' in $$props) $$invalidate(6, selectedTab = $$props.selectedTab);
    		if ('dragOverActive' in $$props) $$invalidate(7, dragOverActive = $$props.dragOverActive);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*selectedFiles*/ 1) {
    			updatedUploadList(selectedFiles);
    		}
    	};

    	return [
    		selectedFiles,
    		uploading,
    		clipboard_data,
    		sharedFiles,
    		toUpload,
    		upLoaded,
    		selectedTab,
    		dragOverActive,
    		setactiveTab,
    		uploadSelectedFiles,
    		downlaodAllFiles,
    		addFilesToSelection,
    		click_handler,
    		dragover_handler,
    		dragleave_handler,
    		drop_handler,
    		input_change_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		textarea_input_handler,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6,
    		click_handler_7
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1]);

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
