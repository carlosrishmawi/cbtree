//
// Copyright (c) 2010-2013, Peter Jekel
// All rights reserved.
//
//	The Checkbox Tree (cbtree) is released under to following three licenses:
//
//	1 - BSD 2-Clause								(http://thejekels.com/cbtree/LICENSE)
//	2 - The "New" BSD License				(http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L13)
//	3 - The Academic Free License		(http://trac.dojotoolkit.org/browser/dojo/trunk/LICENSE#L43)
//
define(["module",
				"require",
				"dojo/_base/connect",
				"dojo/_base/declare",
				"dojo/_base/event",
				"dojo/_base/lang",
				"dojo/aspect",
				"dojo/Deferred",
				"dojo/dom-construct",
				"dojo/keys",
				"dojo/on",
				"dojo/topic",
				"dojo/text!./templates/cbtreeNode.html",
				"dijit/registry",
				"dijit/Tree",
				"./CheckBox",
				"./errors/createError!./errors/CBTErrors.json",
				"./util/shim/Array"						// ECMA-262 Array shim
			 ], function (module, require, connect, declare, event, lang, aspect, Deferred, domConstruct,
										 keys, on, topic, NodeTemplate,	registry, Tree, CheckBox,
										 createError) {

	// module:
	//		cbtree/Tree
	// note:
	//		This implementation is compatible with dojo 1.8 and 1.9

	var CBTError = createError( module.id );		// Create the CBTError type.
	var dojoVers = 0;
	
	var TreeNode = declare([Tree._TreeNode], {
		// templateString: String
		//		Specifies the HTML template to be used.
		templateString: NodeTemplate,

		// _checkBox: [private] widget
		//		Checkbox or custome widget instance.
		_checkBox: null,

		// _toggle: [private] Boolean
		//		Indicates if the checkbox widget supports the toggle function.
		_toggle: true,

		// _widget: [private] Object
		//		Specifies the widget to be instanciated for the tree node. The default
		//		is the cbtree CheckBox widget.
		_widget: null,

		constructor: function (args){
			// summary:
			//		If a custom widget is specified, it is used instead of the default
			//		cbtree checkbox. Any optional arguments are appended to the default
			//		widget argument list.

			var checkBoxWidget = { type: CheckBox, target: 'INPUT', mixin: null, postCreate: null };
			var widgetArgs		 = { multiState: null, checked: undefined, value: 'on' };
			var customWidget	 = args.widget;

			if (customWidget) {
				lang.mixin( widgetArgs, customWidget.args );
				lang.mixin(checkBoxWidget, customWidget);
			}
			checkBoxWidget.args = widgetArgs;

			// Test if the widget supports the toggle() method.
			this._toggle = (typeof checkBoxWidget.type.prototype.toggle == "function");
			this._widget = checkBoxWidget;
		},

		// =======================================================================
		// Node getters and setters
		
		_getCheckedAttr: function () {
			// summary:
			//		Get the current checkbox state. This method provides the hook for
			//		get("checked").
			// tags:
			//		private

			if (this._checkBox) {
				return this.tree.model.getChecked(this.item);
			}
		},

		_getEnabledAttr: function () {
			// summary:
			//		Get the current 'enabled' state of the item associated with this
			//		tree node. This method provides the hook for get("enabled").
			// tag:
			//		Private
			return this.tree.model.getEnabled(this.item);
		},

		_set_checked_Attr: function (newState) {
			// summary:
			//		Set a new state for the tree node checkbox. This method handles the
			//		internal '_checked_' events generated by the model in which case we
			//		only need to update the checkbox.
			//	newState:
			//		The checked state: 'mixed', true or false.
			// tags:
			//		private
			if (this._checkBox) {
				this._checkBox.set("checked", newState);
			}
		},

		_setCheckedAttr: function (/*String|Boolean*/ newState) {
			// summary:
			//		Set a new state for the tree node checkbox. This method implements
			//		the set("checked", newState). These requests are recieved from the
			//		API and therefore we need to inform the model.
			//	newState:
			//		The checked state: 'mixed', true or false.
			// tags:
			//		private

			if (this._checkBox) {
				return this.tree.model.setChecked(this.item, newState);
			}
		},

		_set_enabled_Attr: function (enabled) {
			// summary:
			//		Set the 'Read Only' property of the checkbox. This method handles
			//		the internal '_enabled_' event generated by the model after the
			//		store update.
			//	enabled:
			//		The new enabled state.
			// tags:
			//		private
			if (this._checkBox) {
				this._checkBox.set("readOnly", !enabled);
			}
		},

		_setEnabledAttr: function (/*Boolean*/ newState) {
			// summary:
			//		Set the new 'enabled' state of the item associated with this tree
			//		node. This method provides the hook for set("enabled", newState).
			// newState:
			//		Boolean, true or false.
			// tag:
			//		Private.
			return this.tree.model.setEnabled(this.item, newState);
		},

		// =======================================================================
		// Node private methods

		_createCheckBox: function (/*Boolean*/ multiState) {
			// summary:
			//		Create a checkbox on the TreeNode if a checkbox style is specified.
			// description:
			//		Create a checkbox on the tree node. A checkbox is only created if
			//		the data item has a valid 'checked' attribute OR the model has the
			//		'checkboxAll' attribute enabled.
			//
			// multiState:
			//			Indicate of multi state checkboxes are to be used (true/false).
			// tags:
			//		private

			var model	 = this.tree.model;
			var enabled = true;
			var checked = model.getChecked(this.item);
			var widget	= this._widget;
			var args		= widget.args;

			if (typeof model.getEnabled == "function") {
				enabled = model.getEnabled(this.item);
			}

			if (checked !== undefined) {
				// Initialize the default checkbox/widget attributes.
				args.multiState = multiState;
				args.checked		= checked;
				args.value			= this.label;

				if (typeof widget.mixin == "function") {
					lang.hitch(this, widget.mixin)(args);
				}

				this._checkBox = new widget.type( args );
				if (this._checkBox) {
					if (typeof this._widget.postCreate == "function") {
						lang.hitch(this._checkBox, this._widget.postCreate)(this);
					}
					domConstruct.place(this._checkBox.domNode, this.checkBoxNode, 'replace');
				}
			}
			if (this._checkBox) {
				if (this.isExpandable) {
					if (this.tree.branchReadOnly || !enabled) {
						this._checkBox.set("readOnly", true);
					}
				} else {
					if (this.tree.leafReadOnly || !enabled) {
						this._checkBox.set("readOnly", true);
					}
				}
			}
		},

		_remove: function () {
			// summary:
			//		Remove node and all its descendants.
			// tag:
			//		Private
			var parent = this.getParent();
			var tree   = this.tree;
			var model  = tree.model;
			
			function removeNode (node) {
				if (!node._destroyed) {
					var itemId = model.getIdentity(node.item);
					var nodes  = tree._itemNodesMap[itemId];
					// Remove item from the mapping table.
					if (nodes.length == 1) {
						delete tree._itemNodesMap[itemId];
					} else {
						var index = nodes.indexOf(node);
						if (index != -1) {
							nodes.splice(index,1);
						}
					}
					// Remove node from the list of selected items..
					tree.dndController.removeTreeNode(node);
					node.getChildren().forEach( removeNode );

					if (tree.persist && node.isExpanded) {
						tree._state(node, false);
					}
				}
			}
			removeNode(this);
			if (parent && this != tree.rootNode) {
				parent.removeChild(this);
			}
			// Destroy DOM node and its descendants
			this.destroyRecursive(); 
		},

		_toggleCheckBox: function (){
			// summary:
			//		Toggle the current checkbox checked attribute and update the model
			//		accordingly. Typically called when the spacebar is pressed.
			//		If a custom widget does not support toggle() we will just mimic it.
			// tags:
			//		private

			var newState, oldState;
			if (this._checkBox) {
				if (this._toggle) {
					newState = this._checkBox.toggle();
				} else {
					oldState = this._checkBox.get("checked");
					newState = (oldState == "mixed" ? true : !oldState);
				}
				this._checkBox.set("checked", newState );
			}
			return newState;
		},


		// =======================================================================
		// Node public methods

		destroy: function () {
			// summary:
			//		Destroy the checkbox of the tree node widget.
			//
			if (this._checkbox) {
				this._checkbox.destroyRecursive();
				delete this._checkbox;
			}
			this.inherited(arguments);
		},

		postCreate: function () {
			// summary:
			//		Handle the creation of the checkbox and node specific icons after
			//		the tree node has been instanciated.
			// description:
			//		Handle the creation of the checkbox after the tree node has been
			//		instanciated. If the item has a custom icon specified, overwrite
			//		the current icon.
			//
			var tree	= this.tree,
					itemIcon = null,
					nodeIcon;

			if (tree.checkBoxes === true) {
				this._createCheckBox(tree._multiState);
			}
			// If Tree styling is loaded and the model has its iconAttr set go see if
			// there is a custom icon amongst the item attributes.
			if (tree._hasStyling && tree._iconAttr) {
				var itemIcon = tree.get("icon", this.item);
				if (itemIcon) {
					this.set("_icon_",itemIcon);
				}
			}
			// Just in case one is available, set the tooltip.
			this.set("tooltip", this.title);
			this.inherited(arguments);
		}

	});	/* end declare() _TreeNode*/

	var CBTree = declare([Tree], {

		//==============================
		// Parameters to constructor

		// branchIcons: Boolean
		//		Determines if the FolderOpen/FolderClosed icon or their custom equivalent
		//		is displayed.
		branchIcons: true,

		// branchReadOnly: Boolean
		//		Determines if branch checkboxes are read only. If true, the user must
		//		check/uncheck every child checkbox individually.
		branchReadOnly: false,

		// checkBoxes: String
		//		If true it enables the creation of checkboxes, If a tree node actually
		//		gets a checkbox depends on the configuration of the model. If false no
		//		 checkboxes will be created regardless of the model configuration.
		checkBoxes: true,

		// clickEventCheckBox: Boolean
		//		If true, both the 'click' and 'checkBoxClick' events will be generated
		//		when a checkbox is clicked. If false only the 'checkBoxClick' event is
		//		generated.
		clickEventCheckBox: true,
		
		// deleteRecursive: Boolean
		//		Determines if a delete operation, initiated from the keyboard, should
		//		include all descendants of the selected item(s). If false, only the
		//		selected item(s) are deleted from the store. This property has only
		//		effect when 'enableDelete' is true.
		deleteRecursive: false,
		
		// enableDelete: Boolean
		//		Determines if deleting tree nodes using the keyboard is allowed. By
		//		default items can only be deleted using the store interface. If set
		//		to true the user can also delete tree items by selecting the desired
		//		tree node(s) and pressing the CTRL+DELETE keys.
		enableDelete: false,

		// leafIcons: Boolean
		//		Determines if the Leaf icon, or its custom equivalent, is displayed.
		leafIcons: true,

		// leafReadOnly: Boolean
		//		Determines if leaf checkboxes are read only. If true, the user can only
		//		check/uncheck branch checkboxes and thus overwriting the per store item
		//		'enabled' features for any store item associated with a tree leaf.
		leafReadOnly: false,

		// End Parameters to constructor
		//==============================

		// _multiState: [private] Boolean
		//		Determines if the checked state needs to be maintained as multi state or
		//		or as a dual state. ({"mixed",true,false} vs {true,false}). Its value is
		//		fetched from the tree model.
		_multiState: true,

		// _checkedAttr: [private] String
		//		Attribute name associated with the checkbox checked state of a data item.
		//		The value is retrieved from the models 'checkedAttr' property and added
		//		to the list of model events.
		_checkedAttr: "",

		// _customWidget: [private]
		//		A custom widget to be used instead of the cbtree CheckBox widget. Any
		//		custom widget MUST have a 'checked' property and provide support for
		//		both the get() and set() methods.
		_customWidget: null,

		// _eventAttrMap: [private] String[]
		//		List of additional events (attribute names) the onItemChange() method
		//		will act upon besides the _checkedAttr property value.	 Any internal
		//		events are pre- and suffixed with an underscore like '_styling_'
		_eventAttrMap: null,

		// _dojoRequired [private] Object
		//		Specifies the minimum and maximum dojo version required to run this
		//		implementation of the cbtree.
		//
		//			vers-required	::= '{' (min-version | max-version | min-version ',' max-version) '}'
		//			min-version		::= "min:" version
		//			max-version		::= "max:" version
		//			version				::= '{' "major" ':' number ',' "minor" ':' number '}'
		//
		_dojoRequired: { min: {major:1, minor:8}, max: {major:1, minor:9}},

		_assertVersion: function () {
			// summary:
			//		Test if we're running the correct dojo version.
			// tag:
			//		Private
			if (dojo.version) {
				var dojoMax = 999, dojoMin = 0;

				dojoVers = (dojo.version.major * 10) + dojo.version.minor;
				if (this._dojoRequired) {
					if (this._dojoRequired.min !== undefined) {
						dojoMin = (this._dojoRequired.min.major * 10) + this._dojoRequired.min.minor;
					}
					if (this._dojoRequired.max !== undefined) {
						dojoMax = (this._dojoRequired.max.major * 10) + this._dojoRequired.max.minor;
					}
					if (dojoVers < dojoMin || dojoVers > dojoMax) {
						throw new CBTError("InvalidVersion", "_assertVersion");
					}
				}
			} else {
				throw new CBTError("UnknownVersion", "_assertVersion");
			}
		},

		_createTreeNode: function (args) {
			// summary:
			//		Create a new cbtreeTreeNode instance.
			// description:
			//		Create a new cbtreeTreeNode instance.
			// tags:
			//		private

			args["widget"] = this._customWidget;		/* Mixin the custom widget */
			if (this._hasStyling && this._icon) {
				args["icon"] = this._icon;
			}
			return new TreeNode(args);
		},

		_onCheckBoxClick: function (/*Event*/ evt, /*treeNode*/ nodeWidget) {
			// summary:
			//		Translates checkbox click events into commands for the controller
			//		to process.
			// description:
			//		the _onCheckBoxClick function is called whenever a mouse 'click'
			//		on a checkbox is detected. Because the click was on the checkbox
			//		we are not dealing with any node expansion or collapsing here.
			// tags:
			//		private
			var newState = nodeWidget._checkBox.get("checked");
			var item     = nodeWidget.item;

			this.model.setChecked(item, newState);
			this.onCheckBoxClick(item, nodeWidget, evt);
			if (this.clickEventCheckBox) {
				this.onClick(item, nodeWidget, evt);
			}
			this.focusNode(nodeWidget);

			topic.publish("checkbox", { item: item, node: nodeWidget, state: newState, evt: evt});
			event.stop(evt);
		},

		_onItemChange: function (/*data.Item*/ item, /*String*/ attr, /*AnyType*/ value){
			// summary:
			//		Processes notification of a change to an data item's scalar values and
			//		internally generated events which effect the presentation of an item.
			// description:
			//		Processes notification of a change to a data item's scalar values like
			//		label or checkbox state.	In addition, it also handles internal events
			//		that effect the presentation of an item (see TreeStyling.js)
			//		The model, or internal, attribute name is mapped to a tree node property,
			//		only if a mapping is available is the event passed on to the appropriate
			//		tree node otherwise the event is considered of no impact to the tree
			//		presentation.
			// item:
			//		A valid data item
			// attr:
			//		Attribute/event name
			// value:
			//		New value of the item attribute
			// tags:
			//		private extension

			var nodeProp = this._eventAttrMap[attr];
			if (nodeProp) {
				var identity = this.model.getIdentity(item),
						nodes		= this._itemNodesMap[identity],
						request	= {};

				if (nodes){
					if (nodeProp.value) {
						if (typeof nodeProp.value == "function") {
							request[nodeProp.attribute] = lang.hitch(this, nodeProp.value)(item, nodeProp.attribute, value);
						} else {
							request[nodeProp.attribute] = nodeProp.value;
						}
					} else {
						request[nodeProp.attribute] = value;
					}
					// For each node update the item, in case a store hands out cloned
					// objects, and issue a set request.
					nodes.forEach(function (node){
							node.item = item;
							node.set(request);
						}, this);
				}
			}
		},

		_onItemDelete: function (item) {
			// summary:
			//		Processes notification of a deletion of an item.
			// item:
			//		The deleted item
			// tag:
			//		Private
			var	identity = this.model.getIdentity(item);
			var	nodes    = this._itemNodesMap[identity];

			if (nodes) {
				nodes = nodes.slice(0);
				nodes.forEach( function (node) {
					node._remove();
				});
			}
		},

		_onDeleteKey: function (/*message || evt, node*/) {
			// summary:
			//		Delete key pressed. Delete selected items if delete is enabled AND
			//		the model supports the deleteItem() method. 
			// evt:
			//		Keyboard event.
			// node:
			//		The tree node that has focus. (not used).
			// tag:
			//		Private
			var evt = arguments[0];
			if (dojoVers < 19) {
				evt = evt.evt;
			}
			if( connect.isCopyKey(evt)) {
				if (this.enableDelete && typeof this.model.deleteItem == "function") {
					var items = this.paths.map( function(path) {
						return path[path.length-1];
					});
					if (items.length) {
						this.model.deleteItem(items, this.deleteRecursive);
					}
				}
			}
		},

		_onEnterKey: function (message) {
			// summary:
			//		Dojo 1.8 only.
			// tags:
			//		private
			var node = message.node;
			var evt  = message.evt;				

			if (!evt.altKey && evt.keyCode == keys.SPACE) {
				this._onSpaceKey(evt,node);
			}
			this.inherited(arguments);
		},

		_onSpaceKey: function (evt, node) {
			// summary:
			//		Toggle the checkbox state when the user pressed the spacebar.
			//		The spacebar is only processed if the widget that has focus is
			//		a tree node and has a checkbox.
			// tags:
			//		private
			if (node && node._checkBox) {
				if (!evt.altKey && evt.keyCode == keys.SPACE) {
					node._toggleCheckBox();
					this._onCheckBoxClick(evt, node);
				}
			}
		},

		_onLabelChange: function (/*String*/ oldValue, /*String*/ newValue) {
			// summary:
			//		Handler called when the model changed its label attribute property.
			//		Map the new label attribute to "label"
			// tags:
			//		private

			// Remove with 2.0
			this.mapEventToAttr(oldValue, newValue, "label");
		},

		_onModelReset: function () {
			// summary:
			//		Handler called when a model reset event is received. A model reset
			//		is typically due to a store close/flush event.
			// tag:
			//		Private.
			
			var expanded = lang.clone(this._openedNodes);
			var model    = this.model;
			var tree     = this;
			// Wait until the tree is fully loaded. Canceling an ongoing tree load
			// will cause the dijit/Tree to throw all sorts of exceptions it doesn't
			// recover from, sad face :(  (trust me I've tried).
			this.onLoadDeferred.always( function () {
				if (tree.rootNode && !tree.rootNode._destroyed) {
					// Mimic an 'onDelete()' event from the model using the tree root item
					// which will clear out and reset the whole shebang....
					tree._onItemDelete(tree.rootNode.item);
				}
				// Next, wait until the model is ready again.
				model.ready().then( function () {
					tree.expandChildrenDeferred  = new Deferred();
					tree.pendingCommandsDeferred = tree.expandChildrenDeferred;

					if (tree.persist) {
						// restore the expanded paths, if any.
						tree._openedNodes = expanded;
					}
					tree._load();		// Reload the tree
				},
				function (err) {
					// Model failed to get ready, this is likely due to a fatal store
					// reload error (http errors are not fatal!)
					throw err;
				});
			});
		},

		_setWidgetAttr: function (/*String|Function|Object*/ widget) {
			// summary:
			//		Set the custom widget. This method is the hook for set("widget",widget).
			// description:
			//		Set the custom widget. A valid widget MUST have a 'checked' property
			//		AND methods get() and set() otherwise the widget is rejected and an
			//		error is thrown. If valid, the widget is used instead of the default
			//		cbtree checkbox.
			// widget:
			//		An String, object or function. In case of an object, the object can
			//		have the following properties:
			//			type			:	Function | String, the widget constructor or a module Id string
			//			args			:	Object, arguments passed to the constructor (optional)
			//			target		:	String, mouse click target nodename (optional)
			//			mixin		 :	Function, called prior to widget instantiation.
			//			postCreate: Function, called after widget instantiation
			// tag:
			//		experimental
			var customWidget = widget,
					property = "checked",
					message,
					proto;

			if (typeof widget == "string") {
				return this._setWidgetAttr({ type: widget });
			}

			if (lang.isObject(widget) && widget.hasOwnProperty("type")) {
				customWidget = widget.type;
				if (typeof customWidget == "function") {
					proto = customWidget.prototype;
					if (proto && typeof proto[property] !== "undefined"){
						// See if the widget has a getter and setter methods...
						if (typeof proto.get == "function" && typeof proto.set == "function") {
							this._customWidget = widget;
							return;
						} else {
							message = "Widget does not support get() and/or set()";
						}
					} else {
						message = "widget MUST have a 'checked' property";
					}
				}else{
					// Test for module id string to support declarative definition of tree
					if (typeof customWidget == "string" && ~customWidget.indexOf('/')) {
						var self = this;
							require([customWidget], function(newWidget) {
								widget.type = newWidget;
								self._setWidgetAttr( widget );
							});
							return;
					} else {
						message = "argument is not a valid module id";
					}
				}
			} else {
				message = "Object is missing required 'type' property";
			}
			throw new CBTError("InvalidWidget", "_setWidgetAttr", message);
		},

		create: function() {
			this._assertVersion();
			this.inherited(arguments);
		},

		destroy: function() {
			this.model = null;
			this.inherited(arguments);
		},

		getIconStyle:function (/*data.item*/ item, /*Boolean*/ opened) {
			// summary:
			//		Return the DOM style for the node Icon.
			// item:
			//		A valid data item
			// opened:
			//		Indicates if the tree node is expanded.
			// tags:
			//		extension
			var isExpandable = this.model.mayHaveChildren(item);
			var style = this.inherited(arguments) || {};

			if (isExpandable) {
				if (!this.branchIcons) {
					style["display"] = "none";
				}
			} else {
				if (!this.leafIcons) {
					style["display"] = "none";
				}
			}
			return style;
		},

		mixinEvent: function (/*data.Item*/ item, /*String*/ event, /*AnyType*/ value) {
			// summary:
			//		Mixin a user generated event into the tree event stream. This method
			//		allows users to inject events as if they came from the model.
			// item:
			//		A valid data item
			// event:
			//		Event/attribute name. An entry in the event mapping table must be present.
			//		(see mapEventToAttr())
			// value:
			//		Value to be assigned to the mapped _TreeNode attribute.
			// tag:
			//		public

			// TODO: remove with dojo 2.0
			if (this.model.isItem(item) && this._eventAttrMap[event]) {
				this._onItemChange(item, event, value);
				this.onEvent(item, event, value);
			}
		},

		onCheckBoxClick: function (/*data.item*/ item, /*treeNode*/ treeNode, /*Event*/ evt) {
			// summary:
			//		Callback when a checkbox on a tree node is clicked or when the tree
			//		node has focus and the spacebar is pressed.
			// tags:
			//		callback
		},

		onEvent: function (/*===== item, event, value =====*/) {
			// summary:
			//		Callback when an event was succesfully mixed in.
			// item:
			//		A valid data item
			// event:
			//		Event/attribute name.
			// value:
			//		Value assigned to the mapped _TreeNode attribute.
			// tags:
			//		callback
		},

		postMixInProperties: function(){
			this._eventAttrMap = {};		/* Create event mapping object */

			this.inherited(arguments);
		},

		postCreate: function () {
			// summary:
			//		Handle any specifics related to the tree and model after the
			//		instanciation of the Tree.
			// description:
			//		Whenever checkboxes are requested Validate if we have a model
			//		capable of updating item attributes.
			var model = this.model;
			var self  = this;

			if (this.model) {
				if (this.checkBoxes === true) {
					if (this._modelOk()) {
						this._multiState	= model.multiState;
						this._checkedAttr = model.checkedAttr;

						// Add item attributes and other attributes of interest to the mapping
						// table. Checkbox checked events from the model are mapped to the
						// internal '_checked_' event so a Tree node is able to distinguesh
						// between events coming from the model and those coming from the API
						// like set("checked",true)

						this.mapEventToAttr(null,(this._checkedAttr || "checked"), "_checked_");
						model.validateData();		// Remove with dojo 2.0
					} else {
						console.warn(model.id+"::postCreate(): model does not support getChecked() and/or setChecked().");
						this.checkBoxes = false;
					}
				}
				// Monitor any changes to the models label attribute and add the current
				// 'label' and 'enabled' attribute to the mapping table.

				aspect.after(model, "onLabelChange", lang.hitch(this, "_onLabelChange"), true);	// Remove with 2.0

				aspect.after(model, "onReset", lang.hitch(this, "_onModelReset"), true);

				this.mapEventToAttr(null, model.get("enabledAttr"), "_enabled_");
				this.mapEventToAttr(null, model.get("labelAttr"), "label");

				this.inherited(arguments);

				if (dojoVers < 19) {
					// dojo 1.8
					this.own( 
						// Register a dedicated checkbox click event listener.
						on(this.domNode, on.selector(".cbtreeCheckBox", "click"), function(evt){
							self._onCheckBoxClick(evt, registry.getEnclosingWidget(this.parentNode));
						})
					);
					// Add support for CTRL+DELETE
					this._onKeyDown( null, {} );
					this._keyHandlerMap[keys.DELETE] = "_onDeleteKey";
				} else {
					// dojo 1.9
					this.own( 
						on(this.containerNode, on.selector(".cbtreeCheckBox", "click"), function(evt){
							self._onCheckBoxClick(evt, registry.getEnclosingWidget(this.parentNode));
						})
					);
					this._keyNavCodes[keys.DELETE] = lang.hitch(this, "_onDeleteKey");
					this._keyNavCodes[keys.SPACE]  = lang.hitch(this, "_onSpaceKey");
				}

			}
			else // The CheckBox Tree requires a model.
			{
				throw new CBTError("PropertyMissing", "postCreate", "no model was specified");
			}
		},

		// =======================================================================
		// Misc helper functions/methods

		mapEventToAttr: function (/*String*/ oldAttr, /*String*/ attr, /*String*/ nodeAttr, /*anything?*/ value) {
			// summary:
			//		Add an event mapping to the mapping table.
			//description:
			//		Any event, triggered by the model or some other extension, can be
			//		mapped to a _TreeNode attribute resulting a 'set' request for the
			//		associated _TreeNode attribute.
			// oldAttr:
			//		Original attribute name. If present in the mapping table it is deleted
			//		and replace with 'attr'.
			// attr:
			//		Attribute/event name that needs mapping.
			// nodeAttr:
			//		Name of a _TreeNode attribute to which 'attr' is mapped.
			// value:
			//		If specified the value to be assigned to the _TreeNode attribute. If
			//		value is a function the function is called as:
			//
			//			function(item, nodeAttr, newValue)
			//
			//		and the result returned is assigned to the _TreeNode attribute.

			// TODO: remove with dojo 2.0

			if (typeof attr == "string" && typeof nodeAttr == "string") {
				if (attr.length && nodeAttr.length) {
					if (oldAttr) {
						delete this._eventAttrMap[oldAttr];
					}
					this._eventAttrMap[attr] = {attribute: nodeAttr, value: value};
				}
			}
		},

		_modelOk: function () {
			// summary:
			//		Test if the model has the minimum required feature set, that is,
			//		model.getChecked() and model.setChecked().
			// tags:
			//		private

			if ((this.model.getChecked && typeof this.model.getChecked == "function") &&
					(this.model.setChecked && typeof this.model.setChecked == "function")) {
				return true;
			}
			return false;
		}

	});	/* end declare() CBTree */

	CBTree._TreeNode = TreeNode;
	return CBTree;

});	/* end define() */
